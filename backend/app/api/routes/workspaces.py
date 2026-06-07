from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.workspace import Workspace
from app.schemas import WorkspaceCreate, WorkspaceResponse

router = APIRouter()

@router.post("/", response_model=WorkspaceResponse)
async def create_workspace(workspace: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    new_workspace = Workspace(name=workspace.name)
    db.add(new_workspace)
    await db.commit()
    await db.refresh(new_workspace)
    return new_workspace

@router.get("/", response_model=List[WorkspaceResponse])
async def get_workspaces(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
    return result.scalars().all()

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if workspace:
        await db.delete(workspace)
        await db.commit()
    return {"status": "success"}
