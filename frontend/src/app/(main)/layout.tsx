"use client";

import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in AuthContext
  }

  const isRoot = pathname === "/";

  return (
    <>
      <div className={`${isRoot ? "flex" : "hidden"} md:flex w-full md:w-80 shrink-0 h-[100dvh]`}>
        <Sidebar />
      </div>
      <main className={`${isRoot ? "hidden" : "flex"} md:flex flex-1 flex-col h-[100dvh] relative w-full`}>
        {children}
      </main>
    </>
  );
}
