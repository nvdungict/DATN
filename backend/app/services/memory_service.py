from typing import Optional
from openai import AsyncOpenAI
from sqlmodel.ext.asyncio.session import AsyncSession
import sqlalchemy as sa

from app.core.config import get_settings
from app.models.memory import MemoryStream, MemoryStreamCreate, EMBEDDING_DIM

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def embed_text(text: str) -> list[float]:
    """Generate embedding vector for a text using OpenAI."""
    response = await openai_client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


async def save_memory(
    session: AsyncSession,
    user_id: int,
    content: str,
    memory_type: str,
    trip_id: Optional[int] = None,
) -> MemoryStream:
    """Save a memory entry with its vector embedding."""
    embedding = await embed_text(content)

    memory = MemoryStream(
        user_id=user_id,
        trip_id=trip_id,
        content=content,
        memory_type=memory_type,
        vector_embedding=embedding,
    )
    session.add(memory)
    await session.commit()
    await session.refresh(memory)
    return memory


async def retrieve_memory(
    session: AsyncSession,
    user_id: int,
    query: str,
    top_k: int = 5,
    trip_id: Optional[int] = None,
) -> list[tuple[MemoryStream, float]]:
    """Vector search: find most relevant memories for a user query."""
    query_embedding = await embed_text(query)

    # Serialize embedding to pgvector literal e.g. '[0.1,-0.2,...]'
    # Injected directly into the SQL f-string (safe: values are floats from OpenAI).
    # Cannot use SQLAlchemy named param ':embedding::vector' — it conflicts with
    # SQLAlchemy's parameter parser (sees ':embedding:' then ':vector').
    embedding_literal = "[" + ",".join(str(v) for v in query_embedding) + "]"

    trip_filter = ""
    params: dict = {"user_id": user_id, "top_k": top_k}

    if trip_id is not None:
        trip_filter = "AND (ms.trip_id = :trip_id OR ms.trip_id IS NULL)"
        params["trip_id"] = trip_id

    raw_sql = sa.text(f"""
        SELECT
            ms.id, ms.user_id, ms.trip_id, ms.content, ms.memory_type,
            ms.vector_embedding, ms.created_at,
            1 - (ms.vector_embedding <-> '{embedding_literal}'::vector) AS similarity
        FROM memory_streams ms
        WHERE ms.user_id = :user_id
          AND ms.vector_embedding IS NOT NULL
          {trip_filter}
        ORDER BY similarity DESC
        LIMIT :top_k
    """)

    result = await session.execute(raw_sql, params)
    rows = result.mappings().all()

    memories = []
    for row in rows:
        mem = MemoryStream(
            id=row["id"],
            user_id=row["user_id"],
            trip_id=row["trip_id"],
            content=row["content"],
            memory_type=row["memory_type"],
            created_at=row["created_at"],
        )
        memories.append((mem, float(row["similarity"])))

    return memories

