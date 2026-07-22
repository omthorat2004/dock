export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-foreground hover:bg-subtle",
  ghost: "text-muted hover:text-foreground",
};

/** Shared button styling, so `<Link>` CTAs and real `<button>`s stay identical. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  className = "",
) {
  return `${base} ${variants[variant]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return <button className={buttonStyles(variant, className)} {...props} />;
}
