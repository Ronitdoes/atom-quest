# ⚛️ AtomQuest — Enterprise Goal Tracking Portal

AtomQuest is a full-stack, role-based goal tracking system designed for enterprise teams. It manages the complete lifecycle of employee goal-setting — from drafting and submission through manager review, approval, and quarterly check-in tracking — with built-in analytics, notifications, and automated scheduling.

Built with **Next.js 16**, **Prisma**, **PostgreSQL**, and **Upstash Redis**.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)
- [Core Workflows](#core-workflows)
- [API Reference](#api-reference)
- [Background Scheduler](#background-scheduler)
- [Security](#security)
- [Deployment](#deployment)

---

## Features

### Goal Management
- **Annual goal sheets** — employees draft, edit, and submit goal sheets per cycle (e.g., "2026")
- **Weighted goals** — each goal has a thrust area, UOM type, target, and percentage weight (totaling 100%)
- **Shared goals** — managers/admins create shared organizational goals and assign them to multiple employees
- **Goal lifecycle** — `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED` (or `REWORK_REQUIRED`)

### Manager Workflows
- **Approval queue** — managers review and approve/reject subordinate goal sheets
- **Goal editing** — managers can adjust targets and weightage before approval
- **Quarterly check-in reviews** — managers provide written feedback on employee self-assessments
- **Team dashboard** — at-a-glance view of team progress and pending items

### Admin Operations
- **System dashboard** — real-time stats on submission rates, approval rates, and department completion
- **User management** — CRUD operations for all users with role and manager assignment
- **Analytics** — manager effectiveness reports, completion trends, and achievement breakdowns
- **Sheet unlock** — admins can unlock approved goal sheets for rework
- **Broadcast reminders** — send targeted or system-wide notifications
- **Audit logs** — full trail of all state changes across the system

### Quarterly Check-Ins
- **Self-assessment** — employees submit notes and achievement values per goal each quarter
- **Manager feedback** — managers review and comment on check-ins
- **Escalation** — overdue check-ins are automatically escalated to managers

### System Automation
- **Scheduler daemon** — hourly background job that:
  - Opens/closes cycle windows based on dates
  - Sends automatic reminders for pending submissions
  - Escalates overdue check-ins
  - Cleans up old audit logs (>2 years) and read notifications (>90 days)

### Notifications
- **Real-time notifications** — in-app notification bell with unread count
- **Paginated feed** — efficient loading of notification history
- **Auto-generated** — triggered by goal submissions, approvals, rejections, check-in reminders, and escalations

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Employee │  │ Manager  │  │  Admin Dashboard  │   │
│  │Dashboard │  │Dashboard │  │  (Stats/Users/    │   │
│  │ (Goals)  │  │(Approvals│  │   Analytics)      │   │
│  └──────────┘  │ Reviews) │  └──────────────────┘   │
│                └──────────┘                          │
├─────────────────────────────────────────────────────┤
│             API Routes (Next.js App Router)          │
│  ┌──────────────────────────────────────────────┐   │
│  │  Rate Limiting · Auth · Input Validation     │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│                  Service Layer                       │
│  GoalService · ManagerService · AdminService        │
│  AnalyticsService · CheckInService · CacheService   │
│  SchedulerService · NotificationService             │
│  SharedGoalService · ProgressCalculator             │
├──────────────────────┬──────────────────────────────┤
│    PostgreSQL        │        Upstash Redis          │
│  (via Prisma ORM +   │  (Rate limiting, caching,    │
│   PgBouncer pooling) │   distributed locking)       │
└──────────────────────┴──────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Frontend** | React 19, TailwindCSS 4, shadcn/ui, Recharts, Zustand |
| **Forms** | React Hook Form + Zod validation |
| **Data Fetching** | TanStack React Query |
| **Auth** | NextAuth.js (JWT strategy, credential provider) |
| **ORM** | Prisma 7 with PgBouncer adapter |
| **Database** | PostgreSQL (Supabase) |
| **Cache / Rate Limit** | Upstash Redis (serverless) |
| **Scheduling** | node-cron (standalone daemon) |
| **Icons** | Lucide React |
| **Notifications** | Sonner toast + in-app notification system |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** database (or [Supabase](https://supabase.com) project)
- **Upstash Redis** instance (required for production; optional in development)

### Installation

```bash
git clone https://github.com/your-org/atomquest.git
cd atomquest
npm install
```

### Database Setup

1. **Configure the database URL** in `.env` (see [Environment Variables](#environment-variables))

2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Seed demo data:**
   ```bash
   npx prisma db seed
   ```

   This creates three demo accounts:

   | Role | Email | Password |
   |------|-------|----------|
   | Admin | `admin@atomquest.com` | `AdmQuest$2026!` |
   | Manager | `manager@atomquest.com` | `MgrQuest#2026!1` |
   | Employee | `employee@atomquest.com` | `EmpQuest@2026!` |

   > **Note:** Demo passwords now fully comply with the system's password complexity requirements (minimum 8 characters, mixed case, digit, and special character).

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (PgBouncer port 6543 with `?pgbouncer=true`) |
| `DIRECT_URL` | ✅ | Direct PostgreSQL connection (port 5432, used by Prisma migrations) |
| `DATABASE_POOL_MAX` | ❌ | Max connections in pool (default: `5`) |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | App URL (e.g., `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ | Supabase anonymous key |
| `UPSTASH_REDIS_REST_URL` | 🔶 Prod | Upstash Redis REST URL (required in production) |
| `UPSTASH_REDIS_REST_TOKEN` | 🔶 Prod | Upstash Redis REST token (required in production) |
| `CRON_SECRET` | 🔶 Prod | Secret for authenticating scheduler API calls |

### Running the App

```bash
# Start the development server
npm run dev

# In a separate terminal, start the scheduler daemon
npm run scheduler
```

The app is available at `http://localhost:3000`.

---

## Project Structure

```
atomquest/
├── prisma/
│   ├── schema.prisma          # Database schema (10 models)
│   ├── migrations/            # SQL migration history
│   └── seed.ts                # Demo data seeder
├── scripts/
│   └── scheduler.ts           # Background cron daemon
├── src/
│   ├── app/
│   │   ├── api/               # API route handlers
│   │   │   ├── admin/         # Admin endpoints (9 routes)
│   │   │   ├── auth/          # Authentication
│   │   │   ├── check-ins/     # Check-in CRUD + manager review
│   │   │   ├── employee/      # Employee-specific endpoints
│   │   │   ├── goals/         # Goal sheet operations
│   │   │   ├── manager/       # Approve/reject/update workflows
│   │   │   ├── notifications/ # Notification feed + mark-read
│   │   │   └── shared-goals/  # Shared goal management
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── employee/          # Employee dashboard pages
│   │   ├── manager/           # Manager dashboard pages
│   │   ├── auth/login/        # Login page
│   │   ├── layout.tsx         # Root layout (dark theme, Inter font)
│   │   └── page.tsx           # Landing / redirect
│   ├── components/            # Reusable UI components (shadcn/ui)
│   ├── lib/
│   │   ├── auth/              # NextAuth configuration
│   │   ├── db/                # Prisma client initialization
│   │   ├── permissions/       # Role-based permission definitions
│   │   ├── security/          # Error handling, rate limit utilities
│   │   ├── services/          # Business logic layer (11 services)
│   │   ├── utils/             # Password hashing, helpers
│   │   ├── validators/        # Zod schemas for input validation
│   │   └── workflow/          # State machine definitions
│   └── proxy.ts               # Route-level auth guard (Next.js 16 proxy)
├── next.config.ts             # Security headers, Next.js config
├── components.json            # shadcn/ui configuration
└── package.json
```

---

## Roles & Permissions

AtomQuest uses three hierarchical roles:

| Role | Capabilities |
|------|-------------|
| **Employee** | Draft, edit, and submit goal sheets. Submit quarterly check-ins. View personal audit logs and notifications. |
| **Manager** | All Employee capabilities + review and approve/reject subordinate goal sheets. Edit goal targets/weightage. Review check-ins. Create and assign shared goals. |
| **Admin** | All Manager capabilities for **any** employee (not limited to subordinates). Manage users, view system analytics, unlock approved sheets, send broadcast reminders, trigger scheduler. |

Route protection is enforced at two levels:
1. **Proxy layer** (`src/proxy.ts`) — redirects unauthorized page access
2. **API layer** — each route handler verifies `session.user.role` before executing

---

## Core Workflows

### Goal Sheet Lifecycle

```
DRAFT ──→ SUBMITTED ──→ UNDER_REVIEW ──→ APPROVED
                │               │
                │               └──→ REWORK_REQUIRED ──→ DRAFT (re-edit)
                │
                └── (Admin can UNLOCK an approved sheet back to DRAFT)
```

### Quarterly Check-In Flow

```
1. Cycle window opens (automatic via scheduler)
2. Employee submits check-in: notes + achievement values per goal
3. Manager reviews and adds feedback
4. If overdue → scheduler escalates with notification to manager
5. Cycle window closes (automatic via scheduler)
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth sign-in/sign-out |

### Goals
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/goals?cycleId=2026` | Any | Get user's goal sheet for a cycle |

### Check-Ins
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/check-ins?cycleId=...&quarter=...` | Any | Get check-in for quarter |
| POST | `/api/check-ins` | Employee | Submit check-in |
| POST | `/api/check-ins/review` | Manager/Admin | Add manager feedback |

### Manager
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/manager/approvals?userId=...` | Manager/Admin | View goal sheet for approval |
| POST | `/api/manager/approve` | Manager/Admin | Approve a goal sheet |
| POST | `/api/manager/reject` | Manager/Admin | Reject with comment |
| POST | `/api/manager/update-goals` | Manager/Admin | Modify goal targets/weightage |

### Shared Goals
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/shared-goals?page=1&limit=50` | Manager/Admin | List created shared goals |
| POST | `/api/shared-goals` | Manager/Admin | Create shared goal |
| POST | `/api/shared-goals/assign` | Manager/Admin | Assign to users |
| PUT | `/api/shared-goals/[id]` | Manager/Admin | Update shared goal |
| POST | `/api/shared-goals/[id]/sync-achievement` | Manager/Admin | Sync achievements |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications?page=1&limit=50` | Any | Get unread notifications (paginated) |
| POST | `/api/notifications` | Any | Mark as read (single or all) |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats?cycleId=2026` | Admin | System-wide statistics |
| GET | `/api/admin/analytics?cycleId=...&quarter=...` | Admin | Manager effectiveness analytics |
| GET | `/api/admin/users?page=1&limit=10` | Admin | Paginated user list |
| POST | `/api/admin/users` | Admin | Create/update user |
| GET | `/api/admin/managers` | Admin | List all managers |
| GET | `/api/admin/audit-logs?page=1&limit=50` | Admin | Paginated audit trail |
| GET | `/api/admin/reports/achievements` | Admin | Achievement breakdown report |
| POST | `/api/admin/unlock-sheet` | Admin | Unlock approved sheet for rework |
| POST | `/api/admin/reminders` | Admin | Send broadcast reminders |
| POST | `/api/admin/scheduler` | Admin | Manually trigger scheduler tick |

### Employee
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/employee/audit-logs?page=1&limit=50` | Any | Personal audit history (paginated) |

---

## Background Scheduler

The scheduler can be run in two ways:
1. **Serverless Vercel Cron Jobs (Recommended)** — Configured natively via `vercel.json`. It triggers the secure `/api/admin/scheduler` endpoint hourly using serverless compute.
2. **Standalone Daemon Process** — Runs as a persistent process via `npm run scheduler` (using `node-cron`, hourly).

Each tick performs:
1. **Window transitions** — Opens `UPCOMING` windows whose `startDate` has passed; closes `OPEN` windows whose `endDate` has passed.
2. **Automatic reminders** — Notifies employees who haven't submitted goals or check-ins during open windows.
3. **Escalations** — Flags overdue check-ins and notifies managers.
4. **Data retention cleanup** — Deletes audit logs older than 2 years and read notifications older than 90 days.

**Concurrency protection:** The scheduler uses Redis distributed locks (or PostgreSQL advisory locks as fallback) to prevent overlapping ticks across multiple instances.

---

## Security

### Authentication
- **JWT-based sessions** via NextAuth.js (8-hour expiry, 15-minute refresh)
- **Password complexity** — enforced at login (8+ chars, uppercase, lowercase, digit, special character)
- **Login rate limiting** — 10 attempts per email per 15 minutes
- **Role revalidation** — JWT role refreshed from DB every 5 minutes

### API Protection
- **Rate limiting** on all endpoints (30–60 requests per minute per user)
- **Input validation** — Zod schemas on all POST bodies; max 2000 char limits on free-text fields
- **Role-based authorization** — enforced per route handler
- **Error sanitization** — `safeErrorResponse()` prevents internal error leakage

### Infrastructure
- **Security headers** — HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy
- **Redis enforcement** — app fails fast in production if Redis is unavailable (prevents silent fallback to per-instance memory cache)
- **PgBouncer** — connection pooling for serverless deployment

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub and connect to Vercel
2. Set all [environment variables](#environment-variables) in Vercel dashboard
3. The `prisma generate` step runs automatically via `postinstall`
4. Run migrations against production DB:
   ```bash
   DATABASE_URL="..." npx prisma migrate deploy
   ```

### Scheduler Deployment

AtomQuest supports fully serverless background execution on Vercel:

- **Vercel Cron Jobs (Recommended)** — Configured natively by `vercel.json` in the repository root. The app automatically triggers `/api/admin/scheduler` hourly. In the Vercel project dashboard, simply ensure the `CRON_SECRET` environment variable is set (Vercel automatically attaches this value as a Bearer token in the `Authorization` header).
- **Standalone Daemon** — For VPS or persistent environments (Railway, Render, Fly.io), deploy a background container running `npm run scheduler`.
- **External Webhooks** — Securely POST or GET to `/api/admin/scheduler` with the header `Authorization: Bearer <CRON_SECRET>` from any external cron provider (e.g. Upstash QStash).

---

## License

Private. All rights reserved.
