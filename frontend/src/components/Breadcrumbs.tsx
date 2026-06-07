"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import Link from "next/link";
import { ChevronRight, Home, Loader2 } from "lucide-react";

export interface BreadcrumbNode {
  id: string;
  content: string;
  parent_id: string | null;
  level: number;
}

export function Breadcrumbs({ workspaceId, nodeId }: { workspaceId: string; nodeId?: string }) {
  const { data: breadcrumbs, error } = useSWR<BreadcrumbNode[]>(
    nodeId ? `/nodes/${nodeId}/breadcrumbs` : null,
    fetcher
  );

  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b sticky top-0 z-10 text-sm overflow-x-auto whitespace-nowrap">
      <Link
        href={`/w/${workspaceId}`}
        className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Root</span>
      </Link>

      {!breadcrumbs && !error && nodeId && (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-2" />
      )}

      {breadcrumbs?.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        // The array is ordered level DESC, which means root is first, leaf is last.
        // Truncate content to 20 chars
        const truncated = crumb.content.length > 30 ? crumb.content.substring(0, 30) + "..." : crumb.content;
        
        return (
          <div key={crumb.id} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <Link
              href={`/w/${workspaceId}/n/${crumb.id}`}
              className={`${
                isLast ? "text-slate-900 font-medium" : "text-slate-500 hover:text-indigo-600"
              } transition-colors`}
            >
              {truncated}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
