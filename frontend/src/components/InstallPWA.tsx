"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "./ui/button";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!isInstallable) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleInstallClick}
      title="Install App"
      className="text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <Download className="w-4 h-4" />
    </Button>
  );
}
