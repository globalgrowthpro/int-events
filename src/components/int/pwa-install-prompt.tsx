import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, Sparkles, CheckCircle2 } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PWAInstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isDismissed,
    isIOS,
    canPromptDirectly,
    promptInstall,
    dismissPrompt,
  } = usePwaInstall();

  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Delay prompt appearance slightly for a better, non-intrusive user experience
    if (isInstallable && !isDismissed && !isInstalled) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
    setShowBanner(false);
    return undefined;
  }, [isInstallable, isDismissed, isInstalled]);

  if (!showBanner && !showIosModal) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }

    if (canPromptDirectly) {
      setInstalling(true);
      try {
        const result = await promptInstall();
        if (result === "accepted") {
          setInstalledSuccess(true);
          setTimeout(() => {
            setShowBanner(false);
          }, 3000);
        }
      } finally {
        setInstalling(false);
      }
    } else {
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    dismissPrompt();
  };

  return (
    <>
      {/* Floating Install Prompt Banner */}
      {showBanner && (
        <aside
          role="region"
          aria-label="Install INT Events Application"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-in fade-in-0 slide-in-from-bottom-6 duration-300"
        >
          <div className="relative flex flex-col gap-3 rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Dismiss installation prompt"
            >
              <X className="h-4 w-4" />
            </button>

            {/* App Icon */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-1.5 ring-1 ring-white/15 shadow-inner">
              <img
                src="/icons/icon-192.png"
                alt="INT Events App Icon"
                width={56}
                height={56}
                className="h-full w-full rounded-lg object-cover"
                onError={(e) => {
                  // Fallback if png is not yet loaded
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-3 w-3" />
              </span>
            </div>

            {/* Content Text */}
            <div className="min-w-0 flex-1 pr-6 sm:pr-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Install INT Events
                </h2>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  PWA
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                Get offline access to your event passes, check-in QR codes, and instant updates.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:shrink-0">
              {installedSuccess ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Installed!
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismiss}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Not Now
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    disabled={installing}
                    className="h-8 gap-1.5 bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {installing ? "Installing..." : "Install App"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* iOS Safari Step-by-Step Installation Modal */}
      <Dialog open={showIosModal} onOpenChange={setShowIosModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Install INT Events on iOS
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Follow these simple steps in Safari to add INT Events to your home screen:
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 space-y-3.5 rounded-xl border border-border/80 bg-accent/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Tap the Share button</p>
                <p className="mt-0.5 text-muted-foreground flex items-center gap-1">
                  Located at the bottom of Safari <Share className="inline h-3.5 w-3.5 text-primary" />
                </p>
              </div>
            </div>

            <div className="border-t border-border/60" />

            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Select "Add to Home Screen"</p>
                <p className="mt-0.5 text-muted-foreground flex items-center gap-1">
                  Scroll down the share sheet and tap <PlusSquare className="inline h-3.5 w-3.5 text-primary" /> Add to Home Screen
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              className="w-full"
              onClick={() => {
                setShowIosModal(false);
                setShowBanner(false);
                dismissPrompt();
              }}
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Dedicated Header / Sidebar Install Button for manual installation triggers
 */
export function PWAInstallButton({
  variant = "outline",
  size = "sm",
  className = "",
  showText = true,
}: {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}) {
  const { isInstallable, isInstalled, isIOS, canPromptDirectly, promptInstall } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS || !canPromptDirectly) {
      setShowIosGuide(true);
    } else {
      await promptInstall();
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
        title="Install INT Events application"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        {showText && <span>Install App</span>}
      </Button>

      {/* iOS Modal for manual trigger */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Install INT Events
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              To install this application on your iPhone or iPad:
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 space-y-3.5 rounded-xl border border-border/80 bg-accent/30 p-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-semibold text-foreground">Tap Safari's Share button</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  At bottom of screen <Share className="inline h-3.5 w-3.5 text-primary" />
                </p>
              </div>
            </div>
            <div className="border-t border-border/60" />
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </div>
              <div>
                <p className="font-semibold text-foreground">Tap "Add to Home Screen"</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  Tap <PlusSquare className="inline h-3.5 w-3.5 text-primary" /> Add to Home Screen to install
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={() => setShowIosGuide(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
