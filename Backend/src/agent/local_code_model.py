"""Startup-managed local Qwen/PEFT model used only for code generation."""

import ast
import asyncio
import logging
import re
import threading
from collections.abc import Mapping
from pathlib import Path

logger = logging.getLogger(__name__)


class LocalCodeModel:
    def __init__(self, base_model: str, adapter_dir: str, max_new_tokens: int = 768,
                 device: str = "cpu", timeout_seconds: int = 180):
        self.base_model = base_model
        self.adapter_dir = Path(adapter_dir).expanduser().resolve()
        self.max_new_tokens = max_new_tokens
        self.device = device
        self.timeout_seconds = timeout_seconds
        self.tokenizer = None
        self.model = None
        self._generation_lock = threading.Lock()

    def load(self) -> None:
        """Load weights once. Missing files and dependency/weight errors fail startup."""
        if not (self.adapter_dir / "adapter_config.json").is_file() or not (self.adapter_dir / "adapter_model.safetensors").is_file():
            raise FileNotFoundError(f"LoRA adapter files are missing from {self.adapter_dir}")
        try:
            from peft import PeftModel
            from transformers import AutoModelForCausalLM, AutoTokenizer

            self.tokenizer = AutoTokenizer.from_pretrained(self.base_model)
            base = AutoModelForCausalLM.from_pretrained(self.base_model, torch_dtype="auto")
            self.model = PeftModel.from_pretrained(base, str(self.adapter_dir))
            if self.device == "auto":
                import torch
                target = "cuda" if torch.cuda.is_available() else "cpu"
            else:
                target = self.device
            self.model.to(target)
            self.model.eval()
        except Exception as exc:
            self.tokenizer = self.model = None
            raise RuntimeError(f"Failed to load local code model: {exc}") from exc

    @staticmethod
    def _sanitize_generated_text(text: str) -> str:
        cleaned = (text or "").strip()
        if not cleaned:
            return cleaned

        fence_match = re.search(r"```(?:python|py)?\s*(.*?)```", cleaned, flags=re.IGNORECASE | re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        else:
            cleaned = re.sub(r"^```(?:python|py)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```\s*$", "", cleaned, flags=re.DOTALL)

        cleaned = re.sub(r"^(?:here is|here's|sure|certainly|below is|the function is|the code is)\s*[:\-]?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()

        if not cleaned:
            raise ValueError("Local model returned empty code")

        return cleaned

    def _generate(self, question: str, context: str, review_comments: str, system_prompt: str) -> str:
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Local code model is not loaded")
        prompt = (f"User request:\n{question}\n\nResearch context:\n{context or 'None'}"
                  f"\n\nReview feedback to address:\n{review_comments or 'None'}")
        try:
            import torch

            messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
            inputs = self.tokenizer.apply_chat_template(
                messages, tokenize=True, add_generation_prompt=True, return_tensors="pt"
            )
            if isinstance(inputs, Mapping):
                input_ids = inputs["input_ids"]
            else:
                input_ids = inputs
            input_ids = input_ids.to(next(self.model.parameters()).device)
            with self._generation_lock, torch.inference_mode():
                output = self.model.generate(
                    input_ids=input_ids,
                    max_new_tokens=self.max_new_tokens,
                    do_sample=False,
                    pad_token_id=self.tokenizer.eos_token_id,
                )
            generated = output[0, input_ids.shape[-1]:]
            text = self._sanitize_generated_text(self.tokenizer.decode(generated, skip_special_tokens=True))
            try:
                ast.parse(text)
            except SyntaxError as exc:
                raise ValueError(f"Local model returned invalid Python: {exc}") from exc
            return text
        except (ValueError, RuntimeError):
            raise
        except Exception as exc:
            raise RuntimeError(f"Local code generation failed: {exc}") from exc

    async def generate(self, question: str, context: str, review_comments: str, system_prompt: str) -> str:
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self._generate, question, context, review_comments, system_prompt),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise TimeoutError(f"Local code generation exceeded {self.timeout_seconds} seconds") from exc


local_code_model: LocalCodeModel | None = None


def initialize_local_code_model(settings) -> LocalCodeModel:
    global local_code_model
    model = LocalCodeModel(
        settings.local_model_base, settings.local_model_adapter,
        settings.local_model_max_new_tokens, settings.local_model_device,
        settings.local_model_timeout,
    )
    model.load()
    local_code_model = model
    logger.info("Loaded local code model %s with adapter %s", settings.local_model_base, model.adapter_dir)
    return model


def get_local_code_model() -> LocalCodeModel:
    if local_code_model is None:
        raise RuntimeError("Local code model has not been initialized")
    return local_code_model
