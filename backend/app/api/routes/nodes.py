from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy import text
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.node import Node
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas import NodeCreate, NodeResponse, BreadcrumbNode, NodeUpdate, NodePositionUpdate
from app.api.dependencies import get_current_user

router = APIRouter()

async def verify_workspace_owner(workspace_id: UUID, user_id: UUID, db: AsyncSession):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")

async def verify_node_owner(node_id: UUID, user_id: UUID, db: AsyncSession) -> Node:
    result = await db.execute(
        select(Node).join(Workspace).where(Node.id == node_id, Workspace.user_id == user_id)
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found or not authorized")
    return node

@router.post("/", response_model=NodeResponse)
async def create_node(
    node: NodeCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_workspace_owner(node.workspace_id, current_user.id, db)
    
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
async def get_children(
    node_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_node_owner(node_id, current_user.id, db)
    result = await db.execute(select(Node).where(Node.parent_id == node_id).order_by(Node.created_at.asc()))
    return result.scalars().all()

@router.get("/workspace/{workspace_id}/root", response_model=List[NodeResponse])
async def get_root_nodes(
    workspace_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_workspace_owner(workspace_id, current_user.id, db)
    result = await db.execute(select(Node).where(Node.workspace_id == workspace_id, Node.parent_id == None).order_by(Node.created_at.asc()))
    return result.scalars().all()

@router.get("/workspace/{workspace_id}/all", response_model=List[NodeResponse])
async def get_all_workspace_nodes(
    workspace_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_workspace_owner(workspace_id, current_user.id, db)
    result = await db.execute(select(Node).where(Node.workspace_id == workspace_id).order_by(Node.created_at.asc()))
    return result.scalars().all()

from app.schemas import NodeSearchResult

@router.get("/workspace/{workspace_id}/search", response_model=List[NodeSearchResult])
async def search_nodes(
    workspace_id: UUID,
    q: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_workspace_owner(workspace_id, current_user.id, db)
    if not q or len(q.strip()) == 0:
        return []
    
    # Fetch all nodes in the workspace efficiently
    result = await db.execute(select(Node).where(Node.workspace_id == workspace_id))
    all_nodes = result.scalars().all()
    
    # Create lookup dictionaries
    node_dict = {str(n.id): n for n in all_nodes}
    
    query_lower = q.lower()
    results = []
    
    for node in all_nodes:
        if query_lower in node.content.lower():
            # Build breadcrumb
            path_parts = []
            current = node
            while current:
                path_parts.append(current.content)
                if current.parent_id and str(current.parent_id) in node_dict:
                    current = node_dict[str(current.parent_id)]
                else:
                    break
            
            # path_parts is from child to root, reverse it to root -> child
            path_parts.reverse()
            # If it's just the node itself, the breadcrumb might just be its parent path + its content
            breadcrumb_str = " > ".join(path_parts)
            
            results.append(
                NodeSearchResult(
                    id=node.id,
                    content=node.content,
                    parent_id=node.parent_id,
                    breadcrumb=breadcrumb_str
                )
            )
            
    # Sort results by content length or just return
    return results[:50]  # limit to 50 results

@router.get("/{node_id}/breadcrumbs", response_model=List[BreadcrumbNode])
async def get_breadcrumbs(
    node_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_node_owner(node_id, current_user.id, db)
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
async def delete_node(
    node_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    node = await verify_node_owner(node_id, current_user.id, db)
    await db.delete(node)
    await db.commit()
    return {"status": "success"}

@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: UUID, 
    node_update: NodeUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    node = await verify_node_owner(node_id, current_user.id, db)
    
    node.content = node_update.content
    node.updated_at = func.now()
    await db.commit()
    await db.refresh(node)
    return node

@router.patch("/{node_id}/position", response_model=NodeResponse)
async def update_node_position(
    node_id: UUID, 
    position_update: NodePositionUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    node = await verify_node_owner(node_id, current_user.id, db)
    
    node.position_x = position_update.position_x
    node.position_y = position_update.position_y
    await db.commit()
    await db.refresh(node)
    return node
