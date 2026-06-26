# LMS — Multi-Tenant Learning Management System

A white-label LMS built with **Next.js 16**, **Auth.js**, **Prisma 7**, and **Supabase Postgres**. Supports leased tenant instances, marketplace course discovery, gamification (streaks, achievements, badges), and external API integration for auto-enrollment.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Tenant A    │     │  Tenant B        │     │  Platform Hub   │
│  lms.acme.com│     │  lms.corp.org    │     │  lms.com        │
└──────┬───────┘     └──────┬───────────┘     └────────┬────────┘
       │                    │                          │
       └─────────────┬──────┴──────────────┬───────────┘
                     │                     │
            ┌────────▼────────┐   ┌────────▼────────┐
            │   Supabase DB   │   │   Upstash Redis │
            │  (shared pool)  │   │  (rate limiting)│
            └─────────────────┘   └─────────────────┘
```

- **Multi-tenant by row isolation** — All tables carry a `tenantId` column. Queries filter by tenant via the domain slug.
- **Platform tenant** (`/t/platform`) — The hub where marketplace courses are listed and super admins manage the fleet.
- **Leased tenants** — Each organization gets its own slug (`/t/{slug}`), branding colors, and optional custom domain via CNAME record.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase (Neon adapter for Prisma) |
| ORM | Prisma 7 |
| Auth | Auth.js v5 (Credentials + OAuth — GitHub, Google) |
| UI | Tailwind CSS 4, Radix UI primitives, shadcn/ui |
| Charts | Recharts |
| Video | Mux (upload & playback) |
| Email | Resend (transactional) |
| Rate Limiting | Upstash Redis Ratelimit (in-memory Map fallback) |
| State | React Server Components + Server Actions |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- A Supabase project (optional; local Postgres works for development)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file and fill in credentials
cp .env.example .env

# 3. Generate Prisma client and push schema
pnpm exec prisma generate
pnpm exec prisma db push

# 4. Seed the database (creates platform tenant, sample course, achievements)
pnpm db:seed

# 5. Start dev server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### With Docker (local Postgres)

```bash
# Start Postgres
docker compose up -d

# Configure .env for local Postgres
#   DATABASE_URL=postgresql://lms:lms_dev@localhost:5432/lms
#   DIRECT_URL=postgresql://lms:lms_dev@localhost:5432/lms

pnpm run dev
```

## Project Structure

```
app/
├── actions/          # Server Actions (enrollment, course CRUD, admin)
├── admin/            # Platform super admin dashboard + audit log
├── api/
│   ├── v1/
│   │   ├── export/   # CSV/JSON data export (super admin only)
│   │   ├── integrations/enroll/  # External API enrollment endpoint
│   │   └── upload/   # File upload endpoint (lesson resources)
│   ├── auth/         # NextAuth route handler
│   ├── cron/         # Scheduled jobs (email queue processing)
│   └── internal/     # Internal APIs (domain resolution)
├── t/[tenantSlug]/   # Per-tenant routes (admin, courses, onboarding)
├── courses/          # Marketplace course catalog
├── dashboard/        # User dashboard
├── my-learning/      # Enrolled courses with progress
├── settings/         # User settings
├── notifications/    # In-app notifications
└── achievements/     # Gamification hub

components/           # Shared React components (UI kit + feature components)
lib/                  # Server utilities (db, auth, permissions, audit, rate-limit, webhook)
prisma/               # Schema, migrations, seed
```

## Key Features

- **Multi-tenant** — Each organization gets isolated namespace with custom branding
- **Marketplace** — Cross-tenant course discovery with search, category, and level filters
- **Gamification** — Streaks, achievements, badges, progress tracking
- **External API** — Bearer-token authenticated enrollment endpoint for integrating websites
- **Rich content** — Markdown lesson content, Mux video, quizzes, drag-and-drop curriculum builder
- **Admin dashboard** — Per-tenant analytics (enrollments, retention, reviews, progress)
- **Platform admin** — Super admin oversees all tenants, users, audit log, data export
- **File upload** — Lesson resource attachments (images, PDFs, docs, zips) via drag-and-drop

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase Postgres (transaction pooler) |
| `DIRECT_URL` | Yes | Supabase Postgres (session pooler for migrations) |
| `AUTH_SECRET` | Yes | Random hex string for session encryption |
| `SUPER_ADMIN_EMAIL` | Yes | Email promoted to super admin on seed |
| `INTERNAL_API_SECRET` | For uploads | Bearer token for file upload endpoint |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis for rate limiting (in-memory fallback) |

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm run dev` | Start development server (Turbopack) |
| `pnpm run build` | Type-check and production build |
| `pnpm run start` | Start production server |
| `pnpm run lint` | Run ESLint |
| `pnpm run test` | Run Vitest test suite |
| `pnpm db:seed` | Seed database (platform tenant, sample data) |

## Deployment

### Docker

```bash
docker build -t lms .
docker run -p 3000:3000 --env-file .env lms
```

### CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, typecheck, tests, and a Docker build on every push and pull request to `main`.

## License

Internal use.
