"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  data: { month: string; count: number }[];
};

export function EnrollmentTrendChart({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (data.every((d) => d.count === 0)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No enrollment data yet.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis allowDecimals={false} domain={[0, Math.max(maxCount + 2, 5)]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value, name) => [value, name === "count" ? "Enrollments" : name]}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
