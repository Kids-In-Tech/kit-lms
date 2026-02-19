# Kids In Tech (KIT) LMS - Product Requirements Document

## Original Problem Statement
Build a comprehensive, production-ready Learning Management System (LMS) for "Kids In Tech" (KIT) with Super Admin, Instructor, and Student roles.

## Tech Stack
- **Backend:** Python (FastAPI), MongoDB
- **Frontend:** React, Tailwind CSS
- **Auth:** JWT + Emergent Google OAuth (stubbed)
- **Design:** Light theme, KIT Design System (PolySans/Space Mono fonts)

## Core Architecture
```
/app
├── frontend/src/
│   ├── context/ (AuthContext, LanguageContext)
│   ├── pages/admin/ (Dashboard, Courses, Users, Assignments)
│   ├── pages/student/ (Dashboard, CourseView, QuizView)
│   ├── pages/instructor/
│   ├── components/ (ConfirmModal, Header, Layout, Sidebar, RichTextEditor)
│   └── api.js
├── backend/server.py (FastAPI monolith)
└── memory/PRD.md
```

## Key DB Collections
- users, courses, modules, lessons, quizzes, assignments, enrollments, certificates, cert_templates, notifications, activity_logs, settings, roles, user_sessions, quiz_attempts, submissions

## Credentials
- Admin: admin@kidsintech.school / innovate@2025
- Instructors: sarah/james/maria@kidsintech.school / instructor123
- Students: ethan/ava/mason/sophia/lucas/isabella/noah/amina@student.kidsintech.school / 123456

---

## What's Been Implemented

### Phase 1 — Foundation (Complete)
- JWT auth (login, register, logout, forgot/reset password)
- Google OAuth stub
- Admin dashboard with analytics
- Student dashboard with enrolled courses
- Course CRUD with modules & lessons
- User management (CRUD, suspend/reactivate)
- Responsive sidebar + header
- KIT branding & design system
- Seed data endpoint

### Bug Fixes — Dec 8, 2025 (Complete, Tested)
1. Course Enrollment: `POST /api/admin/students/enroll` with sync logic
2. UI Enrollment State: enriched user detail + student dashboard
3. Modal Fullscreen Blur: body scroll lock
4. Certificate Auto-Generation: on course creation

### Major Feature Update — Dec 2025 (Complete, Tested)

**Section 1: Course Update Propagation**
- `recalc_enrollment_progress()` recalculates all enrolled students when content is added/removed
- Completed students see new content, progress recalculates dynamically
- Course `updated_at` timestamp bumped on module/lesson creation

**Section 2: Lesson Editor Cursor Fix**
- RichTextEditor rewritten to use `contentEditable` with `onInput` handler
- `isInitialized` ref prevents cursor jumping by only setting innerHTML on mount

**Section 3: System-wide Notification Engine**
- `send_notification()` helper triggers on: course/module/lesson/quiz/assignment creation, user creation, course completion
- DB-persisted notifications with `is_read` flag per user
- Notification drawer in header with unread badge
- 15s polling for real-time updates

**Section 4: Student Dashboard Reorganization**
- Active / Completed / Newly Updated tabs
- Completed courses fully accessible (not locked)
- 20s polling for live data sync

**Section 5: Live Data Sync**
- All dashboards poll every 15-20s for fresh data
- `useCallback` + `setInterval` pattern across all major pages

**Section 6: Language Toggle (EN/Hausa)**
- `LanguageContext` with i18n dictionary (EN and HA translations)
- Header globe toggle with dropdown
- Per-user preference saved to DB + localStorage
- Instant UI update without reload
- Covers: navigation, dashboard, buttons, forms, notifications

**Section 7: Modal & Toast Consistency**
- All modals: `position: fixed`, `inset-0`, `backdrop-blur-sm`
- Body scroll locked when modal is open
- Consistent toast styling

**Section 8: Data Persistence**
- All changes save to MongoDB, persist after refresh

---

## Backlog

### P1 — Upcoming
- Rich Text Editor fully integrated into lesson creation modal
- Instructor Role implementation (permissions, own dashboard)
- Student Quiz View (take quizzes, submit, see results)

### P2
- Student Course Progression (sequential lesson completion enforcement)
- Drag-and-Drop Reordering (modules/lessons)
- Announcements UI (admin create/broadcast, user view)

### P3 — Future
- Email notifications
- CSV/PDF export
- File upload manager
- Gamification (points, badges)
- Advanced analytics & audit logs
- WebSocket real-time updates (replace polling)
