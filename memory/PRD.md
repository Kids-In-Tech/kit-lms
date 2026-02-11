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
├── frontend/src/ (React SPA)
│   ├── pages/admin/ (Dashboard, Courses, Users, Assignments)
│   ├── pages/student/ (Dashboard, CourseView, QuizView)
│   ├── pages/instructor/
│   ├── components/ (ConfirmModal, Header, Layout, Sidebar, RichTextEditor)
│   └── context/AuthContext.js
├── backend/server.py (FastAPI monolith)
└── memory/PRD.md
```

## Key DB Collections
- users, courses, modules, lessons, quizzes, assignments, enrollments, certificates, cert_templates, notifications, activity_logs, settings, roles, user_sessions, quiz_attempts, submissions

## Credentials
- Admin: admin@kidsintech.school / innovate@2025
- Instructors: sarah/james/maria@kidsintech.school / instructor123
- Students: liam@student.kidsintech.school / student123

---

## What's Been Implemented

### Phase 1 (Complete)
- JWT auth (login, register, logout, forgot/reset password)
- Google OAuth stub
- Admin dashboard with analytics
- Student dashboard with enrolled courses
- Course CRUD with modules & lessons
- User management (CRUD, suspend/reactivate)
- Responsive sidebar + header
- KIT branding & design system
- Seed data endpoint

### Bug Fixes - Dec 8, 2025 (Complete, Tested)
1. **Course Enrollment (P0):** Created `POST /api/admin/students/enroll` endpoint with sync logic (add/remove). Frontend Users.js saves enrollments on user save.
2. **UI Enrollment State (P0):** `GET /api/users/{id}` now returns `enrolled_courses` array. View user modal shows enrolled courses with progress. Edit form pre-populates checkboxes. Student dashboard correctly displays enrolled courses.
3. **Modal Fullscreen Blur (P1):** ConfirmModal + Users.js modals now lock body scroll (`overflow: hidden`) when open. Already had correct `fixed inset-0` positioning.
4. **Certificate Auto-Generation (P1):** `POST /api/courses` with `certificate_enabled=true` auto-creates a `cert_templates` document.

---

## Backlog

### P1 - Upcoming
- Rich Text Editor integration for Lessons (react-quill in lesson modal)
- Instructor Role implementation (permissions, dashboard)
- Student Quiz View (take quizzes, submit, see results)

### P2
- Student Course Progression (sequential lesson completion)
- Drag-and-Drop Reordering (modules/lessons)
- Announcements UI (admin create/broadcast, user view)

### P3 - Future
- Email notifications
- CSV/PDF export
- File upload manager
- Gamification (points, badges)
- Advanced analytics & audit logs
- WebSocket real-time updates
