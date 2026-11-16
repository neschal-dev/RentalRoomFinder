import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/70 disabled:opacity-50";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "py-2.5", className)} {...props} />;
}

// A native dropdown. It keeps the phone's own picker, which is the best one on mobile.
export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "h-10", className)} {...props} />;
}

// A label above a control, with an optional hint underneath.
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5 text-sm font-medium", className)}>
      <span>{label}</span>
      {children}
      {hint && (
        <span className="block text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
