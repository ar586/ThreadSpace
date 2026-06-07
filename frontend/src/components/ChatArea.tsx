"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { MessageSquareShare, Loader2, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Node {
  id: string;
  content: string;
  parent_id: string | null;
  workspace_id: string;
  created_at: string;
  updated_at?: string;
}

export function ChatArea({ 
  workspaceId, 
  nodeId,
  shouldMutate
}: { 
  workspaceId: string; 
  nodeId?: string;
  shouldMutate: number;
}) {
  const url = nodeId ? `/nodes/${nodeId}/children` : `/nodes/workspace/${workspaceId}/root`;
  const { data: nodes, error, mutate } = useSWR<Node[]>(url, fetcher);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (shouldMutate > 0) {
      mutate();
    }
  }, [shouldMutate, mutate]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (!editingNodeId) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [nodes, editingNodeId]);

  const handleEditSave = async (id: string) => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await fetcher(`/nodes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content: editContent.trim() }),
      });
      await mutate();
      setEditingNodeId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return <div className="p-8 text-center text-red-500">Failed to load messages.</div>;
  }

  if (!nodes) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <p>No messages yet. Be the first to start the thread!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {nodes.map((node) => (
          <Card key={node.id} className="p-5 shadow-sm hover:shadow-md transition-shadow border-slate-200 relative group">
            
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300">
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => {
                      setEditingNodeId(node.id);
                      setEditContent(node.content);
                    }}
                    className="cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this thread?")) return;
                      try {
                        await fetcher(`/nodes/${node.id}`, { method: 'DELETE' });
                        mutate();
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

            {editingNodeId === node.id ? (
              <div className="mb-4 pr-8">
                <Textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[100px] mb-2"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditingNodeId(null)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleEditSave(node.id)} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-slate-800 leading-relaxed mb-4 pr-8">
                {node.content}
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-slate-400 border-t pt-3">
              <div className="flex items-center gap-2">
                <span>{new Date(node.created_at).toLocaleString()}</span>
                {node.updated_at && (
                  <span className="italic opacity-70">(edited)</span>
                )}
              </div>
              <Link href={`/w/${workspaceId}/n/${node.id}`}>
                <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                  <MessageSquareShare className="w-4 h-4 mr-2" />
                  Open Thread
                </Button>
              </Link>
            </div>
          </Card>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
