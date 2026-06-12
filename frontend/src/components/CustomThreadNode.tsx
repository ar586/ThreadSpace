import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { MessageSquareShare, Plus, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { fetcher } from "@/lib/api";
import { useSWRConfig } from "swr";
import { LinkPreview } from "./LinkPreview";
import { AudioPlayer } from "./AudioPlayer";

export function CustomThreadNode({ data }: { data: any }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { mutate } = useSWRConfig();
  const { deleteElements } = useReactFlow();

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async () => {
    if (content === data.content) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await fetcher(`/nodes/${data.id}/content`, {
        method: "PATCH",
        body: JSON.stringify({ content: content.trim() }),
      });
      data.content = content.trim(); // optimistic update for React Flow
      mutate(`/nodes/workspace/${workspaceId}/all`);
    } catch (err) {
      console.error(err);
      setContent(data.content); // revert
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setContent(data.content);
      setIsEditing(false);
    }
  };

  const handleCreateChild = async () => {
    setIsCreating(true);
    try {
      await fetcher(`/nodes/`, {
        method: "POST",
        body: JSON.stringify({
          content: "New Node",
          parent_id: data.id,
          workspace_id: workspaceId,
        }),
      });
      mutate(`/nodes/workspace/${workspaceId}/all`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this thread and all its replies?")) {
      deleteElements({ nodes: [{ id: data.id }] });
    }
  };

  return (
    <div className="group bg-card dark:bg-[#202c33] border border-border shadow-sm rounded-xl p-3 w-[120px] md:w-[208px] relative">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary" />
      
      <div className="flex justify-between items-start mb-2">
        <div className="text-[11px] font-semibold text-[#027eb5] dark:text-[#53bdeb] uppercase tracking-wider">
          Past Me
        </div>
        <button 
          onClick={handleDelete}
          className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 -mt-1 -mr-1"
          title="Delete Thread"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {data.audio_url ? (
        <div className="mb-4">
          <AudioPlayer src={data.audio_url} />
        </div>
      ) : isEditing ? (
        <div className="mb-4">
          <textarea
            className="w-full text-xs md:text-sm text-foreground dark:text-[#e9edef] bg-transparent border border-primary/50 rounded p-1 outline-none resize-none overflow-hidden"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={3}
            disabled={isSaving}
          />
        </div>
      ) : (
        <div 
          className="text-xs md:text-sm text-foreground dark:text-[#e9edef] line-clamp-4 leading-relaxed mb-4 whitespace-pre-wrap cursor-text"
          onDoubleClick={() => setIsEditing(true)}
        >
          {data.content}
          {data.preview_data && (
            <LinkPreview data={data.preview_data} />
          )}
        </div>
      )}

      <Link href={`/w/${workspaceId}/n/${data.id}`} className="block w-full">
        <Button variant="secondary" className="w-full h-7 md:h-8 px-2 md:px-4 text-[10px] md:text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate">
          <MessageSquareShare className="w-3 h-3 mr-1.5 md:mr-2 shrink-0" /> <span className="truncate">Dive into Thread</span>
        </Button>
      </Link>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary" />

      {/* Floating Add Button */}
      <button 
        onClick={handleCreateChild}
        disabled={isCreating}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 hover:bg-primary/90"
      >
        {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  );
}
