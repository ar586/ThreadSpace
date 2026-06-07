"use client";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChatArea } from "@/components/ChatArea";
import { MessageInput } from "@/components/MessageInput";
import { useState, use } from "react";

export default function WorkspaceRootPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const [mutateKey, setMutateKey] = useState(0);

  const handleMessageSent = () => {
    setMutateKey(k => k + 1);
  };

  return (
    <>
      <Breadcrumbs workspaceId={workspaceId} />
      <ChatArea workspaceId={workspaceId} shouldMutate={mutateKey} />
      <MessageInput workspaceId={workspaceId} onMessageSent={handleMessageSent} />
    </>
  );
}
