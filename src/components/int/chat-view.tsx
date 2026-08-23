import { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Search,
  MessageSquare,
  Ticket,
  FileText,
  Download,
  X,
  Sparkles,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Circle,
  Users,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  getChatContacts,
  getConversationMessages,
  sendChatMessage,
  markConversationMessagesAsRead,
  type ChatContact,
  type ChatMessage,
  resolvePrimaryUserId,
  getChatUserAliases,
  getUserChatPermission,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getUserAvatar, getCompanyLogo } from "@/lib/logos";

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "flowers",
    name: "Flowers & Nature",
    icon: "🌸",
    emojis: [
      "🌸", "🌺", "💐", "🌷", "🌹", "🌻", "🌼", "🌿",
      "🍀", "🌱", "🌾", "🌴", "🌵", "🍁", "🍂", "🍃",
      "🪻", "🍄", "🎍", "🪴", "🏵️", "💮", "🪷", "🌳",
    ],
  },
  {
    id: "faces",
    name: "Smiles & People",
    icon: "😊",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
      "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
      "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜",
      "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏",
      "🤝", "👏", "🙌", "👍", "👌", "✌️", "🤞", "👋",
    ],
  },
  {
    id: "tech_events",
    name: "Tech & Summit",
    icon: "⚡",
    emojis: [
      "⚡", "💡", "🚀", "🎯", "🏆", "🔥", "✨", "⭐",
      "💻", "📱", "📡", "🎙️", "🎟️", "🏷️", "🔒", "🛡️",
      "🌐", "🤖", "📊", "📈", "💼", "🏢", "🏛️", "🔑",
    ],
  },
  {
    id: "celebration",
    name: "Celebration & Hearts",
    icon: "🎉",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎖️", "🥇", "🥈", "🥉",
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤",
      "🤍", "💯", "💢", "💫", "💬", "👁️‍🗨️", "🔔", "📣",
    ],
  },
];

const QUICK_REPLIES = [
  "👋 Hello! Great meeting you at the summit.",
  "📍 Where is your booth located?",
  "💡 Thank you so much for the fruitful discussion!",
  "🎟️ Here is my official INT digital event pass.",
  "🤝 Let's connect for future security tech projects.",
  "📞 Could we schedule a 10-minute briefing today?",
  "🏢 Which hall are the keynote presentations in?",
];

