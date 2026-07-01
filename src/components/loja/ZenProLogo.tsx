import Link from "next/link";

type Props = {
  variant?: "dark" | "gold";
  className?: string;
  priority?: boolean;
  /** Omitir link passando `null` */
  href?: string | null;
};

/** PNG com fundo transparente — 415×98 */
const LOGOS = {
  dark: { src: "/brand/logo-dark.png", width: 415, height: 98 },
  gold: { src: "/brand/logo-gold.png", width: 415, height: 98 },
} as const;

export function ZenProLogo({
  variant = "dark",
  className = "h-9 w-auto sm:h-10",
  priority = false,
  href = "/",
}: Props) {
  const logo = LOGOS[variant];

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt="Zen Pro"
      width={logo.width}
      height={logo.height}
      className={`block object-contain ${className}`}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  );

  if (href === null) return image;

  return (
    <Link
      href={href ?? "/"}
      className="inline-flex shrink-0 items-center"
      aria-label="Zen Pro — início"
    >
      {image}
    </Link>
  );
}
