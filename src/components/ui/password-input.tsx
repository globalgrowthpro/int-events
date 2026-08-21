import { useState, forwardRef } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onGenerate?: (password: string) => void;
  showGenerateButton?: boolean;
}

export function generateStrongPassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + numbers + symbols;

  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, onGenerate, showGenerateButton = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleGenerate = () => {
      const generated = generateStrongPassword(14);
      setShowPassword(true);
      if (onGenerate) {
        onGenerate(generated);
      }
      navigator.clipboard?.writeText(generated).catch(() => {});
      toast.success("Strong password generated & copied to clipboard!");
    };

    return (
      <div className="relative flex items-center">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-20 font-mono", className)}
          ref={ref}
          {...props}
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {showGenerateButton && (
            <button
              type="button"
              onClick={handleGenerate}
              className="flex h-7 items-center gap-1 rounded px-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
              title="Generate strong password"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Generate</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
