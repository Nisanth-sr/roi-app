import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

const sizes = {
  sm: { mark: 28, text: "text-lg" },
  md: { mark: 36, text: "text-xl" },
  lg: { mark: 64, text: "text-5xl" },
} as const;

export function BrandMark({
  href = "/",
  size = "md",
  showWordmark = true,
  className = "",
}: BrandMarkProps) {
  const s = sizes[size];
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/4emet-mark.png"
        alt="4emet"
        width={s.mark}
        height={s.mark}
        className="shrink-0"
        priority={size === "lg"}
      />
      {showWordmark && (
        <span
          className={`font-semibold tracking-tight text-[var(--ink)] ${s.text}`}
        >
          4emet
        </span>
      )}
    </span>
  );

  if (href === null || href === "") return content;

  return (
    <Link href={href} className="inline-flex no-underline">
      {content}
    </Link>
  );
}
