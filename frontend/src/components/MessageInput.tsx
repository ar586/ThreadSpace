"use client";

import { fetcher } from "@/lib/api";
import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { SendHorizontal } from "lucide-react";

export function MessageInput({ 
  workspaceId, 
  parentId,
  onMessageSent 
}: { 
  workspaceId: string; 
  parentId?: string;
  onMessageSent: () => void;
}) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSending(true);
    try {
      await fetcher("/nodes/", {
        method: "POST",
        body: JSON.stringify({
          content: content.trim(),
          workspace_id: workspaceId,
          parent_id: parentId || null,
        }),
      });
      setContent("");
      onMessageSent();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 bg-background border-t border-border sticky bottom-0">
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message here..."
          className="resize-none min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button 
          type="submit" 
          disabled={isSending || !content.trim()}
          className="h-auto px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <SendHorizontal className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
