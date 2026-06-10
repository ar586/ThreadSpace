from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile, Form
import httpx
from bs4 import BeautifulSoup
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID, uuid4
import os
from datetime import datetime, timezone

from app.database import get_db
from app.models.node import Node
from app.models.workspace import Workspace
from app.models.user import User
from app.schemas import NodeCreate, NodeResponse, BreadcrumbNode, NodeUpdate, NodePositionUpdate, NodeParentUpdate
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

URL_REGEX = re.compile(r'(https?://[^\s]+)')

async def fetch_preview_data(node_id: UUID, content: str):
    match = URL_REGEX.search(content)
    if not match:
        return
    url = match.group(0)
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        title = soup.find("meta", property="og:title")
        description = soup.find("meta", property="og:description")
        image = soup.find("meta", property="og:image")
        
        preview_data = {}
        if title and title.get("content"):
            preview_data["title"] = title.get("content")
        elif soup.title:
            preview_data["title"] = soup.title.string
            
        if description and description.get("content"):
            preview_data["description"] = description.get("content")
            
        if image and image.get("content"):
            preview_data["image"] = image.get("content")
            
        preview_data["url"] = url
        
        if preview_data:
            from app.database import async_session
            from app.models.node import Node
            async with async_session() as session:
                async with session.begin():
                    node = await session.get(Node, node_id)
                    if node:
                        node.preview_data = preview_data
    except Exception as e:
        print(f"Failed to fetch preview for {url}: {e}")

@router.post("", response_model=NodeResponse)
async def create_node(
    node: NodeCreate, 
    background_tasks: BackgroundTasks,
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

    # Touch workspace updated_at
    from sqlalchemy import update
    await db.execute(update(Workspace).where(Workspace.id == node.workspace_id).values(updated_at=datetime.now(timezone.utc)))

    await db.commit()
    await db.refresh(new_node)
    
    if new_node.content:
        background_tasks.add_task(fetch_preview_data, new_node.id, new_node.content)
    
    return new_node

async def upload_to_azure_bg(data: bytes, blob_name: str):
    conn_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_string:
        return
    try:
        from azure.storage.blob.aio import BlobServiceClient
        blob_service_client = BlobServiceClient.from_connection_string(conn_string)
        async with blob_service_client:
            container_client = blob_service_client.get_container_client("threads-audio")
            blob_client = container_client.get_blob_client(blob_name)
            await blob_client.upload_blob(data, overwrite=True)
    except Exception as e:
        print(f"Failed to upload to Azure in background: {e}")

@router.post("/audio", response_model=NodeResponse)
async def upload_audio_node(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    workspace_id: UUID = Form(...),
    parent_id: Optional[UUID] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_workspace_owner(workspace_id, current_user.id, db)

    ext_map = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".m4a",
    }
    ext = ext_map.get(file.content_type, ".webm")
    filename = f"{uuid4()}{ext}"
    blob_name = f"workspaces/{workspace_id}/{filename}"

    conn_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    
    if conn_string:
        from azure.storage.blob.aio import BlobServiceClient
        # We need the URL synchronously to return to the client immediately
        # Blob URL format: https://<account_name>.blob.core.windows.net/<container>/<blob_name>
        blob_service_client = BlobServiceClient.from_connection_string(conn_string)
        audio_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/threads-audio/{blob_name}"
        
        # Read the file data immediately before the request closes
        data = await file.read()
        
        # Dispatch the actual upload to a background task
        background_tasks.add_task(upload_to_azure_bg, data, blob_name)
    else:
        # Fallback to local storage
        from app.main import AUDIO_DIR
        filepath = os.path.join(AUDIO_DIR, filename)
        with open(filepath, "wb") as f:
            while chunk := await file.read(1024 * 64):
                f.write(chunk)
        audio_url = f"/static/audio/{filename}"

    new_node = Node(
        content=None,
        audio_url=audio_url,
        parent_id=parent_id,
        workspace_id=workspace_id,
    )
    db.add(new_node)

    # Touch workspace updated_at
    from sqlalchemy import update
    await db.execute(update(Workspace).where(Workspace.id == workspace_id).values(updated_at=datetime.now(timezone.utc)))

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
    
    query = text("""
        WITH RECURSIVE breadcrumbs AS (
            -- Base case: find matching nodes
            SELECT 
                id, 
                content, 
                parent_id, 
                audio_url,
                id as original_id,
                0 as level
            FROM nodes
            WHERE workspace_id = :workspace_id 
              AND content ILIKE :query
            
            UNION ALL
            
            -- Recursive case: traverse up to the root
            SELECT 
                n.id, 
                n.content, 
                n.parent_id, 
                b.audio_url,
                b.original_id,
                b.level + 1
            FROM nodes n
            INNER JOIN breadcrumbs b ON b.parent_id = n.id
        )
        SELECT 
            b1.original_id as id,
            (SELECT content FROM nodes WHERE id = b1.original_id) as content,
            (SELECT audio_url FROM nodes WHERE id = b1.original_id) as audio_url,
            (SELECT parent_id FROM nodes WHERE id = b1.original_id) as parent_id,
            string_agg(COALESCE(b1.content, '🎙️ Voice Note'), ' > ' ORDER BY b1.level DESC) as breadcrumb
        FROM breadcrumbs b1
        GROUP BY b1.original_id
        LIMIT 50;
    """)
    
    result = await db.execute(query, {
        "workspace_id": workspace_id,
        "query": f"%{q}%"
    })
    
    rows = result.mappings().all()
    return rows

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

@router.patch("/{node_id}/content", response_model=NodeResponse)
async def update_node_content(
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

@router.patch("/{node_id}/parent", response_model=NodeResponse)
async def update_node_parent(
    node_id: UUID, 
    parent_update: NodeParentUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    node = await verify_node_owner(node_id, current_user.id, db)
    
    # Optional: prevent setting parent to itself or creating cycles (basic check)
    if parent_update.parent_id == node_id:
        raise HTTPException(status_code=400, detail="Node cannot be its own parent")

    node.parent_id = parent_update.parent_id
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

from pydantic import BaseModel

class BulkPositionUpdate(BaseModel):
    node_id: UUID
    position_x: float
    position_y: float

class BulkPositionsRequest(BaseModel):
    updates: List[BulkPositionUpdate]

@router.patch("/workspace/{workspace_id}/positions")
async def update_bulk_positions(
    workspace_id: UUID,
    request: BulkPositionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_workspace_owner(workspace_id, current_user.id, db)
    
    if not request.updates:
        return {"status": "success"}

    update_dict = {str(u.node_id): (u.position_x, u.position_y) for u in request.updates}
    node_ids = [u.node_id for u in request.updates]
    
    result = await db.execute(select(Node).where(Node.id.in_(node_ids), Node.workspace_id == workspace_id))
    nodes_to_update = result.scalars().all()
    
    for node in nodes_to_update:
        if str(node.id) in update_dict:
            node.position_x, node.position_y = update_dict[str(node.id)]
            
    await db.commit()
    return {"status": "success", "updated": len(nodes_to_update)}
