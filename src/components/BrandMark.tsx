import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: 28,
  md: 36,
  lg: 64,
} as const;

export function BrandMark({
  href = "/",
  size = "md",
  className = "",
}: BrandMarkProps) {
  const mark = sizes[size];
  const content = (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/brand/logo.png"
        alt=""
        width={mark}
        height={mark}
        className="shrink-0"
        priority={size === "lg"}
      />
    </span>
  );

  if (href === null || href === "") return content;

  return (
    <Link href={href} className="inline-flex no-underline" aria-label="Home">
      {content}
    </Link>
  );
}
