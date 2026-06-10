"use client";

import { fetcher, API_BASE_URL } from "@/lib/api";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSWRConfig } from "swr";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { SendHorizontal, Mic, X, Square } from "lucide-react";

export function MessageInput({ 
  workspaceId, 
  parentId,
  onMessageSent 
}: { 
  workspaceId: string; 
  parentId?: string;
  onMessageSent: () => void;
}) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { mutate } = useSWRConfig();

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const messageContent = content.trim();
    setContent("");

    // Optimistic UI Update
    const optimisticNode = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      workspace_id: workspaceId,
      parent_id: parentId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const cacheKey = parentId ? `/nodes/${parentId}/children` : `/nodes/workspace/${workspaceId}/root`;
    
    mutate(cacheKey, (currentNodes: any) => {
      if (!currentNodes) return [optimisticNode];
      return [...currentNodes, optimisticNode];
    }, { revalidate: false });

    setIsSending(true);
    try {
      const created = await fetcher("/nodes", {
        method: "POST",
        body: JSON.stringify({
          content: messageContent,
          workspace_id: workspaceId,
          parent_id: parentId || null,
        }),
      });
      
      // Update cache with real node
      mutate(cacheKey, (currentNodes: any) => {
        if (!currentNodes) return [created];
        return currentNodes.map((n: any) => n.id === optimisticNode.id ? created : n);
      }, { revalidate: false });
      
      onMessageSent();
    } catch (err) {
      console.error(err);
      // Revert optimistic update on error
      mutate(cacheKey);
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100); // collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, []);

  const stopAndCleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    chunksRef.current = [];
    stopAndCleanup();
  }, [stopAndCleanup]);

  const sendRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];

      if (blob.size === 0) {
        stopAndCleanup();
        return;
      }

      setIsSending(true);
      try {
        const formData = new FormData();
        formData.append("file", blob, "voice-note.webm");
        formData.append("workspace_id", workspaceId);
        if (parentId) formData.append("parent_id", parentId);

        // Use raw fetch because fetcher adds Content-Type: application/json
        const res = await fetch(`${API_BASE_URL}/nodes/audio`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

        onMessageSent();
      } catch (err) {
        console.error("Failed to upload voice note:", err);
      } finally {
        setIsSending(false);
      }
    };

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    stopAndCleanup();
  }, [workspaceId, parentId, onMessageSent, stopAndCleanup]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Recording UI
  if (isRecording) {
    return (
      <div className="p-4 bg-background border-t border-border sticky bottom-0">
        <div className="flex items-center gap-3 w-full">
          {/* Cancel Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="shrink-0 h-10 w-10 rounded-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Recording indicator */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20">
            {/* Pulsing red dot */}
            <div className="relative shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            </div>

            {/* Timer */}
            <span className="text-sm font-mono tabular-nums text-foreground font-medium tracking-wide">
              {formatTime(recordingTime)}
            </span>

            {/* Waveform visualization bars */}
            <div className="flex-1 flex items-center justify-center gap-[3px] h-6 overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-red-400/60 dark:bg-red-400/40"
                  style={{
                    height: `${Math.max(4, Math.random() * 20 + 4)}px`,
                    animation: `pulse ${0.5 + Math.random() * 0.8}s ease-in-out ${Math.random() * 0.5}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Send Button */}
          <Button
            type="button"
            onClick={sendRecording}
            disabled={isSending}
            className="shrink-0 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-0"
          >
            <SendHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Normal text input UI
  return (
    <div className="p-4 bg-background border-t border-border sticky bottom-0">
      <form onSubmit={handleSubmit} className="flex gap-3 w-full">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message here..."
          className="resize-none min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        {content.trim() ? (
          <Button 
            type="submit" 
            disabled={isSending}
            className="h-auto px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <SendHorizontal className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={startRecording}
            className="h-auto px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </form>
    </div>
  );
}
