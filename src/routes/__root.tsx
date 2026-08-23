import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { PresenceProvider } from "@/lib/presence";
import { NotificationsProvider } from "@/lib/notifications";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/int/pwa-install-prompt";
import { FloatingMoveableChatButton } from "@/components/int/floating-chat-button";

function NotFoundComponent() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center rounded-3xl border border-border bg-card p-8 shadow-2xl space-y-6">
        <div className="flex justify-center">
          <img src="/logo.png" alt="INT" className="h-14 w-14 object-contain bg-white rounded-2xl p-1.5 shadow-md border border-border" />
        </div>
        <div>
          <span className="rounded-full bg-primary/10 px-3.5 py-1 text-xs font-extrabold text-primary border border-primary/20 tracking-wider uppercase">
            Navigation Fallback
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground">Page Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The requested page is unavailable or the link may have been updated.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
          <Link
            to="/"
            className="flex items-center justify-center rounded-xl bg-primary py-2.5 px-4 text-primary-foreground shadow-sm hover:bg-tech transition-colors"
          >
            Home Portal
          </Link>
          <Link
            to="/events"
            className="flex items-center justify-center rounded-xl border border-border bg-secondary py-2.5 px-4 text-foreground hover:bg-accent transition-colors"
          >
            All Events
          </Link>
          <Link
            to="/admin"
            className="flex items-center justify-center rounded-xl border border-border bg-secondary py-2.5 px-4 text-foreground hover:bg-accent transition-colors"
          >
            Admin Panel
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center rounded-xl border border-border bg-muted/60 py-2.5 px-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            Go Back &larr;
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Application runtime error:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Register Service Worker for PWA offline support and caching
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("PWA Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PresenceProvider>
          <NotificationsProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <PWAInstallPrompt />
            <FloatingMoveableChatButton />
            <Toaster position="top-center" richColors />
          </NotificationsProvider>
        </PresenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}


