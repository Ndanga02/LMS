export { LmsShell as AppShell } from "@/components/layout/lms-shell";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 @container/main sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}