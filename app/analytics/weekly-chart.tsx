"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useT } from "@/lib/i18n/locale-provider";

type Props = {
  data: { week: string; count: number }[];
};

export function StudentWeeklyChart({ data }: Props) {
  const t = useT();
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (data.every((d) => d.count === 0)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noData")}</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis allowDecimals={false} domain={[0, Math.max(maxCount + 1, 5)]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value, name) => [value, name === "count" ? "Lessons completed" : name]}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
