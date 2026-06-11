"use client";

import useSWR, { preload } from "swr";
import { fetcher } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState, useRef, useEffect } from "react";
import { FolderPlus, Hash, Loader2, Trash2, LogOut, User as UserIcon, Search, X, MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { InstallPWA } from "./InstallPWA";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function Sidebar() {
  const { data: workspaces, error, mutate } = useSWR<Workspace[]>("/workspaces", fetcher);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (workspaces) {
      workspaces.slice(0, 5).forEach(ws => {
        preload(`/nodes/workspace/${ws.id}/root`, fetcher);
      });
    }
  }, [workspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const workspaceName = newWorkspaceName.trim();
    setNewWorkspaceName("");
    setIsCreating(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticWorkspace = {
      id: tempId,
      name: workspaceName,
      created_at: new Date().toISOString()
    };

    mutate((currentWorkspaces: any) => {
      if (!currentWorkspaces) return [optimisticWorkspace];
      return [optimisticWorkspace, ...currentWorkspaces];
    }, { revalidate: false });

    try {
      const created = await fetcher<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: workspaceName }),
      });
      
      mutate((currentWorkspaces: any) => {
        if (!currentWorkspaces) return [created];
        return currentWorkspaces.map((ws: any) => ws.id === tempId ? created : ws);
      }, { revalidate: false });
      
      router.push(`/w/${created.id}`);
    } catch (err) {
      console.error(err);
      mutate(); // Revert on error
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full bg-muted/30 border-r border-border h-screen flex flex-col">
      <div className="h-16 px-4 border-b border-border flex justify-between items-center shrink-0">
        <h2 className="font-bold text-xl flex items-center gap-2 text-foreground">
          <Hash className="w-5 h-5 text-primary" /> ThreadSpace
        </h2>
        <div className="flex items-center gap-1">
          <InstallPWA />
          <ThemeToggle />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspaces</h3>
          <button
            onClick={() => {
              setSearchOpen(!searchOpen);
              setSearchQuery("");
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {searchOpen ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
          </button>
        </div>
        {searchOpen && (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter workspaces..."
              className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
            />
          </div>
        )}
        {!workspaces && !error && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
        <div className="space-y-1">
          {workspaces?.filter(ws => !searchQuery || ws.name.toLowerCase().includes(searchQuery.toLowerCase())).map((ws) => (
            <div key={ws.id} className={`group relative flex items-center justify-between rounded-xl transition-all duration-200 cursor-pointer overflow-hidden ${
                params.workspaceId === ws.id
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}>
              <Link
                href={`/w/${ws.id}`}
                className="flex-1 flex items-center gap-3 p-3"
              >
                {/* Avatar / Icon */}
                <div className={`w-12 h-12 rounded-full flex shrink-0 items-center justify-center ${params.workspaceId === ws.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-background"}`}>
                  <FolderPlus className="w-5 h-5" />
                </div>
                
                {/* Chat Details */}
                <div className="flex-1 flex flex-col min-w-0 pr-8">
                  {editingWorkspaceId === ws.id ? (
                    <form 
                      className="flex items-center gap-1 w-full"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editingWorkspaceName.trim() || isRenaming) return;
                        setIsRenaming(true);
                        try {
                          await fetcher(`/workspaces/${ws.id}`, {
                            method: "PUT",
                            body: JSON.stringify({ name: editingWorkspaceName.trim() })
                          });
                          mutate();
                          setEditingWorkspaceId(null);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsRenaming(false);
                        }
                      }}
                    >
                      <input 
                        autoFocus
                        className="w-full bg-background border border-border text-[14px] px-2 py-1 rounded focus:outline-none focus:border-primary" 
                        value={editingWorkspaceName}
                        onChange={(e) => setEditingWorkspaceName(e.target.value)}
                        onBlur={() => {
                          // Slight delay to allow form submission to trigger first if clicked enter
                          setTimeout(() => {
                            if (!isRenaming) setEditingWorkspaceId(null);
                          }, 150);
                        }}
                        onClick={(e) => e.preventDefault()}
                      />
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-[15px] truncate pr-2">{ws.name}</span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                          {new Date(ws.updated_at || ws.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className="text-[13px] text-muted-foreground truncate w-full">
                        Tap to open workspace...
                      </span>
                    </>
                  )}
                </div>
              </Link>
              
              {/* Action Menu */}
              <div className="absolute right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger onClick={(e) => e.preventDefault()} className="h-8 w-8 bg-transparent hover:bg-background/80 border border-transparent hover:border-border shadow-none hover:shadow-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all focus-visible:outline-none">
                    <MoreHorizontal className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingWorkspaceId(ws.id);
                        setEditingWorkspaceName(ws.name);
                      }}
                      className="cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!confirm("Are you sure you want to delete this workspace and all its threads?")) return;
                        try {
                          await fetcher(`/workspaces/${ws.id}`, { method: 'DELETE' });
                          mutate();
                          if (params.workspaceId === ws.id) router.push('/');
                        } catch(err) {
                          console.error(err);
                        }
                      }}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
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
