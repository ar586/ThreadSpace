from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    workspace: WorkspaceCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_workspace = Workspace(name=workspace.name, user_id=current_user.id)
    db.add(new_workspace)
    await db.commit()
    await db.refresh(new_workspace)
    return new_workspace

@router.get("", response_model=List[WorkspaceResponse])
async def get_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Workspace)
        .where(Workspace.user_id == current_user.id)
        .order_by(Workspace.updated_at.desc())
    )
    return result.scalars().all()

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    )
    workspace = result.scalar_one_or_none()
    if workspace:
        await db.delete(workspace)
        await db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Workspace not found")

@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    workspace_update: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    workspace.name = workspace_update.name
    # Explicitly touch updated_at to ensure sorting updates when renamed
    from datetime import datetime, timezone
    from sqlalchemy import update
    await db.execute(
        update(Workspace)
        .where(Workspace.id == workspace_id)
        .values(name=workspace_update.name, updated_at=datetime.now(timezone.utc))
    )
    await db.commit()
    await db.refresh(workspace)
    return workspace
