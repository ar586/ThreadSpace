"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetcher, ApiError } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const data = await fetcher<User>("/auth/me");
      setUser(data);
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && error.status === 401) {
        if (!pathname.startsWith("/login") && !pathname.startsWith("/register")) {
          router.push("/login");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const logout = async () => {
    try {
      await fetcher("/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
