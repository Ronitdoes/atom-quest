# Step-by-Step AI Build Guide — Goal Setting & Tracking Portal

This guide is designed specifically for AI-assisted development.

The idea is:

- Build fast
- Avoid overengineering
- Ship a stable MVP
- Keep architecture scalable
- Use AI effectively for code generation
- Maintain clean structure from Day 1

This guide assumes the following stack:

- Next.js 15
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- shadcn/ui
- Auth.js
- Zustand
- TanStack Query

Based on the AtomQuest Hackathon BRD. fileciteturn0file0

---

# 0. Development Philosophy

Before starting:

## DO NOT

- Start with microservices
- Build analytics first
- Over-optimize performance early
- Create complicated abstractions
- Build generic workflow engines
- Use 10 libraries for one task

---

## DO

- Build vertical slices
- Ship working flows first
- Keep APIs simple
- Centralize business logic
- Build stable foundations
- Use AI for repetitive coding
- Test workflows continuously

---

# 1. Create the Project

## Step 1 — Initialize Next.js

```bash
npx create-next-app@latest goal-portal
```

Choose:

- TypeScript → Yes
- ESLint → Yes
- Tailwind → Yes
- App Router → Yes
- src directory → Yes

---

## Step 2 — Install Dependencies

```bash
npm install prisma @prisma/client
npm install next-auth
npm install zod react-hook-form
npm install zustand
npm install @tanstack/react-query
npm install lucide-react
npm install date-fns
npm install bcryptjs
npm install sonner
```

---

## Step 3 — Install shadcn/ui

```bash
npx shadcn@latest init
```

Install:

- button
- card
- table
- dialog
- form
- select
- tabs
- textarea
- dropdown-menu
- toast

---

# 2. Setup Project Structure

## Step 4 — Create Folder Structure

```text
src/
 ├── app/
 ├── components/
 ├── lib/
 │    ├── auth/
 │    ├── db/
 │    ├── services/
 │    ├── validators/
 │    ├── workflow/
 │    ├── permissions/
 │    └── utils/
 ├── hooks/
 ├── store/
 ├── types/
 └── constants/
```

---

# 3. Database Setup

## Step 5 — Initialize Prisma

```bash
npx prisma init
```

---

## Step 6 — Setup PostgreSQL

Use:

- Neon
OR
- Supabase

Copy DATABASE_URL into `.env`

---

## Step 7 — Design Initial Schema

Build these models first:

- User
- GoalSheet
- Goal
- GoalAchievement
- CheckIn
- AuditLog

Do NOT build analytics tables yet.

---

## Step 8 — Run Migration

```bash
npx prisma migrate dev --name init
```

---

# 4. Authentication System

## Step 9 — Setup Auth.js

Implement:

- Credentials provider initially
- JWT sessions
- Role-based access

Roles:

- EMPLOYEE
- MANAGER
- ADMIN

---

## Step 10 — Create Route Protection

Protect:

```text
/employee
/manager
/admin
```

using middleware.

---

## Step 11 — Create Demo Accounts

Seed:

- 1 employee
- 1 manager
- 1 admin

This is critical for hackathon demos.

---

# 5. Build the Design System

## Step 12 — Create Reusable Components

Build:

- Sidebar
- Header
- Table wrapper
- Dashboard cards
- Modal system
- Empty states
- Form wrappers
- Status badges

AI works MUCH better when UI patterns are standardized.

---

# 6. Build Employee Flow FIRST

This is the core system.

---

# 7. Goal Creation Module

## Step 13 — Create Goal Form

Fields:

- Thrust Area
- Goal Title
- Description
- UoM Type
- Target
- Weightage

Use:

- React Hook Form
- Zod validation

---

## Step 14 — Add Validation Rules

Must enforce:

- Max 8 goals
- Min 10% weightage
- Total = 100%

IMPORTANT:

Validate on:

- frontend
- backend
- database when possible

---

## Step 15 — Build Goal Sheet Page

Features:

- Add goal
- Remove goal
- Edit goal
- Save draft
- Submit goals

---

## Step 16 — Build Submission Flow

Workflow:

```text
DRAFT → SUBMITTED
```

On submit:

- Lock employee editing
- Notify manager
- Create audit log

---

