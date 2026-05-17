# AtomQuest — Detailed Architecture Diagram

## 1. System Overview (Top-Down Flow)

```mermaid
flowchart TD
    subgraph CLIENT["🌐 Browser / Client"]
        direction LR
        EMP["Employee Dashboard\n/employee"]
        MGR["Manager Dashboard\n/manager"]
        ADM["Admin Dashboard\n/admin"]
        LOGIN["Login Page\n/auth/login\n(GSAP 2-col split)"]
    end

    subgraph PROXY["🔒 Route Guard — src/proxy.ts\n(NextAuth withAuth wrapper)"]
        direction LR
        PX["Checks JWT token role\n• /admin → ADMIN only\n• /manager → MANAGER | ADMIN\n• /employee → any authenticated\nRedirects unauthorized to /"]
    end

    subgraph NEXTAUTH["🔑 NextAuth.js — JWT Strategy"]
        direction TB
        CRED["Credentials Provider\n(email + bcrypt password)"]
        JWT["JWT 8h expiry\n15m role refresh from DB\nRole embedded in token"]
        SESS["getServerSession()\nused in all API routes"]
    end

    subgraph API["⚡ API Routes — /app/api/"]
        direction TB
        GOALS_API["/api/goals"]
        CHECKIN_API["/api/check-ins\n+ /review"]
        MGR_API["/api/manager\n/approve /reject /update-goals"]
        SHARED_API["/api/shared-goals\n/assign /sync-achievement"]
        NOTIF_API["/api/notifications"]
        ADMIN_API["/api/admin\n/stats /users /analytics\n/audit-logs /reminders\n/unlock-sheet /scheduler"]
        EMP_API["/api/employee\n/audit-logs"]
        USER_API["/api/user"]
        AUTH_API["/api/auth/[...nextauth]"]
    end

    subgraph SERVICES["🧠 Service Layer — src/lib/services/"]
        direction TB
        GS["GoalService\nCRUD, submit, weight validation"]
        MS["ManagerService\napprove, reject, update goals"]
        CS["CheckInService\nself-assessment, manager review"]
        SGS["SharedGoalService\ncreate, assign, sync achievements"]
        AS["AdminService\nstats, users, analytics, unlock, reminders"]
        ANS["AnalyticsService\nmanager effectiveness, trends"]
        NS["NotificationService\ncreate notifications"]
        SS["SchedulerService\ntick, windows, reminders, escalations, cleanup"]
        CACHE["CacheService\nRedis get/set/invalidate\ndistributed locking"]
        RL["RateLimitService\nper-user sliding window"]
        PC["ProgressCalculator\nweighted score computation"]
    end

    subgraph DB["🗄️ PostgreSQL — Supabase\n(via Prisma 7 + PgBouncer)"]
        direction LR
        PGDB[("PostgreSQL DB\nPort 5432 direct\nPort 6543 pooled")]
    end

    subgraph REDIS["⚡ Upstash Redis\n(Serverless REST API)"]
        direction LR
        RDB[("Redis KV Store\n• Rate limit counters\n• Analytics cache\n• Distributed locks")]
    end

    subgraph CRON["⏰ Vercel Cron Jobs"]
        VCRON["vercel.json\nschedule: 0 * * * *\nGET /api/admin/scheduler\nAuthorization: Bearer CRON_SECRET"]
    end

    CLIENT --> PROXY
    LOGIN --> NEXTAUTH
    PROXY --> CLIENT
    PROXY --> API
    NEXTAUTH --> API
    API --> SERVICES
    SERVICES --> DB
    SERVICES --> REDIS
    CRON --> API
```

---

## 2. Frontend — Role-Based Dashboards

```mermaid
flowchart LR
    subgraph EMP_DASH["Employee Dashboard /employee"]
        E1["Goals Tab\n• View goal sheet\n• Draft/edit/submit goals\n• Weighted progress gauge"]
        E2["Check-Ins Tab\n• Submit quarterly self-assessment\n• Achievement values per goal"]
        E3["Audit Logs Tab\n• Personal action history"]
        E4["Notifications Bell\n• Unread count badge\n• Paginated feed\n• Click to navigate"]
    end

    subgraph MGR_DASH["Manager Dashboard /manager"]
        M1["Approval Queue\n• Review subordinate goal sheets\n• Approve / Reject with comment\n• Edit targets & weightage"]
        M2["Check-In Reviews\n• View employee self-assessments\n• Add manager feedback"]
        M3["Shared Goals\n• Create org-wide goals\n• Assign to multiple employees\n• Sync achievement values"]
        M4["Team Overview\n• At-a-glance team progress"]
    end

    subgraph ADM_DASH["Admin Dashboard /admin"]
        A1["System Stats\n• Submission / approval rates\n• Department completion %"]
        A2["User Management\n• Create/edit users\n• Assign roles & managers"]
        A3["Analytics\n• Manager effectiveness\n• Completion trends\n• Achievement breakdown"]
        A4["Operations\n• Unlock approved sheets\n• Send broadcast reminders\n• Manual scheduler trigger"]
        A5["Audit Logs\n• Full system action trail"]
    end
```

