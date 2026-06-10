import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CommandMenu } from "@/components/CommandMenu";
import { SWRProvider } from "@/components/SWRProvider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeae2" },
    { media: "(prefers-color-scheme: dark)", color: "#0b141a" },
  ],
};

export const metadata: Metadata = {
  title: "ThreadSpace",
  description: "A collaborative workspace for non-linear thinking.",
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
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} flex h-[100dvh] bg-background text-foreground overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SWRProvider>
              <CommandMenu />
              {children}
            </SWRProvider>
          </AuthProvider>
        </ThemeProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
