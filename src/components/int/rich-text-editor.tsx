import React, { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link as LinkIcon,
  RotateCcw,
  RotateCw,
  Eye,
  Code2,
  RemoveFormatting,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write detailed event summary, key topics, agenda highlights...",
  minHeight = "180px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"visual" | "html">("visual");

  // Keep editor content in sync with external value without resetting cursor needlessly
  useEffect(() => {
    if (editorRef.current && mode === "visual") {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, mode]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAddLink = () => {
    const url = prompt("Enter link URL (e.g. https://example.com):");
    if (url) {
      exec("createLink", url);
    }
  };

  const handleFormatBlock = (tag: string) => {
    exec("formatBlock", tag);
  };

  return (
    <div className="rounded-xl border border-input bg-background shadow-2xs overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/40 p-1.5 text-foreground">
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarButton onClick={() => exec("bold")} title="Bold (Ctrl+B)">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("italic")} title="Italic (Ctrl+I)">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("underline")} title="Underline (Ctrl+U)">
            <Underline className="h-3.5 w-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton onClick={() => handleFormatBlock("h2")} title="Heading 2">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleFormatBlock("h3")} title="Heading 3">
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleFormatBlock("p")} title="Paragraph">
            <span className="text-[11px] font-bold">P</span>
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bullet List">
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered List">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleFormatBlock("blockquote")} title="Quote">
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => handleFormatBlock("pre")} title="Code Block">
            <Code className="h-3.5 w-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton onClick={handleAddLink} title="Insert Link">
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("removeFormat")} title="Clear Formatting">
            <RemoveFormatting className="h-3.5 w-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton onClick={() => exec("undo")} title="Undo">
            <RotateCcw className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("redo")} title="Redo">
            <RotateCw className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(mode === "visual" ? "html" : "visual")}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {mode === "visual" ? (
              <>
                <Code2 className="h-3 w-3" /> HTML View
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" /> Visual View
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className="prose prose-sm dark:prose-invert max-w-none p-3.5 text-xs sm:text-sm text-foreground outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ minHeight }}
          className="w-full bg-background p-3.5 font-mono text-xs text-foreground outline-none resize-y"
        />
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="grid h-7 w-7 place-items-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}
