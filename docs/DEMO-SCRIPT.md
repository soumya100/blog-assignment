# 5–10 Minute Presentation & Demo Script

**Project Target**: DevLog Enterprise Secure MERN Blog Platform  
**Target Audience**: Engineering Hiring Managers & Senior Technical Assessors  
**Presenter Role**: Senior Full-Stack MERN + Application Security Engineer  
**Duration**: 8–10 minutes  

---

## Demo Agenda Overview

| Time | Phase | Target Demonstration | Talking Points |
| :--- | :--- | :--- | :--- |
| **0:00 – 1:30** | System Overview & Architecture | Monorepo structure, layering, and database dual-mode | Monorepo organization, embedded MongoMemoryServer fallback, service-layer isolation |
| **1:30 – 3:30** | Authentication & Security Controls | Registration, Login, HttpOnly Refresh Token Rotation | Passwords hashed with bcrypt (12 rounds), JWT 15m expiration, token family replay attack defense, rate limiting |
| **3:30 – 5:30** | Core Content & Real-Time Discussion | Create, Edit, Soft-Delete Posts, Real-time Comments | URL-friendly slugs, BOLA/IDOR protection via ownership middleware, Socket.io duplex broadcasts |
| **5:30 – 7:30** | Admin Panel & RBAC Governance | Admin Dashboard, Metric Cards, User Deactivation | Server-side role enforcement, demote-last-admin prevention, instant session revocation on deactivation |
| **7:30 – 9:00** | VAPT Audit & Automated Test Results | 41 Jest/Supertest tests, 37 OWASP test cases in Excel | NoSQL injection sanitization, security headers, VAPT audit findings, Excel matrix with artifact mapping |
| **9:00 – 10:00** | Q&A & Wrap-Up | Key architectural decisions & production readiness | Stateless scalability vs stateful revocation, zero-config onboarding |

---

## Detailed Step-by-Step Script

### Step 1: System Scaffolding & Architecture (0:00 – 1:30)

* **Action**: Open terminal and browser showing the clean monorepo layout.
* **Talking Points**:
  > "Hello everyone. Today I'm presenting DevLog, an enterprise-grade secure MERN blogging platform built from scratch.
  >
  > Architecturally, we designed this as a decoupled monorepo: `server/` houses the Express API with dedicated service, controller, and middleware layers, while `client/` is a modern React 18 SPA built with Vite, TanStack Query, and a Linear/Vercel-inspired design system.
  >
  > Notice that when spinning up the project, it automatically connects to a standard `MONGODB_URI` if provided; however, to guarantee zero-friction evaluation for reviewers, our connection manager automatically boots an embedded `MongoMemoryServer` if no external database daemon is detected."

---

### Step 2: Authentication & Security Controls (1:30 – 3:30)

* **Action**:
  1. Navigate to `/register`.
  2. Enter a weak password like `pass123`. Observe real-time password requirement indicators.
  3. Enter a strong password `UserPass123!` and complete registration.
  4. Open Chrome DevTools -> Application -> Cookies. Highlight `refreshToken` with `HttpOnly`, `Path=/`, and `SameSite=Lax`.
  5. Demonstrate **Quick Login Pre-fills** on `/login` for quick evaluation.
  6. Open Dev Sandbox OAuth Modal and complete a simulated Google / Facebook OAuth login.
* **Talking Points**:
  > "Security starts with authentication. On our registration page, passwords are validated using Zod for 5 distinct complexity constraints and hashed using bcrypt with 12 salt rounds before touching persistence.
  >
  > For session management, we implemented a hybrid token architecture:
  > - Access tokens are short-lived (15 minutes) and signed using pinned HMAC-SHA256.
  > - Refresh tokens are transmitted strictly via `HttpOnly` cookies to make client-side token theft via XSS impossible.
  > - Furthermore, each refresh token is stored as a SHA-256 hash in a cryptographic session family. When refreshed, the previous token is marked revoked. If an attacker attempts to replay an old token, our server detects the reuse anomaly immediately and revokes all active sessions for that user family.
  > - We've also added brute-force rate-limiting on all authentication endpoints, capping attempts at 10 requests per 15 minutes."

