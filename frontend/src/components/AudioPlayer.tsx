"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const API_HOST = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : "http://localhost:8000";

export function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fullSrc = src.startsWith("http") ? src : `${API_HOST}${src}`;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [isDragging]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekTo = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = ratio * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  // Handle pointer drag on the progress bar
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      seekTo(e as unknown as React.MouseEvent<HTMLDivElement>);
    },
    [seekTo]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      seekTo(e as unknown as React.MouseEvent<HTMLDivElement>);
    },
    [isDragging, seekTo]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3 w-full min-w-[220px] max-w-[320px] px-3 py-2.5 rounded-xl bg-[#d9fdd3]/80 dark:bg-[#005c4b]/60 backdrop-blur-sm select-none">
      <audio
        ref={audioRef}
        src={fullSrc}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 shrink-0 rounded-full bg-white/90 dark:bg-white/20 flex items-center justify-center text-[#027eb5] dark:text-[#53bdeb] hover:scale-105 active:scale-95 transition-transform shadow-sm"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Timeline */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 w-full rounded-full bg-black/10 dark:bg-white/15 cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Filled track */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[#027eb5] dark:bg-[#53bdeb] transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#027eb5] dark:bg-[#53bdeb] shadow-md transition-[left] duration-75"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-[10px] text-[#667781] dark:text-[#8696a0] font-mono tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration - currentTime)}</span>
        </div>
      </div>
    </div>
  );
}
