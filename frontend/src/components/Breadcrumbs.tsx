"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import Link from "next/link";
import { ChevronRight, Home, Loader2, Network, MessageSquare } from "lucide-react";
import { Button } from "./ui/button";

export interface BreadcrumbNode {
  id: string;
  content: string;
  parent_id: string | null;
  level: number;
}

export function Breadcrumbs({ 
  workspaceId, 
  nodeId, 
  viewMode, 
  setViewMode 
}: { 
  workspaceId: string; 
  nodeId?: string;
  viewMode: "chat" | "workbench";
  setViewMode: (v: "chat" | "workbench") => void;
}) {
  const { data: breadcrumbs, error } = useSWR<BreadcrumbNode[]>(
    nodeId ? `/nodes/${nodeId}/breadcrumbs` : null,
    fetcher
  );

  return (
    <div className="flex items-center justify-between p-4 bg-background border-b border-border sticky top-0 z-10 text-sm">
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap flex-1">
        <Link
          href={`/w/${workspaceId}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Root</span>
        </Link>

        {!breadcrumbs && !error && nodeId && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
        )}

        {breadcrumbs?.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const truncated = crumb.content.length > 30 ? crumb.content.substring(0, 30) + "..." : crumb.content;
          
          return (
            <div key={crumb.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              <Link
                href={`/w/${workspaceId}/n/${crumb.id}`}
                className={`${
                  isLast ? "text-foreground font-medium" : "text-muted-foreground hover:text-primary"
                } transition-colors`}
              >
                {truncated}
              </Link>
            </div>
          );
        })}
      </div>

      {/* View Switcher */}
      <div className="flex items-center bg-muted/50 rounded-lg p-1 ml-4 shrink-0">
        <Button 
          variant={viewMode === "chat" ? "default" : "ghost"} 
          size="sm" 
          onClick={() => setViewMode("chat")}
          className={`h-8 px-3 rounded-md transition-all ${viewMode === "chat" ? "shadow-sm" : "hover:bg-background/50 text-muted-foreground"}`}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat View
        </Button>
        <Button 
          variant={viewMode === "workbench" ? "default" : "ghost"} 
          size="sm" 
          onClick={() => setViewMode("workbench")}
          className={`h-8 px-3 rounded-md transition-all ${viewMode === "workbench" ? "shadow-sm" : "hover:bg-background/50 text-muted-foreground"}`}
        >
          <Network className="w-4 h-4 mr-2" />
          Workbench
        </Button>
      </div>
    </div>
  );
}
