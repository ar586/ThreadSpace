"use client";

import { useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Node as APINode } from "./ChatArea";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Node as FlowNode,
  Edge as FlowEdge,
  MarkerType,
  ReactFlowInstance,
  Connection,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomThreadNode } from "./CustomThreadNode";
import { WorkspaceHeadNode } from "./WorkspaceHeadNode";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import dagre from "dagre";

const nodeTypes = {
  threadNode: CustomThreadNode,
  headNode: WorkspaceHeadNode,
};

// Extended API node to include positions
interface WorkspaceNode extends APINode {
  position_x: number;
  position_y: number;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}

import { useSWRConfig } from "swr";
import { useTheme } from "next-themes";

export function WorkbenchView({ workspaceId }: { workspaceId: string }) {
  const { resolvedTheme } = useTheme();
  const { mutate } = useSWRConfig();
  const { data: workspace } = useSWR<Workspace>(`/workspaces/${workspaceId}`, fetcher);
  const { data: rawNodes, error } = useSWR<WorkspaceNode[]>(`/nodes/workspace/${workspaceId}/all`, fetcher);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Listen for warp events
  useEffect(() => {
    const handleWarp = (e: CustomEvent) => {
      const { nodeId } = e.detail;
      if (!reactFlowInstance.current) return;
      
      const node = reactFlowInstance.current.getNode(nodeId);
      if (node) {
        // We add center offsets to frame the node nicely
        // A typical node is width 208, height 120.
        reactFlowInstance.current.setCenter(node.position.x + 104, node.position.y + 60, { zoom: 1.2, duration: 800 });
      }
    };
    
    window.addEventListener("warp-to-node" as any, handleWarp);
    return () => window.removeEventListener("warp-to-node" as any, handleWarp);
  }, []);

  // Synchronize backend data into React Flow state
  useEffect(() => {
    if (!rawNodes || !workspace) return;

    const dagreGraph = new dagre.graphlib.Graph();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const ranksep = isMobile ? 50 : 80;
    const nodesep = isMobile ? 80 : 150;
    const nodeWidth = isMobile ? 160 : 208;
    const nodeHeight = isMobile ? 100 : 120;
    const headWidth = isMobile ? 176 : 224;

    dagreGraph.setGraph({ rankdir: 'TB', ranksep, nodesep });

    // Add Workspace Head Node to dagre
    const headNodeId = "workspace-head";
    dagreGraph.setNode(headNodeId, { width: headWidth, height: 80 });

    // Add all nodes to dagre
    rawNodes.forEach(n => {
      dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight }); 
    });

    // Add all edges to dagre for layout calculation
    const flowEdges: FlowEdge[] = [];

    rawNodes.forEach((n) => {
      if (n.parent_id) {
        // Child node -> Link to its parent
        dagreGraph.setEdge(n.parent_id, n.id);
        flowEdges.push({
          id: `e-${n.parent_id}-${n.id}`,
          source: n.parent_id,
          target: n.id,
          type: "default",
          animated: true,
          style: { stroke: "#027eb5", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#027eb5" },
        });
      } else {
        // Root node -> Link to Workspace Head Node
        dagreGraph.setEdge(headNodeId, n.id);
        flowEdges.push({
          id: `e-head-${n.id}`,
          source: headNodeId,
          target: n.id,
          type: "default",
          animated: false,
          style: { stroke: "#8696a0", strokeWidth: 2, strokeDasharray: "5,5" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#8696a0" },
        });
      }
    });

    // Execute the layout calculation
    dagre.layout(dagreGraph);

    // Now extract positions and create React Flow nodes
    const headPos = dagreGraph.node(headNodeId);
    const headNode: FlowNode = {
      id: headNodeId,
      type: "headNode",
      position: { x: headPos.x - (headWidth / 2), y: headPos.y - 40 },
      draggable: false, // Fixed root
      data: { name: workspace.name },
    };

    const flowNodes: FlowNode[] = [headNode, ...rawNodes.map((n) => {
      const isUnpositioned = n.position_x === 0 && n.position_y === 0;
      let x = n.position_x;
      let y = n.position_y;

      if (isUnpositioned) {
        const dPos = dagreGraph.node(n.id);
        x = dPos.x - (nodeWidth / 2); 
        y = dPos.y - (nodeHeight / 2);  
      }

      return {
        id: n.id,
        type: "threadNode",
        position: { x, y },
        data: { id: n.id, content: n.content, audio_url: n.audio_url, preview_data: n.preview_data },
      };
    })];

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [rawNodes, workspace, setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    async (event: any, node: FlowNode) => {
      if (node.id === "workspace-head") return;
      try {
        await fetcher(`/nodes/${node.id}/position`, {
          method: "PATCH",
          body: JSON.stringify({
            position_x: node.position.x,
            position_y: node.position.y,
          }),
        });
      } catch (err) {
        console.error("Failed to save position", err);
      }
    },
    []
  );

  const handleAutoArrange = useCallback(async () => {
    if (!rawNodes || nodes.length === 0) return;
    
    // We already have the dagre positions calculated internally during useEffect,
    // but the easiest way is just to force all positions to 0 in the DB, then trigger a re-render.
    // Or simpler: run dagre again and PATCH all nodes.
    try {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const nodeWidth = isMobile ? 160 : 208;
      const nodeHeight = isMobile ? 100 : 120;
      const headWidth = isMobile ? 176 : 224;

      dagreGraph.setGraph({ rankdir: 'TB', ranksep: isMobile ? 50 : 80, nodesep: isMobile ? 80 : 150 });

      const headNodeId = "workspace-head";
      dagreGraph.setNode(headNodeId, { width: headWidth, height: 80 });
      rawNodes.forEach(n => dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight }));

      rawNodes.forEach((n) => {
        if (n.parent_id) dagreGraph.setEdge(n.parent_id, n.id);
        else dagreGraph.setEdge(headNodeId, n.id);
      });

      dagre.layout(dagreGraph);

      const updates = rawNodes.map(n => {
        const dPos = dagreGraph.node(n.id);
        const x = dPos.x - (nodeWidth / 2);
        const y = dPos.y - (nodeHeight / 2);
        return { node_id: n.id, position_x: x, position_y: y };
      });

      // Optimistically update rawNodes in cache
      mutate(`/nodes/workspace/${workspaceId}/all`, (current: any) => {
        if (!current) return current;
        return current.map((n: any) => {
          const update = updates.find(u => u.node_id === n.id);
          if (update) {
            return { ...n, position_x: update.position_x, position_y: update.position_y };
          }
          return n;
        });
      }, { revalidate: false });

      await fetcher(`/nodes/workspace/${workspaceId}/positions`, {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      });
      
    } catch (err) {
      console.error("Failed to auto arrange", err);
      mutate(`/nodes/workspace/${workspaceId}/all`); // Revert on error
    }
  }, [rawNodes, nodes, mutate, workspaceId]);

  const onConnect = useCallback(async (params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
    const parentId = params.source === "workspace-head" ? null : params.source;
    
    // Optimistic update of parent_id
    mutate(`/nodes/workspace/${workspaceId}/all`, (current: any) => {
      if (!current) return current;
      return current.map((n: any) => {
        if (n.id === params.target) {
          return { ...n, parent_id: parentId };
        }
        return n;
      });
    }, { revalidate: false });

    try {
      await fetcher(`/nodes/${params.target}/parent`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: parentId }),
      });
    } catch (err) {
      console.error(err);
      mutate(`/nodes/workspace/${workspaceId}/all`); // Revert on error
    }
  }, [setEdges, workspaceId, mutate]);

  const onEdgesDelete = useCallback(async (deletedEdges: FlowEdge[]) => {
    const updates = deletedEdges.map(edge => {
      if (edge.source === "workspace-head") return Promise.resolve(); // already root
      if (edge.target === "workspace-head") return Promise.resolve(); // not a real node
      return fetcher(`/nodes/${edge.target}/parent`, {
        method: "PATCH",
        body: JSON.stringify({ parent_id: null }),
      });
    });
    
    try {
      await Promise.all(updates);
      mutate(`/nodes/workspace/${workspaceId}/all`);
    } catch (err) {
      console.error(err);
    }
  }, [workspaceId, mutate]);

  const onNodesDelete = useCallback(async (deletedNodes: FlowNode[]) => {
    const nodeIdsToDelete = new Set<string>();
    deletedNodes.forEach(n => {
      if (n.id !== "workspace-head") {
        nodeIdsToDelete.add(n.id);
      }
    });

    if (nodeIdsToDelete.size === 0) return;

    const gatherDescendants = (parentId: string, toDelete: Set<string>) => {
      edges.forEach(edge => {
        if (edge.source === parentId && !toDelete.has(edge.target)) {
          toDelete.add(edge.target);
          gatherDescendants(edge.target, toDelete);
        }
      });
    };

    nodeIdsToDelete.forEach(id => gatherDescendants(id, nodeIdsToDelete));

    setEdges(eds => eds.filter(e => !nodeIdsToDelete.has(e.source) && !nodeIdsToDelete.has(e.target)));
    setNodes(nds => nds.filter(n => !nodeIdsToDelete.has(n.id)));

    deletedNodes.forEach(node => {
      if (node.id !== "workspace-head") {
        fetcher(`/nodes/${node.id}`, { method: "DELETE" }).catch(err => console.error(err));
      }
    });
  }, [edges, setNodes, setEdges]);

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-red-500">Failed to load Workbench.</div>;
  }

  if (!rawNodes) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full relative bg-muted/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        attributionPosition="bottom-right"
      >
        <Panel position="top-right" className="m-4">
          <Button onClick={handleAutoArrange} variant="secondary" className="shadow-md bg-background border border-border">
            Auto Arrange
          </Button>
        </Panel>
        <Background variant={"dots" as any} gap={24} size={1} />
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          nodeColor={(n) => n.type === 'headNode' ? '#8696a0' : '#027eb5'}
          maskColor="rgba(0, 0, 0, 0.5)"
          className="!w-24 !h-16 md:!w-48 md:!h-32 bg-card border border-border rounded-lg shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}
