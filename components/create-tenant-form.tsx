"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createTenantAction } from "@/app/actions/tenant";
import { Loader2 } from "lucide-react";

export function CreateTenantForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createTenantAction(formData);
        toast.success("Tenant created");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create tenant";
        toast.error("Create tenant failed", { description: message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-sm font-medium">Name</label>
        <input name="name" required className="mt-1 w-full rounded-md border bg-background p-2 text-sm" placeholder="Acme Corp LMS" disabled={isPending} />
      </div>
      <div>
        <label className="text-sm font-medium">Slug (URL)</label>
        <input name="slug" required pattern="[a-z0-9-]+" className="mt-1 w-full rounded-md border bg-background p-2 text-sm" placeholder="acme-corp" disabled={isPending} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium">Description (optional)</label>
        <textarea name="description" className="mt-1 w-full rounded-md border bg-background p-2 text-sm" rows={2} placeholder="Internal training platform for Acme employees." disabled={isPending} />
      </div>
      <div>
        <label className="text-sm font-medium">Enrollment Mode</label>
        <select name="enrollmentMode" className="mt-1 w-full rounded-md border bg-background p-2 text-sm" defaultValue="BOTH" disabled={isPending}>
          <option value="BOTH">Both (purchase + API)</option>
          <option value="PURCHASE_ONLY">Direct purchase only</option>
          <option value="INTEGRATION_ONLY">API integration only</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Tenant"
          )}
        </Button>
      </div>
    </form>
  );
}
