import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Building2,
  GraduationCap,
  Sparkles,
  Zap,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import logo from "@/public/logo.png";

const features = [
  {
    icon: BookOpen,
    title: "Course marketplace",
    description:
      "Publish and sell courses on a beautiful catalog students love.",
  },
  {
    icon: Building2,
    title: "Leased tenants",
    description: "Branded org spaces at /t/your-slug with admin controls.",
  },
  {
    icon: Zap,
    title: "API enrollment",
    description: "Auto-enroll students from external sites via API keys.",
  },
  {
    icon: GraduationCap,
    title: "Learner dashboard",
    description: "Track progress, enrollments, and org memberships.",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src={logo}
              alt="SemtexTech"
              width={32}
              height={32}
              loading="eager"
              className="h-8 w-8 rounded-lg"
            />
            SemtexTech LMS
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/courses">Courses</Link>
            </Button>
            {session?.user ? (
              <Button size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 text-xs font-medium tracking-[1.5px] uppercase">
            SemtexTech Enterprise Platform
          </Badge>
          <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            Learn, teach, and scale on one{" "}
            <span className="text-primary">beautiful platform</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Multi-tenant LMS with marketplace courses, organization leases, and
            integration APIs — built with a clean, professional orange + slate SaaS design.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/courses">
                Explore courses
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={session?.user ? "/dashboard" : "/login"}>
                {session?.user ? "My dashboard" : "Sign in"}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="shadow-sm">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}