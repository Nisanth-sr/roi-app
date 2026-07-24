export function Spinner({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span
      className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${
        light ? "text-white" : "text-black"
      } ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
