import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "QRIS Dynamic Engine & Mutation Verifier"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = 8088
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./qris_engine.db"

    # Default Static QRIS Payload (Bisa diubah via UI atau .env)
    DEFAULT_STATIC_QRIS: str = ""

    # Invoice Settings
    INVOICE_EXPIRY_MINUTES: int = 15
    USE_UNIQUE_CODE: bool = True
    UNIQUE_CODE_MIN: int = 100
    UNIQUE_CODE_MAX: int = 999

    # Outgoing Webhook URL (Dipanggil saat mutasi cocok & invoice terbayar)
    MERCHANT_WEBHOOK_URL: str = ""
    WEBHOOK_SECRET_KEY: str = "qris_secret_key_change_me"

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