---

## 3. Authentication & Route Guard Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Proxy as proxy.ts (withAuth)
    participant NextAuth as NextAuth.js
    participant DB as PostgreSQL

    Browser->>Proxy: Request /employee/goals
    Proxy->>NextAuth: Verify JWT token
    alt No token
        NextAuth-->>Proxy: token = null
        Proxy-->>Browser: Redirect → /
    else Token exists
        NextAuth-->>Proxy: token = { role: EMPLOYEE, ... }
        alt Wrong role for path
            Proxy-->>Browser: Redirect → /
        else Correct role
            Proxy-->>Browser: NextResponse.next() ✅
        end
    end

    Note over NextAuth,DB: Every 5 minutes, role is revalidated from DB
    NextAuth->>DB: SELECT role FROM User WHERE id = token.sub
    DB-->>NextAuth: Fresh role value
```

---

## 4. Goal Sheet Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Employee creates sheet
    DRAFT --> SUBMITTED : Employee submits\n(weight must = 100%)
    SUBMITTED --> UNDER_REVIEW : Manager opens for review
    UNDER_REVIEW --> APPROVED : Manager approves
    UNDER_REVIEW --> REWORK_REQUIRED : Manager rejects\n(with comment)
    REWORK_REQUIRED --> DRAFT : Employee re-edits
    APPROVED --> DRAFT : Admin unlocks sheet
    APPROVED --> [*] : Cycle closed
```

---

## 5. Quarterly Check-In Flow

```mermaid
sequenceDiagram
    participant Cron as Vercel Cron (hourly)
    participant Scheduler as SchedulerService
    participant DB as PostgreSQL
    participant Employee
    participant Manager

    Cron->>Scheduler: tick()
    Scheduler->>DB: Find UPCOMING windows where startDate ≤ now
    DB-->>Scheduler: Windows to open
    Scheduler->>DB: UPDATE status → OPEN + bulk notify all employees
    DB-->>Employee: 🔔 "Q2 Check-In Window OPEN"

    Employee->>DB: POST /api/check-ins (notes + achievement values)

    Note over Cron,Scheduler: 3 days before endDate
    Scheduler->>DB: Find employees with APPROVED sheet but no check-in
    Scheduler->>DB: CREATE urgent reminder notifications
    DB-->>Employee: 🔔 "Urgent: Q2 closes in 2 days"

    Scheduler->>DB: Find OPEN windows where endDate ≤ now
    Scheduler->>DB: UPDATE status → CLOSED + notify employees

    Note over Cron,Scheduler: Post-close escalation
    Scheduler->>DB: Find employees who missed closed window
    Scheduler->>DB: CREATE escalation notifications for managers
    DB-->>Manager: 🔔 "Escalation: John Doe missed Q2 check-in"

    Manager->>DB: POST /api/check-ins/review (add feedback)
```

---

## 6. Scheduler — Distributed Lock & Concurrency Control

```mermaid
flowchart TD
    TRIGGER["Cron Trigger\nGET /api/admin/scheduler\n+ Bearer token"]
    AUTH{"Auth valid?\nBearer === CRON_SECRET\nor Admin session"}
    REDIS_CHECK{"Upstash Redis\nconfigured?"}
    REDIS_LOCK["tryAcquireLock\nscheduler key, TTL=120s"]
    PG_LOCK["pg_try_advisory_lock\n889988"]
    LOCKED{"Lock acquired?"}
    SKIP["Skip tick\n⚠️ Already running"]
    EXEC["Execute tick\n1. Window transitions\n2. Automatic reminders\n3. Delay escalations\n4. Data retention cleanup"]
    RELEASE_R["releaseLock Redis"]
    RELEASE_P["pg_advisory_unlock\n889988"]
    INVALIDATE["Invalidate analytics\ncache if state changed"]

    TRIGGER --> AUTH
    AUTH -- ❌ --> 401["401 Unauthorized"]
    AUTH -- ✅ --> REDIS_CHECK
    REDIS_CHECK -- Yes --> REDIS_LOCK
    REDIS_CHECK -- No --> PG_LOCK
    REDIS_LOCK --> LOCKED
    PG_LOCK --> LOCKED
    LOCKED -- No --> SKIP
    LOCKED -- Yes --> EXEC
    EXEC --> INVALIDATE
    EXEC --> RELEASE_R
    EXEC --> RELEASE_P
```

