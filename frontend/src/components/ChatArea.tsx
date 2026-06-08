"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { MessageSquareShare, Loader2, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);



  useEffect(() => {
    if (shouldMutate > 0) {
      mutate();
    }
  }, [shouldMutate, mutate]);

  useEffect(() => {
    if (nodes && nodes.length > 0) {
      if (highlightId) {
        // Scroll to highlighted node
        const element = document.getElementById(`message-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (!editingNodeId) {
        // Scroll to bottom on new messages
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [nodes, editingNodeId, highlightId]);

  const handleEditSave = async (id: string) => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await fetcher(`/nodes/${id}/content`, {
        method: "PATCH",
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
      <div className="flex-1 flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-[#efeae2] dark:bg-[#0b141a]">
        <p>No messages yet. Be the first to start the thread!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-[#efeae2] dark:bg-[#0b141a]">
      <div className="w-full flex flex-col gap-2">
        {nodes.map((node) => (
          <div key={node.id} id={`message-${node.id}`} className="flex w-full justify-start relative group scroll-mt-24">
            
            {/* Action Menu (Visible on Hover) */}
            <div className="absolute -top-3 -right-2 md:right-auto md:left-[calc(100%+0.5rem)] opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 bg-background border border-border shadow-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none">
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
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
                  <Link href={`/w/${workspaceId}/n/${node.id}`} className="w-full">
                    <DropdownMenuItem className="cursor-pointer">
                      <MessageSquareShare className="w-4 h-4 mr-2" />
                      Open Thread
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Chat Bubble */}
            <div className={`relative max-w-[90%] md:max-w-[75%] bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-sm shadow-sm p-2 pl-3 transition-all duration-700 ${highlightId === node.id ? 'ring-2 ring-primary bg-primary/10 dark:bg-primary/20 scale-[1.02]' : ''}`}>
              
              {/* Sender Name */}
              <div className="text-[13px] font-medium text-[#027eb5] dark:text-[#53bdeb] mb-1">
                Past Me
              </div>

              {editingNodeId === node.id ? (
                <div className="mb-4 pr-12 min-w-[200px]">
                  <Textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px] mb-2 bg-transparent border-primary/20"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingNodeId(null)} className="h-7 text-xs">
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleEditSave(node.id)} disabled={isSaving} className="h-7 text-xs">
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-[15px] text-[#111b21] dark:text-[#e9edef] leading-relaxed whitespace-pre-wrap pr-16 pb-3">
                  {node.content}
                </div>
              )}

              {/* Timestamp */}
              <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] text-[#667781] dark:text-[#8696a0]">
                {node.updated_at && (
                  <span className="italic mr-1">(edited)</span>
                )}
                <span>
                  {new Date(node.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
