"use client";

import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{ 
        revalidateOnFocus: false, // Don't spam requests when switching tabs
        dedupingInterval: 10000, // Only refetch the same key once every 10 seconds
        keepPreviousData: true, // Keep showing old data while new data fetches
      }}
    >
      {children}
    </SWRConfig>
  );
}
