"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { FolderPlus, Hash, Loader2, Trash2, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, logout } = useAuth();

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
    <div className="w-64 bg-muted/30 border-r border-border h-screen flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-bold text-xl flex items-center gap-2 text-foreground">
          <Hash className="w-5 h-5 text-primary" /> ThreadSpace
        </h2>
        <ThemeToggle />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Workspaces</h3>
        {!workspaces && !error && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
        {workspaces?.map((ws) => (
          <div key={ws.id} className={`group flex items-center justify-between rounded-md transition-colors ${
              params.workspaceId === ws.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
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

      <div className="p-4 border-t border-border bg-background space-y-4">
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

        {user && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium truncate text-foreground">
                {user.email.split("@")[0]}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
