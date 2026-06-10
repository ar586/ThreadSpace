"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import Link from "next/link";
import { ChevronRight, Home, Loader2, Network, MessageSquare, Search, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

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

  const router = useRouter();

  return (
    <div className="h-16 px-2 md:px-4 flex items-center justify-between bg-background border-b border-border sticky top-0 z-10 text-sm shrink-0">
      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto whitespace-nowrap flex-1 no-scrollbar">
        {/* Mobile Back Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden shrink-0 h-8 w-8 mr-1 text-muted-foreground"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Link
          href={`/w/${workspaceId}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          <Home className="w-4 h-4 hidden sm:block" />
          <span className="font-medium sm:font-normal">Root</span>
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

      {/* View Switcher & Search */}
      <div className="flex items-center gap-1 md:gap-2 ml-2 shrink-0">
        
        <div className="flex items-center bg-muted/50 rounded-lg p-1">
          <Button 
            variant={viewMode === "chat" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("chat")}
            className={`h-8 px-2 md:px-3 rounded-md transition-all ${viewMode === "chat" ? "shadow-sm" : "hover:bg-background/50 text-muted-foreground"}`}
            title="Chat View"
          >
            <MessageSquare className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Chat</span>
          </Button>
          <Button 
            variant={viewMode === "workbench" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("workbench")}
            className={`h-8 px-2 md:px-3 rounded-md transition-all ${viewMode === "workbench" ? "shadow-sm" : "hover:bg-background/50 text-muted-foreground"}`}
            title="Workbench View"
          >
            <Network className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Workbench</span>
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command'))}
          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground ml-1"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