---

### Step 3: Blog Posts & Real-Time Comments (3:30 – 5:30)

* **Action**:
  1. Click **Write Post** and enter title: `Scaling Distributed Systems with Node.js`.
  2. Show live slug preview: `/posts/scaling-distributed-systems-with-node-js`.
  3. Submit article. Notice the article is immediately visible and a live Toast notification pops up in real time via Socket.io.
  4. Edit the article title; notice the slug updates cleanly while preserving URL integrity.
  5. Post a comment in the discussion section. Open a second incognito browser window and watch the comment appear instantly without reloading.
  6. Attempt to edit another user's post by tampering with the URL ID — show the HTTP 403 Forbidden rejection (IDOR / BOLA defense).
* **Talking Points**:
  > "For content management, we enforce complete separation between business logic and transport in `postService.js`.
  >
  > Slugs are generated cleanly with automatic collision detection. Soft-deletion ensures posts are never destructively purged from the database, allowing easy recovery.
  >
  > Notice the IDOR protection: Even if a malicious user captures another author's post ID, our `requireOwnership` middleware intercepts the request at the API gateway and denies access before any database update can execute."

---

### Step 4: Admin Dashboard & Governance (5:30 – 7:30)

* **Action**:
  1. Click **Demo Admin** button and sign in as `admin@blogplatform.dev`.
  2. Navigate to `/admin`.
  3. Review dashboard stat cards (Total Users, Articles, Comments).
  4. Navigate to `/admin/users`:
     - Toggle user status between `ACTIVE` and `DEACTIVATED`.
     - Explain that deactivating a user immediately revokes all of their active refresh tokens in the database.
     - Try demoting the sole remaining admin: show the guard alert preventing system lockout (`LAST_ADMIN_PROTECTION`).
  5. Navigate to `/admin/posts`:
     - Show published vs soft-deleted articles.
     - Click **Restore** to un-delete a post in real time.
* **Talking Points**:
  > "The admin dashboard provides governance and moderation. Server-side RBAC is strictly enforced across every admin endpoint via `requireRole('ADMIN')`. Frontend route guards exist purely for UX, not as our security boundary.
  >
  > We've implemented crucial operational safety guards: an administrator cannot deactivate their own account, and the system actively prohibits demoting the last active admin."

---

### Step 5: VAPT Security Audit & Test Verification (7:30 – 9:00)

* **Action**:
  1. Open terminal and run `npm test` in `server` (show 41/41 passing tests).
  2. Run `npm test` in `client` (show passing component tests).
  3. Open `docs/security/VAPT-REPORT.md` and `qa/security-test-cases.xlsx`.
* **Talking Points**:
  > "To validate our defensive posture, we conducted a rigorous VAPT audit based on the OWASP API Top 10:
  > - We proved protection against NoSQL injection: operator payloads like `{ $gt: '' }` are recursively stripped before schema parsing.
  > - We proved protection against algorithm confusion: JWT verification enforces an explicit `algorithms: ['HS256']` whitelist.
  > - Our complete automated suite includes 41 Jest/Supertest backend tests covering units, integrations, and penetration tests, alongside Vitest component tests on the frontend.
  > - In addition, we've delivered an Excel workbook with 37 detailed test cases complete with precondition steps, expected vs actual results, and direct code artifact line mappings."

---

### Step 6: Conclusion & Reviewer Q&A (9:00 – 10:00)

* **Summary**:
  > "In summary, DevLog satisfies 100% of the assignment specifications: complete MERN stack, robust JWT token rotation, comprehensive RBAC, soft deletes, rate limiting, Socket.io notifications, clean UI design system, automated tests, and exhaustive VAPT audit documentation. Thank you!"
