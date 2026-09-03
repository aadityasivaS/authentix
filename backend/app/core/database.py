from typing import Any
from pymongo import MongoClient
from app.core.config import get_settings


class Database:
    def __init__(self) -> None:
        self.client: MongoClient | None = None
        settings = get_settings()
        if settings.mongodb_uri:
            self.client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=3000)
            self.db = self.client[settings.mongodb_db]
        else:
            self.db = None

    def collection(self, name: str) -> Any:
        return self.db[name] if self.db is not None else None


database = Database()