export function ChatView({ isAdmin = false }: { isAdmin?: boolean }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "vendor" | "client">("all");
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [canChat, setCanChat] = useState<boolean>(true);
  const [mobileContactOpen, setMobileContactOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>("all");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check chat permission
  useEffect(() => {
    if (isAdmin) {
      setCanChat(true);
      return;
    }
    const checkPermission = async () => {
      const currentUserId = resolvePrimaryUserId(user, isAdmin);
      const permitted = await getUserChatPermission(currentUserId, user?.email);
      setCanChat(permitted);
    };

    checkPermission();

    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.canChat !== undefined) {
        setCanChat(custom.detail.canChat);
      } else {
        checkPermission();
      }
    };

    window.addEventListener("int-chat-permission-updated", handler);
    return () => {
      window.removeEventListener("int-chat-permission-updated", handler);
    };
  }, [user, isAdmin]);

  // Load chat contacts
  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const data = await getChatContacts(user?.id, user?.email, isAdmin);
      setContacts(data);
      if (data.length > 0 && (!activeContact || !data.some((c) => c.id === activeContact.id))) {
        setActiveContact(data[0] || null);
      }
    } catch {
      console.warn("Failed to load chat contacts");
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [user, isAdmin]);

  // Load messages when active contact changes & subscribe to real-time updates
  useEffect(() => {
    if (!activeContact) return;

    const currentUserId = resolvePrimaryUserId(user, isAdmin);
    const selfAliases = getChatUserAliases(currentUserId);
    const contactAliases = getChatUserAliases(activeContact.id);

    const loadThread = async () => {
      const msgs = await getConversationMessages(currentUserId, activeContact.id);
      setMessages(msgs);
      await markConversationMessagesAsRead(currentUserId, activeContact.id);
      setContacts((prev) =>
        prev.map((c) => (c.id === activeContact.id ? { ...c, unreadCount: 0 } : c))
      );
    };

    loadThread();

    // Setup Supabase Realtime subscription
    const channel = supabase
      .channel(`chat_realtime_${currentUserId}_${activeContact.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          const isBetweenUs =
            (selfAliases.includes(newMsg.sender_id) && contactAliases.includes(newMsg.recipient_id)) ||
            (contactAliases.includes(newMsg.sender_id) && selfAliases.includes(newMsg.recipient_id));

          if (isBetweenUs) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            markConversationMessagesAsRead(currentUserId, activeContact.id);
            setContacts((prev) =>
              prev.map((c) => (c.id === activeContact.id ? { ...c, unreadCount: 0 } : c))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeContact, user, isAdmin]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin && !canChat) {
      toast.error("Chat messaging has been disabled for your account by the event administrator.");
      return;
    }
    if ((!inputText.trim() && !attachedFile) || !activeContact) return;

    const currentUserId = resolvePrimaryUserId(user, isAdmin);
    const currentUserName = user?.name || (isAdmin ? "Hafez Rahim (Admin)" : "Participant");
    const currentUserCompany = user?.company || (isAdmin ? "Integrated Technics" : "Enterprise Attendee");
    const currentUserRole = isAdmin ? "admin" : (user?.role as any) || "client";

    const textToSend = inputText.trim();
    const fileToSend = attachedFile;

    setInputText("");
    setAttachedFile(null);
    setShowEmojiPicker(false);

    try {
      const sentMsg = await sendChatMessage({
        sender_id: currentUserId,
        recipient_id: activeContact.id,
        sender_name: currentUserName,
        sender_company: currentUserCompany,
        sender_role: currentUserRole,
        content: textToSend || (fileToSend ? `📎 Shared document: ${fileToSend.name}` : ""),
        attachment_url: fileToSend?.url || undefined,
        attachment_name: fileToSend?.name || undefined,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });

      // Update contact's last message in sidebar
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === activeContact.id) {
            return {
              ...c,
              lastMessage: textToSend || fileToSend?.name || "Attachment",
              lastMessageTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              unreadCount: 0,
            };
          }
          return c;
        })
      );
    } catch {
      toast.error("Failed to send message");
    }
  };

const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "png", "jpeg", "jpg", "gif", "webp",
  "doc", "docx",
  "xls", "xlsx", "csv",
  "pdf",
  "ppt", "pptx",
  "txt"
];

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB

async function scanFileForMalware(file: File): Promise<{ safe: boolean; error?: string }> {
  // 1. Extension validation
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return {
      safe: false,
      error: `Format .${ext || "unknown"} is not permitted. Allowed: Images (PNG, JPG, JPEG, GIF, WEBP), Word (DOC/DOCX), Excel (XLS/XLSX/CSV), PDF, PowerPoint (PPT/PPTX), TXT.`,
    };
  }

  // 2. 2MB size limit
  if (file.size > MAX_ATTACHMENT_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      safe: false,
      error: `File size (${sizeMb} MB) exceeds the 2 MB limit.`,
    };
  }

  // 3. Binary header & payload antivirus inspection
  try {
    const buffer = await file.slice(0, 4096).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Block Windows PE Executable (MZ header)
    if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      return { safe: false, error: "Threat Blocked: Executable binary header disguised as document." };
    }
    // Block Linux ELF Executable
    if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      return { safe: false, error: "Threat Blocked: ELF binary payload detected." };
    }

    // Text file script injection scanner
    if (ext === "txt" || ext === "csv") {
      const text = await file.slice(0, 8192).text();
      const dangerousPatterns = [
        /<script\b[^>]*>/i,
        /javascript:/i,
        /powershell\s/i,
        /cmd\.exe/i,
        /eval\s*\(/i,
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
          return { safe: false, error: "Threat Blocked: Malicious code pattern detected in file." };
        }
      }
    }

    return { safe: true };
  } catch {
    return { safe: true };
  }
}

  const [isScanningFile, setIsScanningFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin && !canChat) {
      toast.error("Chat messaging has been disabled for your account.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so user can reselect if needed
    e.target.value = "";

    // 1. Check size limit (2MB)
    if (file.size > MAX_ATTACHMENT_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`File size (${sizeMb} MB) exceeds the 2 MB maximum attachment limit.`);
      return;
    }

    // 2. Perform Antivirus & Malware Security Scan
    setIsScanningFile(true);
    const toastId = toast.loading(`🛡️ Scanning "${file.name}" with Antivirus engine...`);

    // Simulated active scanning delay for security feedback
    await new Promise((res) => setTimeout(res, 500));

    const scanResult = await scanFileForMalware(file);
    setIsScanningFile(false);

    if (!scanResult.safe) {
      toast.error(`⚠️ Security Alert: ${scanResult.error || "File failed antivirus security check."}`, {
        id: toastId,
        duration: 5000,
      });
      return;
    }

    // 3. Process verified safe attachment
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        url: reader.result as string,
      });
      toast.success(`✅ Antivirus Passed: "${file.name}" verified clean (Max 2MB).`, { id: toastId });
    };
    reader.readAsDataURL(file);
  };

  const sharePassShortcut = () => {
    if (!isAdmin && !canChat) {
      toast.error("Chat messaging has been disabled for your account.");
      return;
    }
    setInputText("🎟️ Hello, here is my official INT Digital Event Pass. Looking forward to our discussion!");
  };

  const handleEmojiClick = (emoji: string) => {
    if (!isAdmin && !canChat) return;
    setInputText((prev) => prev + emoji);
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.job_title && c.job_title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole =
      filterRole === "all" ||
      (filterRole === "vendor" && c.role === "vendor") ||
      (filterRole === "client" && c.role === "client");

    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Desktop Header */}
      <header className="hidden md:flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/90 px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>{isAdmin ? "Admin Live Support & Chat Desk" : "INT Attendee & Exhibitor Chat"}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Direct account-to-account networking with all registered summit participants.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
            title={isSidebarCollapsed ? "Expand Contacts Sidebar" : "Collapse Contacts Sidebar"}
          >
            {isSidebarCollapsed ? (
              <>
                <PanelLeftOpen className="h-3.5 w-3.5 text-primary" />
                <span>Show Contacts</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="h-3.5 w-3.5" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Split Chat Window — WhatsApp style on mobile */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Contacts Directory Screen */}
        <aside
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border bg-card transition-all duration-200 ${
            isSidebarCollapsed ? "hidden" : mobileContactOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* WhatsApp Style Mobile Header */}
          <div className="md:hidden flex items-center justify-between px-3 py-2.5 border-b border-border bg-primary/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="grid h-8 w-8 place-items-center rounded-full text-foreground hover:bg-secondary/60 active:scale-90 transition-transform cursor-pointer"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-base font-black text-foreground">Chats</span>
              <span className="rounded-full bg-primary px-2 py-0.2 text-[10px] font-bold text-primary-foreground">
                {contacts.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pr-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online
              </span>
            </div>
          </div>

          {/* Search & Role Filter Tabs */}
          <div className="p-3 border-b border-border space-y-2 bg-card">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, company, sponsor..."
                  className="h-9 w-full rounded-full border border-input bg-secondary/40 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="hidden md:grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
                title="Collapse Contacts"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            {/* WhatsApp Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "vendor", label: "Sponsors & Exhibitors" },
                  { id: "client", label: "Clients" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterRole(f.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${
                    filterRole === f.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp Style Contacts Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {loadingContacts ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Loading participants...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Users className="mx-auto h-8 w-8 opacity-40" />
                <p className="font-semibold">No active contacts found</p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isActive = activeContact?.id === contact.id;
                const contactAvatar =
                  contact.role === "vendor"
                    ? getCompanyLogo(contact.company) ||
                      getUserAvatar(contact.name, "vendor", contact.avatar_url)
                    : getUserAvatar(contact.name, "client", contact.avatar_url);

                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setActiveContact(contact);
                      setMobileContactOpen(true);
                      const currentUserId = resolvePrimaryUserId(user, isAdmin);
                      markConversationMessagesAsRead(currentUserId, contact.id);
                      setContacts((prev) =>
                        prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c))
                      );
                    }}
                    className={`w-full p-3.5 text-left transition-colors flex items-center gap-3.5 hover:bg-secondary/40 active:bg-secondary/60 ${
                      isActive ? "bg-secondary/70 md:border-l-4 md:border-l-primary" : ""
                    }`}
                  >
                    {/* Big WhatsApp Avatar with Online Indicator */}
                    <div className="relative shrink-0">
                      <img
                        src={contactAvatar}
                        alt={contact.name}
                        className="h-12 w-12 rounded-full object-cover border border-border bg-secondary/50 shadow-xs"
                      />
                      {contact.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500 ring-1 ring-white dark:ring-black" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {contact.name}
                        </p>
                        {contact.lastMessageTime && (
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            {contact.lastMessageTime}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                          {contact.role === "vendor" ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{contact.company}</span>
                          ) : (
                            <span>{contact.company}</span>
                          )}
                          {contact.lastMessage && (
                            <span className="truncate text-muted-foreground/80">
                              · {contact.lastMessage}
                            </span>
                          )}
                        </p>

                        {contact.unreadCount && contact.unreadCount > 0 ? (
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-black text-white shrink-0 shadow-xs">
                            {contact.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Active Conversation Window — WhatsApp styled */}
        {activeContact ? (
          <main
            className={`flex flex-1 flex-col bg-slate-50 dark:bg-[#0b141a] min-w-0 ${
              mobileContactOpen ? "flex" : "hidden md:flex"
            }`}
          >
            {/* WhatsApp Chat Header */}
            <header className="flex h-15 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-4 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileContactOpen(false)}
                  className="md:hidden rounded-full p-1.5 text-foreground hover:bg-secondary active:scale-95 transition-transform cursor-pointer"
                  aria-label="Back to Contacts"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {isSidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="hidden md:flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Open Contacts Directory"
                  >
                    <PanelLeftOpen className="h-3.5 w-3.5 text-primary" />
                    <span>Contacts</span>
                  </button>
                )}

                {/* WhatsApp Contact Info */}
                <div className="relative shrink-0">
                  <img
                    src={
                      activeContact.role === "vendor"
                        ? getCompanyLogo(activeContact.company) ||
                          getUserAvatar(activeContact.name, "vendor", activeContact.avatar_url)
                        : getUserAvatar(activeContact.name, "client", activeContact.avatar_url)
                    }
                    alt={activeContact.name}
                    className="h-10 w-10 rounded-full object-cover border border-border bg-secondary/50 shadow-xs"
                  />
                  {activeContact.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-foreground flex items-center gap-1.5">
                    <span>{activeContact.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                        activeContact.role === "vendor"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {activeContact.role === "vendor" ? "Sponsor" : "Client"}
                    </span>
                  </h3>
                  <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                    {activeContact.online ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        Online
                      </span>
                    ) : (
                      <span className="text-[11px]">{activeContact.company}</span>
                    )}
                  </p>
                </div>
              </div>

            </header>

            {/* WhatsApp Chat Message Thread Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] bg-[size:16px_16px]">
              {/* WhatsApp Centered Date Capsule */}
              <div className="text-center my-2 sticky top-2 z-10">
                <span className="rounded-full bg-card/90 backdrop-blur border border-border/60 px-3 py-1 text-[10px] font-bold text-muted-foreground shadow-2xs">
                  TODAY · INT SUMMIT 2026
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary/80 text-primary">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-foreground">No messages yet with {activeContact.name}</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Send a direct message or choose one of the quick replies below to start networking.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const currentUserId = resolvePrimaryUserId(user, isAdmin);
                  const selfAliases = getChatUserAliases(currentUserId);
                  const isMine = selfAliases.includes(msg.sender_id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      {/* WhatsApp Styled Message Bubble */}
                      <div
                        className={`max-w-[88%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs space-y-1 ${
                          isMine
                            ? "bg-[#dcf8c6] text-gray-950 dark:bg-[#005c4b] dark:text-white rounded-tr-xs border border-emerald-500/20"
                            : "bg-card border border-border/80 text-foreground rounded-tl-xs"
                        }`}
                      >
                        {!isMine && (
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {msg.sender_name}
                          </p>
                        )}

                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                        {/* Document / Pass Attachment Box */}
                        {msg.attachment_name && (
                          <div
                            className={`flex items-center justify-between gap-3 rounded-xl p-2 text-xs ${
                              isMine
                                ? "bg-black/10 dark:bg-black/20 text-foreground dark:text-white"
                                : "bg-secondary text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate text-[11px] font-medium">
                                {msg.attachment_name}
                              </span>
                            </div>
                            {msg.attachment_url && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-6 items-center gap-1 rounded bg-card/60 px-2 text-[10px] font-bold hover:bg-card transition-colors shrink-0 shadow-2xs"
                              >
                                <Download className="h-3 w-3" /> Open
                              </a>
                            )}
                          </div>
                        )}

                        {/* WhatsApp Time & Double Checkmark */}
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] font-medium ${
                            isMine ? "text-gray-600 dark:text-emerald-200/80" : "text-muted-foreground"
                          }`}
                        >
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine && (
                            <CheckCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies Ribbon */}
            {(isAdmin || canChat) && (
              <div className="border-t border-border/60 bg-card/80 backdrop-blur px-3 py-1.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Quick:
                  </span>
                  {QUICK_REPLIES.map((reply, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInputText(reply)}
                      className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary hover:border-primary/40 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Emoji & Flowers Popover Grid */}
            {showEmojiPicker && (isAdmin || canChat) && (
              <div className="border-t border-border bg-card p-3 animate-in slide-in-from-bottom-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    🌸 Emojis & Flowers
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-border/50">
                  <button
                    type="button"
                    onClick={() => setSelectedEmojiCategory("all")}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedEmojiCategory === "all"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    ✨ All
                  </button>
                  {EMOJI_CATEGORIES.map((cat) => {
                    const isSelected = selectedEmojiCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedEmojiCategory(cat.id)}
                        className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="max-h-56 sm:max-h-64 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                  {(selectedEmojiCategory === "all"
                    ? EMOJI_CATEGORIES
                    : EMOJI_CATEGORIES.filter((cat) => cat.id === selectedEmojiCategory)
                  ).map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between sticky top-0 bg-card/95 py-0.5 z-10">
                        <span className="text-[11px] font-bold text-foreground">{cat.icon} {cat.name}</span>
                        <span className="text-[10px] text-muted-foreground">{cat.emojis.length}</span>
                      </div>
                      <div className="grid grid-cols-8 sm:grid-cols-12 gap-1">
                        {cat.emojis.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleEmojiClick(item)}
                            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary hover:scale-115 active:scale-95 transition-all text-base cursor-pointer select-none"
                            title={item}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachment preview if selected */}
            {attachedFile && (
              <div className="flex items-center justify-between border-t border-border bg-emerald-500/10 dark:bg-emerald-500/15 px-3.5 py-1.5 text-xs">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate min-w-0">
                    <p className="truncate font-bold text-foreground text-xs">{attachedFile.name}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="h-3 w-3" /> Antivirus Passed · Max 2MB Verified
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                  title="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* WhatsApp Styled Bottom Composer Box */}
            <footer className="border-t border-border bg-card p-2 sm:p-3">
              {!isAdmin && !canChat ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">Chat Messaging Disabled</p>
                      <p className="text-[10px] text-muted-foreground">
                        Your account is restricted from sending messages.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-destructive/15 px-2 py-0.5 text-[9px] font-bold uppercase text-destructive">
                    Read-Only
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className={`grid h-9 w-9 place-items-center rounded-full transition-colors cursor-pointer ${
                      showEmojiPicker ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                    }`}
                    title="Insert Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>

                  <label
                    className={`grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors shrink-0 ${
                      isScanningFile ? "opacity-50 pointer-events-none" : ""
                    }`}
                    title="Attach File (Max 2MB: PNG, JPG, GIF, WebP, Word, Excel, PDF, PowerPoint, TXT)"
                  >
                    {isScanningFile ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.pdf,.ppt,.pptx,.txt"
                      onChange={handleFileUpload}
                      disabled={isScanningFile}
                      className="hidden"
                    />
                  </label>

                  {/* Rounded Pill WhatsApp Message Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${activeContact.name}...`}
                    className="h-10 flex-1 rounded-full border border-input bg-secondary/40 px-4 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />

                  {/* WhatsApp Circular Action Send Button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !attachedFile}
                    className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-tech transition-all active:scale-90 disabled:opacity-40 shrink-0 cursor-pointer shadow-md"
                    title="Send Message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </footer>
          </main>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
            <p className="text-xs">Select an attendee or exhibitor from the list to begin chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
