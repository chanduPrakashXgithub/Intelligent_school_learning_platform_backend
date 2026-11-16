# School Learning Platform — Backend Development Master Plan

## 1. Executive Overview

The School Learning Platform is an **Intelligent School Learning Ecosystem** engineered on a concept-driven educational philosophy:
> *"Don't just measure whether a student completed a lesson. Understand whether the student learned the concept, identify what the student is struggling with, and help the teacher decide what to do next."*

The backend is built as a single deployable **Modular Monolith** using **Node.js, Express.js, and MySQL 8.4**, strictly isolated by school tenancy (`school_id`).

---

## 2. Platform Architecture Baseline

```
                                  Client Layer
                 (React Web Apps: Teacher, Student, School Admin)
                                        │
                                        ▼
                   Express.js HTTP & WebSocket Gateway (/api/v1)
                                        │
                        Global Middlewares & Security
           [X-Request-ID] ➔ [Helmet] ➔ [CORS] ➔ [Body Parse]
                                        │
                                        ▼
                               Authentication
           [JWT Verification (HS256)] ➔ [Active Account & School Check]
                                        │
                                        ▼
                           Tenant Context & Isolation
              [Server-Authoritative req.context.schoolId Binding]
              [Rejection of Client-Supplied Tenant Identifiers]
                                        │
                                        ▼
                              Role Authorization
             [RBAC: SCHOOL_ADMIN | TEACHER | STUDENT Allowlist]
                                        │
                                        ▼
                           Teacher Assignment Scope
               [ABAC: Verifies teacher_assignments in Section]
                                        │
                                        ▼
                               Request Validation
                      [Zod Schema: Body, Query, Params]
                                        │
                                        ▼
                             Modular Domain Modules
       ┌──────────────────┬──────────────────┬──────────────────┐
       │   Module 0       │   Module 1       │   Module 2       │
       │ Shared Backend   │ Teacher          │ Teaching Studio  │
       │ Foundation       │ Dashboard        │ (5-stage builder)│
       ├──────────────────┼──────────────────┼──────────────────┤
       │   Module 3       │   Module 4       │   Module 5       │
       │ Live Classroom   │ My Classes &     │ Assessment       │
       │ (WebSocket)      │ Students         │ Management       │
       ├──────────────────┼──────────────────┼──────────────────┤
       │   Module 6       │   Module 7       │   Module 8       │
       │ Timetable &      │ Learning         │ Communication &  │
       │ Calendar         │ Analytics        │ Notifications    │
       ├──────────────────┴──────────────────┴──────────────────┤
       │   Module 9: Teaching Resources | Module 10: Profile    │
       └────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                          Core Data Access Layer
                   [BaseRepository] ➔ [withTransaction]
                                        │
                                        ▼
                        MySQL 8.4 Relational Database
               [InnoDB, Composite Tenant Foreign Keys, Pooling]
```

### 2.1 Core Architectural Principles
1. **Modular Monolith**: Single repository and deployable runtime. Cross-module communication occurs via in-process service interfaces, avoiding premature microservice network latency and distributed state complexity.
2. **Server-Authoritative Multi-Tenancy**: `school_id` is derived exclusively from validated JWT claims. Any client attempting to supply `school_id` via headers, body, or query params is blocked with `403 Forbidden` (`CLIENT_TENANT_OVERRIDE`).
3. **Composite Foreign Key Relational Isolation**: Multi-tenant database tables enforce compound foreign keys `(school_id, parent_id)` referencing `(school_id, id)`. This ensures that cross-school data relationships are physically impossible at the database engine level.
4. **Zero-Trust Input Validation**: Every endpoint validates `body`, `query`, and `params` against strict Zod schemas before reaching business services.
5. **Standardized Communication Contracts**: All responses adhere to the standard envelope `{ success, data, meta: { requestId }, error }`.

---

## 3. Academic Structure Hierarchy

```
School
  └── Academic Year (e.g. 2026-2027)
        └── Class (Grades 1 to 10)
              └── Section (A, B, etc.)
                    └── Subject (Mathematics, Science, etc.)
                          └── Unit
                                └── Chapter
                                      └── Topic
                                            └── Lesson (5-Stage Structured Document)
```

---

