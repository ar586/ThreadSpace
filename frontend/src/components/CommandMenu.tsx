"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search } from "lucide-react";

interface NodeSearchResult {
  id: string;
  content: string;
  parent_id: string | null;
  breadcrumb: string;
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  // Extract workspaceId from URL
  const match = pathname?.match(/\/w\/([^/]+)/);
  const workspaceId = match ? match[1] : null;

  // Listen for Cmd+K / Ctrl+K and custom event
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    const customOpen = () => setOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-command", customOpen);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command", customOpen);
    };
  }, []);

  // Fetch workspaces for global navigation
  const { data: workspaces } = useSWR<any[]>("/workspaces", fetcher);

  // Fetch results based on query if we are in a workspace
  const { data: results, error } = useSWR<NodeSearchResult[]>(
    workspaceId && query.length > 0 
      ? `/nodes/workspace/${workspaceId}/search?q=${encodeURIComponent(query)}` 
      : null,
    fetcher
  );

  const handleSelect = (result: NodeSearchResult) => {
    setOpen(false);
    
    const targetUrl = result.parent_id 
      ? `/w/${workspaceId}/n/${result.parent_id}?highlight=${result.id}`
      : `/w/${workspaceId}?highlight=${result.id}`;

    // 1. Dispatch custom event for Workbench (if active)
    window.dispatchEvent(new CustomEvent('warp-to-node', { detail: { nodeId: result.id } }));
    
    // 2. Route for Chat View (will also trigger highlight if in Chat View)
    router.push(targetUrl);
  };

  const filteredWorkspaces = workspaces?.filter(w => w.name.toLowerCase().includes(query.toLowerCase())) || [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command shouldFilter={false}>
        <CommandInput 
          placeholder={workspaceId ? "Search notes & workspaces..." : "Search workspaces..."} 
          value={query} 
          onValueChange={setQuery} 
        />
        <CommandList>
          <CommandEmpty>
            {error ? "Error fetching results." : query.length > 0 ? "No results found." : "Type to search..."}
          </CommandEmpty>
          
          {/* Workspaces Group */}
          {filteredWorkspaces.length > 0 && (
            <CommandGroup heading="Workspaces">
              {filteredWorkspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.id}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/w/${workspace.id}`);
                  }}
                  className="flex items-center py-3"
                >
                  <Search className="mr-2 h-4 w-4 opacity-50" />
                  <span className="font-medium text-foreground">{workspace.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded-md">Workspace</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Notes Group */}
          {results && results.length > 0 && (
            <CommandGroup heading="Notes">
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() => handleSelect(result)}
                  className="flex flex-col items-start py-3"
                >
                  <div className="flex items-center w-full">
                    <Search className="mr-2 h-4 w-4 opacity-50" />
                    <span className="font-medium text-foreground">{result.content}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 ml-6 truncate w-full">
                    {result.breadcrumb}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
