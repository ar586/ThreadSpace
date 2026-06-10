# ThreadSpace

ThreadSpace is a collaborative workspace designed for non-linear thinking and structured communication. It moves beyond traditional chronological chat applications by allowing users to branch conversations infinitely, creating a deeply nested, context-rich web of discussions.

## Architecture

ThreadSpace is built as a full-stack web application with a clear separation between the client and server.

### Frontend
- **Framework:** Next.js (App Router)
- **Styling:** TailwindCSS and Radix UI components (shadcn/ui)
- **State Management & Caching:** SWR for aggressive stale-while-revalidate caching
- **Visualization:** React Flow combined with Dagre for directed acyclic graph (DAG) rendering
- **Capabilities:** Fully installable Progressive Web App (PWA) with offline caching

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL with SQLAlchemy ORM (Async)
- **Authentication:** JWT-based authentication
- **Deployment:** Containerized via Docker

## Core Features

- **Non-Linear Threading:** Reply to any specific message to branch the conversation into a new, isolated context.
- **Workbench View:** Visualize complex, nested conversations as an interactive tree structure.
- **Progressive Web App:** Installable on desktop and mobile devices with caching strategies for rapid load times.
- **Rich Media:** Support for inline link previews and native audio recordings.
- **Dynamic Workspaces:** Organize threads into isolated workspaces, sorted dynamically based on recent activity.

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL

### Backend Setup
1. Navigate to the `backend` directory.
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up the environment variables. Ensure `DATABASE_URL` points to your PostgreSQL instance and set a secure `SECRET_KEY`.
4. Run the database migrations (if applicable) and start the server:
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

ThreadSpace is engineered to reduce cognitive overload in complex discussions. By isolating context into branches, users can follow specific tangents without cluttering the main conversation. The Workbench view acts as a high-level map, ensuring users never lose their place within deeply nested threads.

## License

This project is proprietary and confidential.
