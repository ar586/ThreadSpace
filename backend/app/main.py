from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import engine, Base
from app.api.routes import workspaces, nodes, auth
from app.models.workspace import Workspace
from app.models.node import Node
from app.models.user import User

# Ensure audio storage directory exists
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add preview_data column to nodes if it doesn't exist
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE nodes ADD COLUMN IF NOT EXISTS preview_data JSONB"))
        await conn.execute(text("ALTER TABLE nodes ADD COLUMN IF NOT EXISTS audio_url VARCHAR"))
        await conn.execute(text("ALTER TABLE nodes ALTER COLUMN content DROP NOT NULL"))
    yield
    # Cleanup on shutdown
    await engine.dispose()

app = FastAPI(title="ThreadSpace API", lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "https://threadspace.vercel.app",
    "https://thread-space-red.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file serving for audio uploads
app.mount("/static/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(workspaces.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(nodes.router, prefix="/api/nodes", tags=["nodes"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

