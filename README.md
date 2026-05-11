# DegreePilot AI

**DegreePilot AI** is a front-end prototype of an academic command center for students. It brings courses, tasks, grades, planning, and AI-style assistant tools into one browser-based experience. Data is stored locally in the browser (demo / prototype—no real backend or university integration).

**Course context:** CSC 150 — Elements of AI (final project).

---

## Live site (GitHub Pages)

**URL:** [https://roberto150-bit.github.io/RobertoPollicino_M5_FinalProject/](https://roberto150-bit.github.io/RobertoPollicino_M5_FinalProject/)

If that link returns **404**, enable Pages once in the repository: **Settings → Pages → Build and deployment → Deploy from a branch → Branch: `main` → Folder: `/ (root)` → Save.** The site should appear within about a minute.

---

## What this project does

DegreePilot AI simulates a single place to track the semester: see what is due, check grade trends, read announcements, plan study time, draft emails to instructors, explore financial-aid-style tools, and adjust profile preferences. Everything runs as static HTML, CSS, and JavaScript; persistence uses **localStorage** with seeded sample data so you can click through realistic flows without signing in to a real server.

---

## Features

- **Marketing / onboarding:** Landing (`home.html`), product tour (`how-it-works.html`), feature overview (`features.html`), student-focused page (`for-students.html`), getting started (`get-started.html`).
- **Sign-in (demo):** `signin.html` for the prototype entry flow.
- **Dashboard:** `dashboard.html` — overview, navigation shell, and deep links into workspaces.
- **Academic workspace:** Courses (`courses.html`), tasks (`tasks.html`), calendar (`calendar.html`), study center (`study-center.html`), grades (`grades.html`), announcements / updates (`updates.html`).
- **Communication Assistant:** `communication.html` — scenario-based email drafting and variants for instructor outreach.
- **Financial Aid workspace:** `financial-aid.html` — aid-focused dashboards (e.g. trackers, alerts, scholarship-style samples, FAFSA helper UI).
- **Profile & settings:** `settings.html` — preferences, notifications, security strip, reset/logout flows tied to local profile state.
- **Local-first data:** Seed data and storage helpers (`js/seed.js`, `js/storage.js`, dashboard core) so state survives refresh during the demo.

---

## Tech stack

- **HTML5**, **CSS** (including shared `css/common.css`, page-specific stylesheets, dashboard styles)
- **JavaScript** (vanilla) for UI, routing-style navigation, and localStorage
- **Tailwind CSS** (CDN) on selected marketing pages
- **No build step** — open files directly or serve the folder with any static file server

---

## Getting started (local)

1. Clone the repository.
2. Open `index.html` in a browser (it redirects to `home.html`), **or** run a static server from the project root, for example:
   - **Python:** `python -m http.server 8080`
   - **Node (npx):** `npx serve .`
3. Visit `http://localhost:8080` (or the URL your tool prints).

Signing in and using features will read/write **localStorage** in your browser.

---

## Repository layout (high level)

| Area | Role |
|------|------|
| `*.html` | Page shells (landing, dashboard, workspaces) |
| `css/` | Shared and page-specific styles |
| `js/` | App logic, storage, seeds, dashboard and page scripts |
| `assets/` | Images, logos, icons |

---

## License / academic use

This repository is submitted as coursework. Reuse or redistribution outside course requirements should follow your instructor’s policy.