## 4. Complete Module Breakdown

| Module | Title | Primary Responsibility | Data Ownership Rule |
| :--- | :--- | :--- | :--- |
| **Module 0** | Shared Backend Foundation | Runtime, MySQL pool, migrations, auth, tenancy, validation, error handling | Owns `schools`, `academic_years`, `classes`, `sections`, `subjects`, `users`, `teacher_assignments` |
| **Module 1** | Teacher Dashboard | Operational cockpit aggregating daily schedules, tasks, drafts, and alerts | **0 new core tables**; pure read-model projection over Modules 2, 5, 6, 8 |
| **Module 2** | Teaching Studio | 5-stage lesson builder, presentation editor, animation timeline, immutable versions | Owns `lessons`, `lesson_versions`, `lesson_stages`, `lesson_blocks`, `slide_elements` |
| **Module 3** | Live Classroom | Real-time classroom delivery, WebSocket slide sync, live polls, doubt queue | Owns `classroom_sessions`, `classroom_participants`, `classroom_polls`, `classroom_questions` |
| **Module 4** | My Classes & Students | Authorized section rosters, student search, student learning profiles | **0 new core tables**; read-only projection over `classes`, `sections`, `users` |
| **Module 5** | Assessment Management | 12 question types, rubrics, section scheduling, attempts, auto/manual grading | Owns `assessments`, `assessment_versions`, `assessment_questions`, `student_attempts`, `grades` |
| **Module 6** | Teacher Timetable & Calendar | Weekly recurring schedules, date exceptions, room allocations, school timezone | Owns `timetable_entries`, `timetable_exceptions`, `calendar_events` |
| **Module 7** | Learning Performance & Analytics | Topic mastery heatmaps, concept gaps, review queues, evidence-based metrics | Read-oriented engine consuming completed assessments and live poll telemetry |
| **Module 8** | Communication & Notifications | Direct messages, class broadcasts, school announcements, alert inbox | Owns `conversations`, `messages`, `notifications`, `notification_preferences` |
| **Module 9** | Teaching Resources | Central approved curriculum assets, media attachments, pre-signed upload tickets | Shares `content_items` and `media_assets` with Teaching Studio |
| **Module 10** | Teacher Profile & Settings | Professional biography, contact updates, UI theme, regional preferences | Extends `users` with `teacher_profiles` and `teacher_settings` |

---

## 5. Implementation Sequence & Long-Term Roadmap

```
Module 0: Shared Backend Foundation [COMPLETED & AUDITED]
   │
   ▼
Module 1: Core Academic Models & Curriculum Structure (Units, Chapters, Topics)
   │
   ▼
Module 2: Teaching Studio (5-Stage Builder & Immutable Versioning)
   │
   ▼
Module 6: Teacher Timetable & Calendar (Occurrence Expansion & Exception Engine)
   │
   ▼
Module 4: My Classes & Students (Authorized Rosters & Safe Search)
   │
   ▼
Module 1: Teacher Dashboard (Consolidated Read-Time Aggregator)
   │
   ▼
Module 5: Assessment Management (Question Bank, Rubrics & Grading)
   │
   ▼
Module 3: Live Classroom (WebSocket Gateway & Delivery Engine)
   │
   ▼
Module 7: Learning Performance & Analytics (Mastery & Intervention Queues)
   │
   ▼
Module 8 & 9: Communication, Notifications & Teaching Resources
   │
   ▼
Module 10: Teacher Profile, Settings & Production Hardening
```

---

## 6. Approved Technical Stack

- **Runtime Environment**: Node.js v24.12.0 (Active LTS)
- **Web Framework**: Express.js 5.3+
- **Database Engine**: MySQL 8.4 Server (InnoDB engine, utf8mb4 collation)
- **Database Driver**: `mysql2/promise` (connection pooling, parameterized prepared statements)
- **Schema Validation**: Zod 4.6+
- **Authentication**: Stateless JSON Web Tokens (`jsonwebtoken`, HS256 algorithm)
- **Password Hashing**: `bcrypt` (12 salt rounds)
- **Security Middleware**: `helmet` (HTTP header protection), `cors` (origin allowlist)
- **Test Framework**: Node.js Native Test Runner (`node:test`, `node:assert/strict`)