---

## 7. Data Model — Entity Relationship

```mermaid
erDiagram
    User {
        string id PK
        string name
        string email UK
        string password
        Role role
        string managerId FK
    }

    GoalSheet {
        string id PK
        string userId FK
        string cycleId
        GoalStatus status
        string managerComment
    }

    Goal {
        string id PK
        string goalSheetId FK
        string thrustArea
        string title
        UomType uomType
        float target
        int weightage
        string sharedGoalId FK
    }

    GoalAchievement {
        string id PK
        string goalId FK
        int quarter
        float value
        string status
        string checkInId FK
    }

    CheckIn {
        string id PK
        string userId FK
        string cycleId
        int quarter
        string notes
        string managerComment
    }

    SharedGoal {
        string id PK
        string creatorId FK
        string thrustArea
        string title
        UomType uomType
        float target
    }

    SharedGoalAssignment {
        string id PK
        string sharedGoalId FK
        string userId FK
    }

    CycleWindow {
        string id PK
        string cycleId
        int quarter
        DateTime startDate
        DateTime endDate
        string status
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string entityType
        string entityId
        Json oldValue
        Json newValue
    }

    Notification {
        string id PK
        string userId FK
        string title
        string type
        boolean isRead
    }

    User ||--o{ GoalSheet : "has"
    User ||--o{ CheckIn : "submits"
    User ||--o{ AuditLog : "generates"
    User ||--o{ Notification : "receives"
    User ||--o{ User : "manages (hierarchy)"
    User ||--o{ SharedGoalAssignment : "assigned"
    User ||--o{ SharedGoal : "creates"

    GoalSheet ||--o{ Goal : "contains"
    Goal ||--o{ GoalAchievement : "tracks"
    CheckIn ||--o{ GoalAchievement : "links"
    SharedGoal ||--o{ Goal : "linked to"
    SharedGoal ||--o{ SharedGoalAssignment : "assigned via"
```

---

## 8. Redis — Caching & Rate Limiting Architecture

```mermaid
flowchart LR
    subgraph REDIS_USES["Upstash Redis Usage"]
        direction TB
        RL["Rate Limiting\nSliding window counter\nper user per endpoint\n30–60 req/min"]
        CACHE["Analytics Cache\nAdmin stats\nManager effectiveness\nTTL-based invalidation"]
        LOCK["Distributed Lock\nscheduler key\nTTL=120s\nPrevents overlapping ticks"]
    end

    subgraph FALLBACK["Fallback (No Redis)"]
        PGA["PostgreSQL Advisory Lock\npg_try_advisory_lock(889988)\nfor scheduler concurrency"]
        DEV["Dev mode:\nIn-memory rate limit\n(non-distributed)"]
    end

    API_ROUTES["API Routes"] --> RL
    ADMIN_API2["Admin API"] --> CACHE
    SCHED["SchedulerService.tick()"] --> LOCK
    LOCK -- "Redis unavailable" --> PGA
    RL -- "Redis unavailable\nin production → fail fast" --> ERR["500 error\n(prevents silent bypass)"]
```

---

## 9. Security Layers

```mermaid
flowchart TD
    REQ["Incoming Request"] --> HDR["Security Headers\nHSTS, X-Frame-Options: DENY\nX-Content-Type: nosniff\nReferrer-Policy, Permissions-Policy"]
    HDR --> GUARD["Route Guard\nsrc/proxy.ts\nJWT role enforcement"]
    GUARD --> RATE["Rate Limiter\n30–60 req/min per user\nSliding window in Redis"]
    RATE --> VALIDATE["Input Validation\nZod schemas\nMax 2000 char free-text\nType-safe parsing"]
    VALIDATE --> AUTH2["API-level Auth\ngetServerSession()\nrole check per handler"]
    AUTH2 --> EXEC2["Business Logic\nService Layer"]
    EXEC2 --> ERR2["Error Sanitization\nsafeErrorResponse()\nNo internal leakage"]
```
