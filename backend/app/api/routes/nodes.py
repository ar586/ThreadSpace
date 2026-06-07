from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy import text
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.node import Node
from app.schemas import NodeCreate, NodeResponse, BreadcrumbNode, NodeUpdate

router = APIRouter()

@router.post("/", response_model=NodeResponse)
async def create_node(node: NodeCreate, db: AsyncSession = Depends(get_db)):
    new_node = Node(
        content=node.content,
        parent_id=node.parent_id,
        workspace_id=node.workspace_id
    )
    db.add(new_node)
    await db.commit()
    await db.refresh(new_node)
    return new_node

@router.get("/{node_id}/children", response_model=List[NodeResponse])
async def get_children(node_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.parent_id == node_id).order_by(Node.created_at.asc()))
    return result.scalars().all()

@router.get("/workspace/{workspace_id}/root", response_model=List[NodeResponse])
async def get_root_nodes(workspace_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.workspace_id == workspace_id, Node.parent_id == None).order_by(Node.created_at.asc()))
    return result.scalars().all()

@router.get("/{node_id}/breadcrumbs", response_model=List[BreadcrumbNode])
async def get_breadcrumbs(node_id: UUID, db: AsyncSession = Depends(get_db)):
    query = text("""
        WITH RECURSIVE breadcrumbs AS (
            SELECT id, content, parent_id, 0 as level
            FROM nodes
            WHERE id = :node_id
            
            UNION ALL
            
            SELECT n.id, n.content, n.parent_id, b.level + 1
            FROM nodes n
            INNER JOIN breadcrumbs b ON b.parent_id = n.id
        )
        SELECT id, content, parent_id, level
        FROM breadcrumbs
        ORDER BY level DESC;
    """)
    result = await db.execute(query, {"node_id": node_id})
    rows = result.mappings().all()
    return rows

@router.delete("/{node_id}")
async def delete_node(node_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if node:
        await db.delete(node)
        await db.commit()
    return {"status": "success"}

@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(node_id: UUID, node_update: NodeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    node.content = node_update.content
    node.updated_at = func.now()
    await db.commit()
    await db.refresh(node)
    return node
