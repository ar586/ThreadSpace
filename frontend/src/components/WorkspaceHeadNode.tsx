import { Handle, Position } from "@xyflow/react";

export function WorkspaceHeadNode({ data }: { data: any }) {
  return (
    <div className="bg-card dark:bg-[#111b21] border-2 border-border shadow-md rounded-xl p-4 w-[140px] md:w-[224px] relative text-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
      <div className="text-sm font-bold text-primary uppercase tracking-widest mb-1">
        Workspace
      </div>
      <div className="text-xl font-extrabold text-foreground tracking-tight">
        {data.name}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-primary border-2 !border-background" />
    </div>
  );
}
