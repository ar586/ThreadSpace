"use client";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChatArea } from "@/components/ChatArea";
import { MessageInput } from "@/components/MessageInput";
import { WorkbenchView } from "@/components/WorkbenchView";
import { useState, use } from "react";

export default function NodeThreadPage({ params }: { params: Promise<{ workspaceId: string, nodeId: string }> }) {
  const { workspaceId, nodeId } = use(params);
  const [mutateKey, setMutateKey] = useState(0);
  const [viewMode, setViewMode] = useState<"chat" | "workbench">("chat");

  const handleMessageSent = () => {
    setMutateKey(k => k + 1);
  };

  return (
    <>
      <Breadcrumbs workspaceId={workspaceId} nodeId={nodeId} viewMode={viewMode} setViewMode={setViewMode} />
      {viewMode === "chat" ? (
        <>
          <ChatArea workspaceId={workspaceId} nodeId={nodeId} shouldMutate={mutateKey} />
          <MessageInput workspaceId={workspaceId} parentId={nodeId} onMessageSent={handleMessageSent} />
        </>
      ) : (
        <WorkbenchView workspaceId={workspaceId} />
      )}
    </>
  );
}
