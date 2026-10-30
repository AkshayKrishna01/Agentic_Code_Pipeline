"""Application settings loaded from the environment (and src/.env for local use)."""

from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve the development env file relative to this module, not the process CWD.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
    db_port: int
    db_host: str
    db_name: str
    db_username: str
    db_password: str
    port: int
    host: str
    log_level: str
    model_id: str
    provider: str
    pylint_mcp_server_url: str
    db_name_checkpoint: str
    duckduckgo: str
    groq_api_key: str
    groq_model: str
    api_auth_token: str
    cors_origins: tuple[str, ...]
    pylint_workspace: str
    local_model_base: str
    local_model_adapter: str
    local_model_max_new_tokens: int
    local_model_device: str
    local_model_timeout: int

    def validate(self) -> None:
        required = {
            "DB_HOST": self.db_host,
            "DB_NAME": self.db_name,
            "DB_USERNAME": self.db_username,
            "DB_PASSWORD": self.db_password,
            "DB_NAME_CHECKPOINT": self.db_name_checkpoint,
            "GROQ_API_KEY": self.groq_api_key,
            "DUCK_DUCK_GO": self.duckduckgo,
            "PYLINT_MCP_SERVER_URL": self.pylint_mcp_server_url,
            "API_AUTH_TOKEN": self.api_auth_token,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError("Missing required environment variables: " + ", ".join(missing))
        if len(self.api_auth_token) < 32:
            raise ValueError("API_AUTH_TOKEN must contain at least 32 characters")
        if not 1 <= self.port <= 65535:
            raise ValueError("PORT must be between 1 and 65535")
        if not 1 <= self.db_port <= 65535:
            raise ValueError("DB_PORT must be between 1 and 65535")
        if self.log_level.upper() not in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}:
            raise ValueError("LOG_LEVEL must be CRITICAL, ERROR, WARNING, INFO, or DEBUG")
        if self.local_model_max_new_tokens < 1:
            raise ValueError("LOCAL_MODEL_MAX_NEW_TOKENS must be positive")
        if self.local_model_timeout < 1:
            raise ValueError("LOCAL_MODEL_TIMEOUT must be positive")
        if self.local_model_device not in {"cpu", "auto"}:
            raise ValueError("LOCAL_MODEL_DEVICE must be cpu or auto")


def get_setting() -> Settings:
    adapter_value = Path(os.getenv("LOCAL_MODEL_ADAPTER", "adapter")).expanduser()
    if not adapter_value.is_absolute():
        adapter_value = Path(__file__).resolve().parents[2] / adapter_value
    return Settings(
        db_port=int(os.getenv("DB_PORT", "5432")),
        db_host=os.getenv("DB_HOST", ""),
        db_name=os.getenv("DB_NAME", ""),
        db_username=os.getenv("DB_USERNAME", ""),
        db_password=os.getenv("DB_PASSWORD", ""),
        port=int(os.getenv("PORT", "8080")),
        host=os.getenv("HOST", "0.0.0.0"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        model_id=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        provider=os.getenv("PROVIDER", "groq"),
        pylint_mcp_server_url=os.getenv("PYLINT_MCP_SERVER_URL", ""),
        db_name_checkpoint=os.getenv("DB_NAME_CHECKPOINT", ""),
        duckduckgo=os.getenv("DUCK_DUCK_GO", ""),
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        groq_model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        api_auth_token=os.getenv("API_AUTH_TOKEN", ""),
        cors_origins=tuple(
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "").split(",")
            if origin.strip()
        ),
        pylint_workspace=os.getenv("PYLINT_WORKSPACE", "/tmp/code-pipeline-review"),
        local_model_base=os.getenv("LOCAL_MODEL_BASE", "Qwen/Qwen2.5-Coder-0.5B-Instruct"),
        local_model_adapter=str(adapter_value),
        local_model_max_new_tokens=int(os.getenv("LOCAL_MODEL_MAX_NEW_TOKENS", "768")),
        local_model_device=os.getenv("LOCAL_MODEL_DEVICE", "cpu").lower(),
        local_model_timeout=int(os.getenv("LOCAL_MODEL_TIMEOUT", "180")),
    )


settings = get_setting()
