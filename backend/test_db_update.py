import asyncio
from sqlalchemy import select, update
from datetime import datetime, timezone
from app.database import async_session
from app.models.workspace import Workspace

async def main():
    async with async_session() as db:
        # get any workspace
        res = await db.execute(select(Workspace).limit(1))
        ws = res.scalar_one_or_none()
        if not ws:
            print("No workspaces")
            return
            
        print(f"Before: {ws.updated_at}")
        
        # update it
        await db.execute(update(Workspace).where(Workspace.id == ws.id).values(updated_at=datetime.now(timezone.utc)))
        await db.commit()
        
        # re-fetch
        await db.refresh(ws)
        print(f"After refresh: {ws.updated_at}")
        
        # clean fetch
        res2 = await db.execute(select(Workspace).where(Workspace.id == ws.id))
        ws2 = res2.scalar_one()
        print(f"After clean fetch: {ws2.updated_at}")

if __name__ == "__main__":
    asyncio.run(main())
