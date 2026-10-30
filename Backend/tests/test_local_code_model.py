import asyncio
from collections import UserDict
from types import SimpleNamespace

import pytest

from src.agent.local_code_model import LocalCodeModel


def test_loads_base_and_adapter_once(tmp_path, monkeypatch):
    (tmp_path / "adapter_config.json").write_text("{}")
    (tmp_path / "adapter_model.safetensors").write_bytes(b"weights")
    calls = []
    fake_model = SimpleNamespace(to=lambda device: calls.append(("to", device)), eval=lambda: None)
    monkeypatch.setitem(__import__("sys").modules, "transformers", SimpleNamespace(
        AutoTokenizer=SimpleNamespace(from_pretrained=lambda name: calls.append(("tokenizer", name)) or object()),
        AutoModelForCausalLM=SimpleNamespace(from_pretrained=lambda name, **kwargs: calls.append(("base", name)) or object()),
    ))
    monkeypatch.setitem(__import__("sys").modules, "peft", SimpleNamespace(
        PeftModel=SimpleNamespace(from_pretrained=lambda base, path: calls.append(("adapter", path)) or fake_model)
    ))
    model = LocalCodeModel("Qwen/base", str(tmp_path))
    model.load()
    assert calls[0] == ("tokenizer", "Qwen/base")
    assert calls[1] == ("base", "Qwen/base")
    assert calls[2] == ("adapter", str(tmp_path))
    assert calls[3] == ("to", "cpu")


def test_missing_adapter_is_reported(tmp_path):
    with pytest.raises(FileNotFoundError, match="adapter files"):
        LocalCodeModel("base", str(tmp_path)).load()


def test_generation_uses_chat_template_and_validates_python(monkeypatch):
    import torch

    captured = {}
    class Tokenizer:
        eos_token_id = 0
        def apply_chat_template(self, messages, **kwargs):
            captured["messages"] = messages
            return torch.tensor([[1, 2]])
        def decode(self, tokens, **kwargs):
            return "print('hello')"
    class Model:
        def parameters(self):
            return iter([torch.nn.Parameter(torch.zeros(1))])
        def generate(self, **kwargs):
            return torch.tensor([[1, 2, 3]])
    local = LocalCodeModel("base", "adapter")
    local.tokenizer, local.model = Tokenizer(), Model()
    assert asyncio.run(local.generate("hello", "", "", "Python only")) == "print('hello')"
    assert captured["messages"][0]["content"] == "Python only"


def test_generation_extracts_input_ids_from_batch_encoding():
    import torch

    class BatchEncoding(UserDict):
        def to(self, device):
            self.data = {key: value.to(device) for key, value in self.data.items()}
            return self

    class Tokenizer:
        eos_token_id = 0
        def apply_chat_template(self, *args, **kwargs):
            return BatchEncoding({"input_ids": torch.tensor([[1, 2]])})
        def decode(self, tokens, **kwargs):
            return "print('hello')"

    class Model:
        def parameters(self):
            return iter([torch.nn.Parameter(torch.zeros(1))])
        def generate(self, **kwargs):
            assert isinstance(kwargs["input_ids"], torch.Tensor)
            return torch.tensor([[1, 2, 3]])

    local = LocalCodeModel("base", "adapter")
    local.tokenizer, local.model = Tokenizer(), Model()
    assert asyncio.run(local.generate("hello", "", "", "Python only")) == "print('hello')"


def test_invalid_python_raises():
    import torch
    class Tokenizer:
        eos_token_id = 0
        def apply_chat_template(self, *args, **kwargs): return torch.tensor([[1]])
        def decode(self, *args, **kwargs): return "def broken(:"
    class Model:
        def parameters(self): return iter([torch.nn.Parameter(torch.zeros(1))])
        def generate(self, **kwargs): return torch.tensor([[1, 2]])
    local = LocalCodeModel("base", "adapter")
    local.tokenizer, local.model = Tokenizer(), Model()
    with pytest.raises(ValueError, match="invalid Python"):
        asyncio.run(local.generate("x", "", "", "system"))


def test_generation_strips_markdown_fence_and_explanatory_text():
    import torch

    class Tokenizer:
        eos_token_id = 0
        def apply_chat_template(self, *args, **kwargs):
            return torch.tensor([[1, 2]])
        def decode(self, *args, **kwargs):
            return '''Here is the function:\n```python\ndef add(a, b):\n    return a + b\n```\nThis is ready.'''

    class Model:
        def parameters(self):
            return iter([torch.nn.Parameter(torch.zeros(1))])
        def generate(self, **kwargs):
            return torch.tensor([[1, 2, 3]])

    local = LocalCodeModel("base", "adapter")
    local.tokenizer, local.model = Tokenizer(), Model()

    assert asyncio.run(local.generate("x", "", "", "system")) == "def add(a, b):\n    return a + b"
