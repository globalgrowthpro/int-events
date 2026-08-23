import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, ShieldCheck, Code2, UserCheck } from "lucide-react";
import { IntLogo } from "./logo";
import { Button } from "@/components/ui/button";

export function SystemCreditButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-8 w-8 place-items-center rounded-md border border-border text-foreground font-bold hover:bg-accent transition-colors sm:h-9 sm:w-9 cursor-pointer"
        title="System Information & Credits"
        aria-label="System Information"
      >
        <span className="font-black text-sm text-primary">!</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[285px] sm:max-w-[305px] rounded-2xl border border-border bg-card p-3.5 shadow-elevated">
          <DialogHeader className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <IntLogo size="sm" />
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.2 text-[9px] font-bold text-primary">
                <ShieldCheck className="h-2.5 w-2.5" /> Verified
              </span>
            </div>

            <DialogTitle className="text-xs font-bold text-foreground pt-0.5">
              INT Events Platform
            </DialogTitle>

            <DialogDescription className="text-[9.5px] text-muted-foreground leading-tight">
              Enterprise Badge Management & Event Communication.
            </DialogDescription>
          </DialogHeader>

          {/* Official Development Credit Header */}
          <div className="my-1 flex items-center gap-1 text-primary text-[9px] font-black uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Official Development Credit
          </div>

          {/* Details Breakdown */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-1.5 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="grid h-5 w-5 place-items-center rounded bg-primary/10 text-primary shrink-0">
                  <Code2 className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-foreground text-[11px] block truncate">Mr. Hafez Rahim</span>
                  <span className="text-[9px] text-muted-foreground block truncate">Lead Developer & Architect</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-1.5 border border-border/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="grid h-5 w-5 place-items-center rounded bg-primary/10 text-primary shrink-0">
                  <UserCheck className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-foreground text-[11px] block truncate">Mrs. Aya El-Sherbiny</span>
                  <span className="text-[9px] text-muted-foreground block truncate">Project Supervision Lead</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[9px] text-muted-foreground">
            <span>INT © 2026</span>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="h-6 px-2.5 bg-primary text-primary-foreground hover:bg-tech text-[10px] font-semibold rounded-md"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