# 8. Manager Approval System

## Step 17 — Build Manager Dashboard

Show:

- Pending approvals
- Team members
- Goal statuses
- Check-in completion

---

## Step 18 — Build Approval UI

Manager can:

- Approve
- Reject
- Edit weightage
- Edit target
- Add comments

---

## Step 19 — Build Workflow Logic

Approval flow:

```text
SUBMITTED → UNDER_REVIEW → APPROVED
```

Reject flow:

```text
UNDER_REVIEW → REWORK_REQUIRED
```

---

## Step 20 — Lock Approved Goals

Once approved:

- Employee cannot edit
- Manager cannot edit
- Only admin can unlock

This is a critical BRD requirement.

---

# 9. Shared Goals System

## Step 21 — Create Shared Goal Architecture

DO NOT duplicate goals.

Create:

```text
SharedGoals
SharedGoalAssignments
```

---

## Step 22 — Build Shared Goal Assignment UI

Manager/Admin can:

- Select users
- Push departmental KPI
- Assign targets

Employee can only:

- Adjust weightage

---

## Step 23 — Sync Shared Goal Updates

When primary owner updates achievement:

- Sync all linked goals

This should happen automatically.

---

# 10. Quarterly Check-In System

## Step 24 — Create Check-In Module

Employees should:

- Update achievement
- Select status
- Add notes

Statuses:

- Not Started
- On Track
- Completed

---

## Step 25 — Build Progress Calculator

Create:

```text
/services/progress-calculator.ts
```

Handle:

- Min numeric
- Max numeric
- Timeline
- Zero-based

Keep ALL formulas centralized.

---

## Step 26 — Build Manager Check-In Review

Manager should:

- Compare target vs achievement
- Add check-in comments
- Track progress

---

# 11. Admin Panel

## Step 27 — Build Admin Dashboard

Admin controls:

- User management
- Unlock goals
- Configure cycles
- View audit logs
- Track completion

---

## Step 28 — Build Goal Unlock Flow

Only admin can:

```text
LOCKED → EDITABLE
```

Every unlock must create:

- audit log
- reason
- timestamp

---

# 12. Audit Logging

## Step 29 — Build Audit Middleware

Every major action should log:

- who changed it
- what changed
- when changed
- old value
- new value

---

## Step 30 — Track Critical Events

Track:

- goal creation
- edits
- approvals
- rejections
- unlocks
- achievement updates

---

# 13. Reporting System

## Step 31 — Build Achievement Report

Export:

- CSV
- Excel

Fields:

- employee
- target
- achievement
- status
- progress

---

## Step 32 — Build Completion Dashboard

Show:

- pending check-ins
- completed check-ins
- approval backlog
- department completion rates

---

# 14. Notifications System

## Step 33 — Build Notification Service

Trigger notifications for:

- submission
- approval
- rejection
- reminders
- check-ins

---

## Step 34 — Start with In-App Notifications

Do NOT start with:

- email
- Teams integration

Build internal notifications first.

Then extend later.

---

# 15. Background Jobs

## Step 35 — Setup Scheduler

Use:

- Inngest
OR
- Trigger.dev
OR
- node-cron

---

## Step 36 — Automate Quarterly Windows

System should:

- open windows
- close windows
- send reminders
- escalate delays

---

# 16. Analytics Module

ONLY after core flows are stable.

---

## Step 37 — Build Analytics APIs

Metrics:

- QoQ trends
- completion rates
- manager effectiveness
- department performance

---

## Step 38 — Build Visual Dashboards

Use:

- Recharts

Charts:

- line charts
- heatmaps
- progress bars
- department trends

---

# 17. Performance Optimization

## Step 39 — Add Query Optimization

Use:

- Prisma select
- pagination
- indexes
- relation optimization

---

## Step 40 — Add Caching

Cache ONLY:

- analytics
- dashboard summaries
- completion counts

Use Redis.

---

# 18. AI-Assisted Development Workflow

This is VERY important.

---

## Step 41 — Build One Vertical Slice at a Time

DO:

```text
UI → API → DB → Validation → Workflow
```

for ONE feature completely.

Example:

```text
Goal Creation
```

before moving to:

```text
Manager Approval
```

---

## Step 42 — Use AI for Boilerplate

