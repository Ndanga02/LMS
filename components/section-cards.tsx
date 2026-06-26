import { TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Stat = {
  label: string;
  value: string | number;
  description: string;
  trend?: string;
};

export function SectionCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="@container/card border-primary/5 shadow-sm shadow-primary/5"
        >
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide">
              {stat.label}
            </CardDescription>
            <CardTitle className="font-serif text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stat.value}
            </CardTitle>
            {stat.trend && (
              <CardAction>
                <Badge variant="outline" className="border-primary/20">
                  <TrendingUpIcon />
                  {stat.trend}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            {stat.description}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}