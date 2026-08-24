import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Link2,
  Eraser,
} from "lucide-react";

/** Very small allow-list sanitizer for editor HTML (tags + inline hrefs only). */
export function sanitizeRichText(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") return html;
  const allowed = new Set([
    "P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "H2", "H3", "A", "DIV", "SPAN",
  ]);
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll("*").forEach((el) => {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }
    Array.from(el.attributes).forEach((attr) => {
      const isSafeHref =
        el.tagName === "A" &&
        attr.name === "href" &&
        /^(https?:|mailto:|tel:)/i.test(attr.value.trim());
      if (!isSafeHref) el.removeAttribute(attr.name);
    });
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noreferrer noopener");
    }
  });
  return root.innerHTML;
}

/** True when the html has no visible text or media. */
export function isRichTextEmpty(html: string): boolean {
  return !html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

type ToolButton = {
  icon: typeof Bold;
  label: string;
  run: () => void;
};

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  className,
  minHeight = "140px",
}: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML));
  };

  const cmd = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const buttons: ToolButton[] = [
    { icon: Bold, label: "Bold", run: () => cmd("bold") },
    { icon: Italic, label: "Italic", run: () => cmd("italic") },
    { icon: Underline, label: "Underline", run: () => cmd("underline") },
    { icon: Heading2, label: "Heading", run: () => cmd("formatBlock", "<h3>") },
    { icon: List, label: "Bulleted list", run: () => cmd("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => cmd("insertOrderedList") },
    {
      icon: Link2,
      label: "Insert link",
      run: () => {
        const url = window.prompt("Link URL (https://…)");
        if (url) cmd("createLink", url);
      },
    },
    { icon: Eraser, label: "Clear formatting", run: () => cmd("removeFormat") },
  ];

  return (
    <div className={`mt-1.5 overflow-hidden rounded-xl border border-border bg-background ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1.5">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.label}
            aria-label={b.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.run}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground"
          >
            <b.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        style={{ minHeight }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className="int-rte w-full p-3 text-sm leading-relaxed text-foreground outline-none [&_a]:underline [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

export function RichTextView({ html, className }: { html: string; className?: string }) {
  if (isRichTextEmpty(html)) return null;
  return (
    <div
      className={`text-sm leading-relaxed text-muted-foreground [&_a]:underline [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
