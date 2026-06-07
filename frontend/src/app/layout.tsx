import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ThreadSpace",
  description: "Infinitely nested conversational note-taking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen bg-white text-slate-900 overflow-hidden`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen relative">
          {children}
        </main>
      </body>
    </html>
  );
}
