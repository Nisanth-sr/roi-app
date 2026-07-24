import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/Spinner";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "plain";
};

export function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...rest
}: LoadingButtonProps) {
  const base =
    variant === "primary"
      ? "brand-btn"
      : variant === "ghost"
        ? "brand-btn-ghost"
        : "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} cursor-pointer gap-2 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {loading && <Spinner light={variant === "primary"} />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
