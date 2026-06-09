from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    created_at: datetime

class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    created_at: datetime

class NodeCreate(BaseModel):
    content: str
    parent_id: Optional[UUID] = None
    workspace_id: UUID

class NodeUpdate(BaseModel):
    content: str

class NodePositionUpdate(BaseModel):
    position_x: float
    position_y: float

class NodeParentUpdate(BaseModel):
    parent_id: Optional[UUID] = None

class NodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    content: str
    preview_data: Optional[dict] = None
    parent_id: Optional[UUID]
    workspace_id: UUID
    position_x: float
    position_y: float
    created_at: datetime
    updated_at: Optional[datetime] = None

class BreadcrumbNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    content: str
    parent_id: Optional[UUID]
    level: int

class NodeSearchResult(BaseModel):
    id: UUID
    content: str
    preview_data: Optional[dict] = None
    parent_id: Optional[UUID]
    breadcrumb: str
