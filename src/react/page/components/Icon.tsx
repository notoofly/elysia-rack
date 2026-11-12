import { icons, type LucideProps } from "lucide-react";

/** Turn `shopping-cart`, `shopping_cart`, or `ShoppingCart` into `ShoppingCart`. */
function iconKey(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export interface RackIconProps extends Omit<LucideProps, "name"> {
  /** Lucide icon name (kebab-case or PascalCase). Falls back to the raw value. */
  name?: string;
}

/**
 * Render a Lucide icon from metadata.
 * Unknown names fall back to the raw string so existing emoji icons keep working.
 */
export function RackIcon({ name, ...props }: RackIconProps) {
  if (!name) return null;
  const Icon = icons[iconKey(name) as keyof typeof icons];
  if (!Icon) return <span aria-hidden="true">{name}</span>;
  return <Icon aria-hidden="true" {...props} />;
}
