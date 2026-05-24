from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa


EMBEDDING_DIM = 1536  # OpenAI text-embedding-3-small


class MemoryStreamBase(SQLModel):
    user_id: int = Field(foreign_key="users.id", index=True)
    trip_id: Optional[int] = Field(default=None, foreign_key="trips.id", index=True)
    content: str
    memory_type: str  # "preference" | "history" | "constraint"


class MemoryStream(MemoryStreamBase, table=True):
    __tablename__ = "memory_streams"

    id: Optional[int] = Field(default=None, primary_key=True)
    vector_embedding: Optional[list[float]] = Field(
        default=None,
        sa_column=Column(Vector(EMBEDDING_DIM), nullable=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MemoryStreamCreate(MemoryStreamBase):
    pass


class MemoryStreamRead(MemoryStreamBase):
    id: int
    created_at: datetime


class MemorySearchResult(SQLModel):
    memory: MemoryStreamRead
    similarity: float
