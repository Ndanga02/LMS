"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"] as const;

type CourseSearchProps = {
  categories: string[];
};

export function CourseSearch({ categories }: CourseSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const level = searchParams.get("level") ?? "";
  const price = searchParams.get("price") ?? "";

  const hasActiveFilters = q || category || level || price;

  function setFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search courses by title, description, or tags..."
            defaultValue={q}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilter("q", (e.currentTarget as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => setFilter("q", e.currentTarget.value)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('[name="q"]');
            setFilter("q", input?.value ?? "");
          }}
        >
          Search
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" asChild>
            <Link href="/courses">
              <X className="size-4" /> Clear
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Filters:</span>

        <select
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={category}
          onChange={(e) => setFilter("category", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={level}
          onChange={(e) => setFilter("level", e.target.value)}
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={price}
          onChange={(e) => setFilter("price", e.target.value)}
        >
          <option value="">All prices</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </div>
    </div>
  );
}
