from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.api.routes import workspaces, nodes, auth
from app.models.workspace import Workspace
from app.models.node import Node
from app.models.user import User

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup on shutdown
    await engine.dispose()

app = FastAPI(title="ThreadSpace API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(workspaces.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(nodes.router, prefix="/api/nodes", tags=["nodes"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
