import { useState, useRef, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { IntLogo } from "./logo";

export function FloatingMoveableChatButton() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Don't show floating button if already on chat page
  const isChatRoute = currentPath.startsWith("/chat") || currentPath.startsWith("/admin/chat");

  // Position state (default: bottom-24 right-4)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPosX: number; startPosY: number }>({
    x: 0,
    y: 0,
    startPosX: 0,
    startPosY: 0,
  });
  const hasMovedRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Initialize position on mobile mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const initialX = window.innerWidth - 110;
      const initialY = window.innerHeight - 150;
      setPosition({ x: Math.max(16, initialX), y: Math.max(80, initialY) });
    }
  }, []);

  if (isChatRoute || !position) return null;

  const chatDestination = user?.role === "admin" ? "/admin/chat" : "/chat";
  const unreadChatNotifs = notifications.filter((n) => n.tone === "chat" && !n.read).length;

  // Touch Handlers for Dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !isDragging) return;

    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      hasMovedRef.current = true;
    }

    const newX = Math.min(Math.max(12, dragStartRef.current.startPosX + deltaX), window.innerWidth - 110);
    const newY = Math.min(Math.max(70, dragStartRef.current.startPosY + deltaY), window.innerHeight - 110);

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse Handlers for Desktop Simulation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      const deltaY = moveEvent.clientY - dragStartRef.current.y;

      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        hasMovedRef.current = true;
      }

      const newX = Math.min(Math.max(12, dragStartRef.current.startPosX + deltaX), window.innerWidth - 110);
      const newY = Math.min(Math.max(70, dragStartRef.current.startPosY + deltaY), window.innerHeight - 110);

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={buttonRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className={`fixed z-50 md:hidden select-none cursor-grab active:cursor-grabbing rounded-full transition-transform duration-150 ${
        isDragging ? "scale-105 opacity-90" : ""
      }`}
    >
      <Link
        to={chatDestination}
        onClick={(e) => {
          if (hasMovedRef.current) {
            e.preventDefault();
          }
        }}
        className="flex items-center gap-2 rounded-full border border-primary/40 bg-card/95 pl-1 pr-3.5 py-1 backdrop-blur-md shadow-xl transition-all active:scale-95 overflow-hidden"
      >
        {/* INT Logo Icon */}
        <div className="relative flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white p-0.5 border border-primary/30 shadow-xs shrink-0 overflow-hidden">
          <img
            src="/logo.png"
            alt="INT Chat"
            className="h-full w-full object-contain"
          />
          {/* Live pulse dot */}
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-black animate-pulse" />
        </div>

        {/* Small Text */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-black tracking-tight text-foreground">Chat</span>
          {unreadChatNotifs > 0 && (
            <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground shadow-xs">
              {unreadChatNotifs}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
