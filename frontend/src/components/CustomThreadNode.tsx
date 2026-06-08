import { Handle, Position } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { MessageSquareShare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function CustomThreadNode({ data }: { data: any }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="bg-card dark:bg-[#202c33] border border-border shadow-sm rounded-xl p-4 w-64 relative">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary" />
      
      <div className="text-[11px] font-semibold text-[#027eb5] dark:text-[#53bdeb] uppercase tracking-wider mb-2">
        Past Me
      </div>
      
      <div className="text-sm text-foreground dark:text-[#e9edef] line-clamp-4 leading-relaxed mb-4 whitespace-pre-wrap">
        {data.content}
      </div>

      <Link href={`/w/${workspaceId}/n/${data.id}`} className="block w-full">
        <Button variant="secondary" className="w-full h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <MessageSquareShare className="w-3 h-3 mr-2" /> Dive into Thread
        </Button>
      </Link>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary" />
    </div>
  );
}
