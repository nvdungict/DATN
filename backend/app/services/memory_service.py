from typing import Optional
from openai import AsyncOpenAI
from sqlmodel import select
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

    # Build cosine similarity query with pgvector
    vector_col = MemoryStream.vector_embedding
    similarity = (1 - vector_col.op("<->")(query_embedding)).label("similarity")

    stmt = (
        select(MemoryStream, similarity)
        .where(MemoryStream.user_id == user_id)
        .where(MemoryStream.vector_embedding.is_not(None))
        .order_by(similarity.desc())
        .limit(top_k)
    )

    if trip_id:
        stmt = stmt.where(
            sa.or_(MemoryStream.trip_id == trip_id, MemoryStream.trip_id.is_(None))
        )

    result = await session.execute(stmt)
    return [(row[0], float(row[1])) for row in result.all()]
