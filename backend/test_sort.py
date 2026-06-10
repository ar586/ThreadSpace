import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, DateTime, text, select
import os
import uuid
from datetime import datetime, timezone

Base = declarative_base()

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(String, primary_key=True)
    name = Column(String)
    updated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True))

async def main():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://threadspace_user:threadspace_password@localhost:5433/threadspace_db")
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT id, name, updated_at, created_at FROM workspaces ORDER BY updated_at DESC LIMIT 5"))
        rows = result.fetchall()
        for row in rows:
            print(f"Workspace: {row.name}, Updated: {row.updated_at}, Created: {row.created_at}")

if __name__ == "__main__":
    asyncio.run(main())
