"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardChartsProps = {
  progressBuckets: Record<string, number>;
  tenantActivity: Array<{ name: string; enrollments: number; slug: string }>;
  enrollments: { source: string }[];
};

const ORANGE_PALETTE = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5"];

export function DashboardCharts({
  progressBuckets,
  tenantActivity,
  enrollments,
}: DashboardChartsProps) {
  // Progress distribution for BarChart
  const progressData = Object.entries(progressBuckets).map(([label, value]) => ({
    name: label,
    courses: value,
  }));

  // Tenant activity for BarChart
  const activityData = tenantActivity.map((item, idx) => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + "..." : item.name,
    enrollments: item.enrollments,
    fill: ORANGE_PALETTE[idx % ORANGE_PALETTE.length],
  }));

  // Enrollment sources for PieChart
  const sourceCounts: Record<string, number> = {};
  enrollments.forEach((e) => {
    const source = e.source || "MANUAL";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const sourceData = Object.entries(sourceCounts).map(([name, value], idx) => ({
    name,
    value,
    fill: ORANGE_PALETTE[idx % ORANGE_PALETTE.length],
  }));

  const totalEnrollments = enrollments.length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Progress Distribution - Bar Chart */}
      <Card className="border-primary/5 shadow-sm lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-serif text-base">Progress Distribution</CardTitle>
          <CardDescription>How your learning is distributed</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px] min-w-0 pt-2">
          {totalEnrollments > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="courses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Enroll in courses to see analytics
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Sources - Pie Chart */}
      <Card className="border-primary/5 shadow-sm lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-serif text-base">Enrollment Sources</CardTitle>
          <CardDescription>Where your enrollments come from</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px] min-w-0 pt-2">
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No enrollment data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity by Organization - Bar Chart */}
      <Card className="border-primary/5 shadow-sm lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-serif text-base">Activity by Organization</CardTitle>
          <CardDescription>Enrollments per tenant</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px] min-w-0 pt-2">
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="enrollments" radius={[0, 4, 4, 0]}>
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Join organizations to see activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
