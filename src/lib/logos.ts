/**
 * Company Brand Logos & Professional Attendee Avatars Directory
 */

export const COMPANY_LOGOS: Record<string, string> = {
  "Genetec": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
  "Axis Communications": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200&auto=format&fit=crop&q=80",
  "Milestone Systems": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80",
  "Milestone": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80",
  "Cisco Systems": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&auto=format&fit=crop&q=80",
  "Cisco": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&auto=format&fit=crop&q=80",
  "Honeywell": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80",
  "HID Global": "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&auto=format&fit=crop&q=80",
  "Vertiv": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop&q=80",
  "Dell Technologies": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=200&auto=format&fit=crop&q=80",
  "Dell": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=200&auto=format&fit=crop&q=80",
  "Integrated Technics": "/int-logo.png",
  "ABC Corporation": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&auto=format&fit=crop&q=80",
};

export const USER_AVATARS: Record<string, string> = {
  "Ahmed Mohamed": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
  "Sarah Klein": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
  "Hafez Rahim": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  "Omar Ali": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
  "John Smith": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
  "Petra Lund": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
  "Nour Hassan": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
  "Marco Rossi": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
  "Amira Zaki": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80",
  "Tarek Mansour": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
  "Mona El-Sayed": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&auto=format&fit=crop&q=80",
  "Khaled Samir": "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80",
  "Layla Ibrahim": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "Youssef Nabil": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
};

/**
 * Returns a company logo URL with smart matching and initials badge fallback
 */
export function getCompanyLogo(companyName?: string | null): string {
  if (!companyName) return "";
  const trimmed = companyName.trim();
  
  for (const [key, url] of Object.entries(COMPANY_LOGOS)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase())) {
      return url;
    }
  }

  // Fallback to high-resolution stylized avatar for custom companies
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed)}&background=0D1B2A&color=F37021&bold=true&size=128`;
}

/**
 * Returns a user avatar photo URL with fallback and profile sync
 */
export function getUserAvatar(name?: string | null, role?: string, customAvatar?: string | null): string {
  if (customAvatar && customAvatar.trim().length > 5) {
    return customAvatar;
  }

  // Check localStorage for active session avatar or persisted profile avatar
  if (typeof window !== "undefined") {
    try {
      const sessionRaw = localStorage.getItem("int-events-session");
      if (sessionRaw) {
        const sess = JSON.parse(sessionRaw);
        if (sess.avatar_url && sess.avatar_url.length > 5) {
          if (!name || (name && (sess.name?.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(sess.name?.toLowerCase()) || sess.email?.toLowerCase() === name.toLowerCase()))) {
            return sess.avatar_url;
          }
        }
      }

      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("int-profile-id-")) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.avatarUrl && parsed.avatarUrl.length > 5) {
              if (
                !name ||
                parsed.formData?.name?.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(parsed.formData?.name?.toLowerCase() || "") ||
                key.toLowerCase().includes(name.toLowerCase()) ||
                (name.includes("Ahmed") && key.includes("client"))
              ) {
                return parsed.avatarUrl;
              }
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  const trimmed = (name || "").trim();
  for (const [key, url] of Object.entries(USER_AVATARS)) {
    if (trimmed && (trimmed.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(trimmed.toLowerCase()))) {
      return url;
    }
  }

  const roleColor = role === "admin" ? "F37021" : role === "vendor" ? "10B981" : role === "employee" ? "A855F7" : "00A3E0";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed || "INT")}&background=0D1B2A&color=${roleColor}&bold=true&size=256&font-size=0.42`;
}