Use AI for:

- CRUD routes
- Prisma queries
- form generation
- validation schemas
- UI scaffolding
- loading states
- table rendering

---

## Step 43 — DO NOT Use AI Blindly

Always verify:

- authorization
- validation
- workflow transitions
- edge cases
- database relations

AI commonly breaks enterprise workflows.

---

# 19. Suggested Development Order

# BEST BUILD ORDER

```text
1. Auth
2. Database
3. Employee Goal Creation
4. Submission Flow
5. Manager Approval
6. Goal Locking
7. Check-ins
8. Progress Calculation
9. Admin Panel
10. Audit Logs
11. Reports
12. Notifications
13. Analytics
14. Bonus Features
```

This minimizes bugs.

---

# 20. Testing Strategy

## Step 44 — Test Workflows Constantly

Test:

- role access
- invalid weightages
- approval flow
- locking flow
- shared goals
- quarterly updates
- edge cases

---

## Step 45 — Create Demo Scenarios

Prepare:

- employee submits goals
- manager approves
- employee updates quarterly progress
- admin unlocks goal

This helps during judging.

---

# 21. Deployment

## Step 46 — Deploy Frontend + Backend

Deploy on:

# Vercel

---

## Step 47 — Setup Production Database

Use:

- Neon
OR
- Supabase

---

## Step 48 — Setup Environment Variables

Configure:

```text
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
```

---

# 22. Final Polish

## Step 49 — Improve UX

Add:

- loading states
- skeletons
- empty states
- confirmation dialogs
- toast notifications
- validation messages

This dramatically improves evaluation scores.

---

## Step 50 — Prepare Architecture Diagram

Create:

- system architecture
- database flow
- approval workflow
- deployment diagram

Judges explicitly asked for this.

---

# 23. Most Important Engineering Principles

# Principle 1 — Keep Business Logic Centralized

DO NOT scatter:

- validation
- workflow logic
- progress formulas

across components.

---

# Principle 2 — Thin APIs

APIs should:

- validate
- call services
- return response

Nothing more.

---

# Principle 3 — Build Stable Workflows First

A stable workflow beats:

- fancy animations
- advanced charts
- complex infrastructure

in enterprise hackathons.

---

# Principle 4 — Use Type Safety Everywhere

Use TypeScript properly.

This reduces bugs massively.

---

# Principle 5 — Optimize for Demo Quality

Judges will mostly experience:

- workflows
- UX
- stability
- polish

Focus heavily there.

---

# 24. Recommended AI Prompts During Development

Use prompts like:

```text
Generate a Prisma schema for a role-based goal tracking system with employees, managers, quarterly achievements, approvals, and audit logs.
```

```text
Create a reusable React Hook Form + Zod form for goal creation using shadcn/ui.
```

```text
Generate a service-layer architecture for workflow transitions in a goal approval system.
```

```text
Create secure Next.js middleware for role-based route protection.
```

---

# 25. Biggest Mistakes to Avoid

## DO NOT

- hardcode roles
- duplicate business logic
- trust frontend validation
- skip audit logs
- build analytics first
- overcomplicate architecture
- build too many generic abstractions
- ignore edge cases

---

# 26. Final MVP Checklist

Before demo day ensure:

- Auth works
- Role routing works
- Goal creation works
- Validation works
- Approval flow works
- Goals lock correctly
- Check-ins work
- Reports export correctly
- Audit logs exist
- Dashboard loads fast
- No critical crashes

---

# 27. Winning Strategy

To maximize evaluation score:

## Prioritize

1. Functional stability
2. Clean workflows
3. Strong RBAC
4. Smooth UX
5. Realistic enterprise structure
6. Auditability
7. Cost efficiency

---

## Deprioritize

- microservices
- overengineering
- premature optimization
- unnecessary AI features
- complicated infra

---

# 28. Final Conclusion

The smartest way to build this portal is:

# Vertical Slice Development + Modular Monolith Architecture

This approach:

- minimizes bugs
- maximizes development speed
- keeps AI-generated code manageable
- creates enterprise-quality workflows
- fits hackathon timelines perfectly

---

# Reference

This guide is based on the AtomQuest Hackathon 1.0 BRD requirements. fileciteturn0file0

