from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=None,
        extra="ignore",
    )

    environment: str = "development"
    app_version: str = "0.1.0"
    git_sha: str = "02011e3"
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    allowed_origins: str = "http://localhost:5173,https://localhost:8000"

    database_url: str = "sqlite:///./data/saocs.db"

    jwt_secret_key: str = "saocs-insecure-jwt-secret-key-change-in-production-min-32-bytes"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    setup_token_expire_minutes: int = 15

    google_client_id: str = "google-client-id-placeholder"
    google_client_secret: str = "google-client-secret-placeholder"
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    frontend_url: str = "http://localhost:5173"

    mqtt_broker_host: str = "localhost"
    mqtt_port: int = 1883
    mqtt_tls_port: int = 8883
    mqtt_backend_user: str = "saocs_backend"
    mqtt_backend_password: str = "saocs_backend_pass"
    mqtt_device_user: str = "saocs_esp32"
    mqtt_device_password: str = "saocs_esp32_pass"
    mqtt_default_device_id: str = "esp32_prototype_01"

    tariff_rate_per_kwh: float = 209.5
    relay_debounce_ms: int = 1000

    @property
    def async_database_url(self) -> str:
        if self.database_url.startswith("sqlite:///"):
            return self.database_url.replace("sqlite:///", "sqlite+aiosqlite:///")
        if self.database_url.startswith("sqlite://"):
            return self.database_url.replace("sqlite://", "sqlite+aiosqlite://")
        return self.database_url

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

settings = Settings()
