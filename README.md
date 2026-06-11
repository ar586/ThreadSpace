# ThreadSpace

ThreadSpace is an advanced, collaborative workspace engineered for non-linear thinking and structured communication. Moving beyond the constraints of chronological chat applications, ThreadSpace allows users to infinitely branch conversations, establishing a deeply nested, context-rich web of discussions that prevents cognitive overload and context collapse.

## Architecture

ThreadSpace employs a robust, decoupled full-stack architecture designed for performance and scalability.

### Frontend
- **Framework:** Next.js (App Router)
- **Styling:** TailwindCSS and Radix UI components (shadcn/ui)
- **State Management & Caching:** SWR for aggressive stale-while-revalidate caching and optimistic UI updates
- **Visualization:** React Flow combined with Dagre for directed acyclic graph (DAG) rendering
- **Capabilities:** Fully installable Progressive Web App (PWA) with offline caching capabilities and responsive mobile layouts

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL with SQLAlchemy ORM (Asynchronous implementation)
- **Authentication:** JWT-based authentication
- **Storage:** Azure Blob Storage for media assets
- **Deployment:** Containerized via Docker and deployed via Azure Container Apps

## Core Features

- **Non-Linear Threading:** Reply to any specific message to branch the conversation into a new, isolated context, preserving the original discussion flow.
- **Workbench Visualization:** Visualize complex, nested conversations as an interactive tree structure. The Workbench provides a high-level topographical map of all active branches.
- **Optimistic Concurrency:** Real-time UI updates that instantly reflect user actions without blocking on network latency.
- **Progressive Web App:** Installable on desktop and mobile operating systems with caching strategies for rapid load times and native-like experiences.
- **Rich Media Integration:** Support for inline link previews (Open Graph protocol) and native audio recordings.
- **Dynamic Workspaces:** Organize threads into isolated workspaces, sorted dynamically based on recent activity timestamps.

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- Python 3.9 or higher
- PostgreSQL 14.x or higher

### Backend Setup
1. Navigate to the `backend` directory.
2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up the environment variables. Ensure `DATABASE_URL` points to your PostgreSQL instance, `AZURE_STORAGE_CONNECTION_STRING` is provided for media storage, and set a secure `SECRET_KEY`.
4. Run the database migrations and start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend instance.
4. Start the development server:
   ```bash
   npm run dev
   ```

## Design Philosophy

ThreadSpace is engineered to reduce cognitive overload in complex, multi-threaded discussions. By isolating context into strict branches, users can follow specific tangents without cluttering the main conversation. The overarching goal is to combine the speed of instant messaging with the structural integrity of a wiki or knowledge graph.

## License

This project is proprietary and confidential. All rights reserved.
