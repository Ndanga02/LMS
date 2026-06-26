"use client";

import { useTransition } from "react";
import { updateTenantStatusAction } from "@/app/actions/admin";

type Props = {
  tenantId: string;
  currentStatus: string;
};

export function TenantStatusSelect({ tenantId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const formData = new FormData();
    formData.set("tenantId", tenantId);
    formData.set("status", e.target.value);
    startTransition(async () => {
      try {
        await updateTenantStatusAction(formData);
      } catch {
        // server action throws redirect, so errors here are unexpected
      }
    });
  };

  return (
    <select
      name="status"
      className="rounded-md border bg-background px-2 py-1 text-xs"
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
    >
      <option value="ACTIVE">Active</option>
      <option value="PENDING">Pending</option>
      <option value="SUSPENDED">Suspended</option>
    </select>
  );
}
