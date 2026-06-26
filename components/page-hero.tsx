import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-6 shadow-sm shadow-primary/5 md:p-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.72_0.18_27/0.12),transparent_60%)]"
      />
      <div className="relative flex flex-col gap-4 @container/main sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}