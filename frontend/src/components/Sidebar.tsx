"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { FolderPlus, Hash, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export function Sidebar() {
  const { data: workspaces, error, mutate } = useSWR<Workspace[]>("/workspaces", fetcher);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const params = useParams();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const created = await fetcher<Workspace>("/workspaces/", {
        method: "POST",
        body: JSON.stringify({ name: newWorkspaceName }),
      });
      await mutate();
      setNewWorkspaceName("");
      router.push(`/w/${created.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 bg-slate-50 border-r h-screen flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold text-xl flex items-center gap-2">
          <Hash className="w-5 h-5 text-indigo-600" /> ThreadSpace
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Workspaces</h3>
        {!workspaces && !error && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
        {workspaces?.map((ws) => (
          <div key={ws.id} className={`group flex items-center justify-between rounded-md transition-colors ${
              params.workspaceId === ws.id
                ? "bg-indigo-100 text-indigo-700 font-medium"
                : "text-slate-700 hover:bg-slate-100"
            }`}>
            <Link
              href={`/w/${ws.id}`}
              className="flex-1 px-3 py-2 text-sm truncate"
            >
              {ws.name}
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 mr-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-opacity"
              onClick={async (e) => {
                e.preventDefault();
                if (!confirm("Are you sure you want to delete this workspace and all its threads?")) return;
                try {
                  await fetcher(`/workspaces/${ws.id}`, { method: 'DELETE' });
                  mutate();
                  if (params.workspaceId === ws.id) router.push('/');
                } catch(err) {
                  console.error(err);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-white">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="New workspace..."
            className="h-8 text-sm"
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
