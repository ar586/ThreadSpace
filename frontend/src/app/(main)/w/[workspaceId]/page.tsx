"use client";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChatArea } from "@/components/ChatArea";
import { MessageInput } from "@/components/MessageInput";
import { WorkbenchView } from "@/components/WorkbenchView";
import { useState, use } from "react";

export default function WorkspaceRootPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const [mutateKey, setMutateKey] = useState(0);
  const [viewMode, setViewMode] = useState<"chat" | "workbench">("chat");

  const handleMessageSent = () => {
    setMutateKey(k => k + 1);
  };

  return (
    <>
      <Breadcrumbs workspaceId={workspaceId} viewMode={viewMode} setViewMode={setViewMode} />
      {viewMode === "chat" ? (
        <>
          <ChatArea workspaceId={workspaceId} shouldMutate={mutateKey} />
          <MessageInput workspaceId={workspaceId} onMessageSent={handleMessageSent} />
        </>
      ) : (
        <WorkbenchView workspaceId={workspaceId} />
      )}
    </>
  );
}
