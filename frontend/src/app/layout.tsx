import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CommandMenu } from "@/components/CommandMenu";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#027eb5",
};

export const metadata: Metadata = {
  title: "ThreadSpace",
  description: "Infinitely nested conversational note-taking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ThreadSpace",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex h-screen bg-background text-foreground overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CommandMenu />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
