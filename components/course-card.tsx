import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CourseCardProps = {
  title: string;
  slug: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  lessonCount: number;
  enrollmentCount: number;
  tenantName?: string;
  href: string;
  rating?: number;
  reviewCount?: number;
  enrolled?: boolean;
};

function formatPrice(priceCents: number, currency: string) {
  if (priceCents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

export function CourseCard({
  title,
  description,
  priceCents,
  currency,
  lessonCount,
  enrollmentCount,
  tenantName,
  href,
  rating = 0,
  reviewCount = 0,
  enrolled = false,
}: CourseCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full border-primary/5 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/10">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 font-serif text-lg leading-snug">
              {title}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge
                variant={priceCents === 0 ? "secondary" : "default"}
                className="shrink-0"
              >
                {formatPrice(priceCents, currency)}
              </Badge>
              {enrolled && (
                <Badge variant="outline" className="border-primary/60 text-primary shrink-0 text-[10px]">
                  Enrolled
                </Badge>
              )}
            </div>
          </div>
          {tenantName && (
            <CardDescription className="text-xs uppercase tracking-wide">
              {tenantName}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {description ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {description}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No description yet.
            </p>
          )}
          {rating > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className="text-primary">★</span>
              <span className="font-medium">{rating}</span>
              <span className="text-muted-foreground">({reviewCount})</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {lessonCount} lessons
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {enrollmentCount}
            </span>
          </div>
          <span className="flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View
            <ArrowRight className="size-3.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}