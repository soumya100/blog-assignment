# DevLog | Enterprise Secure MERN Blog Platform

[![VAPT Hardened](https://img.shields.io/badge/Security-OWASP%20Top%2010%20Controls-emerald?style=flat-square)](docs/security/VAPT-REPORT.md)
[![Tests](https://img.shields.io/badge/Tests-Jest%20%7C%20Vitest-blue?style=flat-square)](server/tests)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Service%20Layered-indigo?style=flat-square)](#architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](#)

> A production-ready, security-hardened full-stack MERN blog application featuring Role-Based Access Control (RBAC), cryptographically secure JWT refresh token rotation with replay detection, MongoDB soft deletes, rate limiting, centralized error handling, real-time notifications via Socket.io, and a comprehensive VAPT audit report.

---

## Table of Contents

1. [Features Summary](#features-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture & Design](#architecture--design)
4. [Monorepo Directory Structure](#monorepo-directory-structure)
5. [Quick Start & Installation](#quick-start--installation)
6. [Database Execution Model](#database-execution-model)
7. [Environment Variables](#environment-variables)
8. [OAuth 2.0 Integration & Dev Sandbox](#oauth-20-integration--dev-sandbox)
9. [Pre-configured Test Accounts](#pre-configured-test-accounts)
10. [API Documentation Overview](#api-documentation-overview)
11. [Automated Testing](#automated-testing)
12. [Security Controls & VAPT Audit](#security-controls--vapt-audit)
13. [Demo Presentation Guide](#demo-presentation-guide)

---

## Features Summary

### 1. Authentication & Session Management
- **Registration**: Email validation, username formatting, and strict password complexity rules (length, uppercase, lowercase, numbers, symbols).
- **Password Hashing**: Securely hashed with `bcryptjs` using 12 salt rounds before database persistence.
- **Short-Lived Access Tokens**: Signed JWTs with 15-minute expiration, pinned to `HS256` with issuer/audience checks.
- **Rotating Refresh Tokens**: Delivered via `HttpOnly`, `SameSite`, and `Secure` cookies. Stored in MongoDB as SHA-256 hashes inside cryptographic session families.
- **Replay Attack Defense**: Reusing a previously consumed refresh token triggers immediate invalidation of the entire session family.
- **Brute-Force Protection**: Strict rate limiter on `/api/v1/auth/*` endpoints (10 requests / 15 minutes).
- **OAuth 2.0 (Google & Facebook)**: Full state verification flow and interactive local developer sandbox.

### 2. User Roles & RBAC
- **Roles**: Distinct `ADMIN` and `USER` privileges.
- **Server-Side Security Boundaries**: RBAC enforced at the API gateway layer via reusable middleware (`requireAuth`, `requireRole`, `requireOwnership`).
- **IDOR / BOLA Elimination**: Regular users can only edit or delete their own posts and comments. Any attempt to modify another author's content returns HTTP 403 Forbidden.

### 3. Blog Post Management
- **Full CRUD Operations**: Create, read, update, soft-delete, and restore articles.
- **URL-Friendly Slugs**: Automatically generated with collision-prevention suffixing (e.g. `title-1`).
- **Soft Deletions**: Posts are marked with `isDeleted: true` and `deletedAt`, excluding them from public feeds while permitting administrative recovery.
- **Performance Indexing**: Compound indexes on `{ isDeleted: 1, createdAt: -1 }`, `{ author: 1 }`, and text indexes for search.

### 4. Nested Discussion & Real-Time Comments
- **Post-Associated Comments**: CRUD operations for discussion threads.
- **Real-Time Duplex Synchronization**: Powered by `Socket.io`—new articles and comments are pushed dynamically to connected clients without page reloads.

### 5. Admin Governance Dashboard
- **Metric Cards**: Total users (active vs. deactivated), articles (published vs. deleted), and comments.
- **User Directory**: Search users, promote/demote roles, toggle account status (deactivating immediately revokes active sessions).
- **Safety Guards**: System actively prohibits deactivating oneself and prevents demoting the last remaining active administrator.
- **Content Moderation**: Direct soft-delete and restore capabilities for articles and comments.
- **Live Audit Feed**: Chronological log of sensitive operations (logins, deletions, role modifications).

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express.js, Mongoose 8, Socket.io, Helmet, CORS, Morgan, Winston |
| **Frontend** | React 18, Vite, React Router v7, TanStack Query, Lucide Icons, Vanilla CSS Design System |
| **Database** | MongoDB with dual connection manager (External URI + MongoMemoryServer fallback) |
| **Security** | bcryptjs (12 rounds), jsonwebtoken (HS256 pinned), express-rate-limit, Zod validators |
| **Testing** | Jest, Supertest, Vitest, React Testing Library, MongoDB In-Memory Server |
| **QA / Reporting** | Python openpyxl, Markdown VAPT Audit Document |

---

## Architecture & Design

The backend strictly follows a layered service architecture:

```
Request -> Helmet/CORS -> RateLimiter -> NoSQL Sanitizer -> Router -> Zod Validation -> Auth/RBAC -> Controller -> Service -> Mongoose Model -> Database
```

* **Separation of Concerns**: Controllers only handle HTTP translation and response formatting; business rules reside entirely within the `services/` directory.
* **Non-Blocking Audit Logging**: Activity logs are asynchronously committed to MongoDB via `activityLogger` without degrading response latency.
* **Defensive Error Handling**: Centralized error interceptor catches Mongoose duplicate key errors (11000), cast errors, and validation errors, suppressing internal stack traces in production.

---

## Monorepo Directory Structure

```
companyvlog-assignment/
├── client/                     # Vite + React 18 Single Page Application
│   ├── src/
│   │   ├── api/                # Axios client with transparent token refresh queue
│   │   ├── components/         # Navbar, Footer, Modal, Skeleton, Pagination, Toast
│   │   ├── context/            # AuthContext, ThemeContext, SocketContext
│   │   ├── pages/              # Home, PostDetails, CreateEditPost, Login, Register, Profile
│   │   ├── pages/admin/        # AdminDashboard, UserManagement, PostManagement, CommentManagement, ActivityLogs
│   │   ├── routes/             # ProtectedRoute, AdminRoute
│   │   └── styles/             # Modern Dark/Light theme design system tokens
│   ├── package.json
│   └── vite.config.js
├── server/                     # Express.js REST API & WebSocket Server
│   ├── src/
│   │   ├── config/             # Database connector, environment loader
│   │   ├── constants/          # Roles, activity action types
│   │   ├── controllers/        # Auth, Post, Comment, Admin controllers
│   │   ├── middleware/         # Auth, RBAC, Ownership (IDOR), RateLimit, Security, ErrorHandler
│   │   ├── models/             # User, RefreshToken, Post, Comment, ActivityLog
│   │   ├── routes/             # Versioned Express router (/api/v1/*)
│   │   ├── scripts/            # Database seed script (seed.js)
│   │   ├── services/           # Decoupled business logic layer
│   │   ├── utils/              # JWT helpers, slug generator, API response helpers, logger
│   │   ├── validators/         # Zod schemas for all DTOs
│   │   ├── app.js              # Express app setup and middleware pipeline
│   │   └── server.js           # HTTP and Socket.io server entry point
│   ├── tests/
│   │   ├── unit/               # JWT, password hashing, Zod validator unit tests
│   │   ├── integration/        # Auth flow, Post CRUD, Comment CRUD, Admin RBAC tests
│   │   └── security/           # NoSQL injection, security headers, malformed JSON tests
│   └── package.json
├── docs/
│   ├── security/
│   │   └── VAPT-REPORT.md      # Comprehensive VAPT audit report with CVSS scoring
│   └── DEMO-SCRIPT.md          # 5-10 minute presenter walkthrough script
├── qa/
│   ├── security-test-cases.xlsx# Excel workbook with 37+ OWASP test cases & artifact mapping
│   └── generate_excel.py       # Python automation script for generating the test workbook
├── .env.example                # Documented configuration template
├── .gitignore
├── README.md
└── package.json                # Monorepo root workspace scripts
```

---

## Quick Start & Installation

### Prerequisites
* **Node.js**: >= 18.0.0 (Tested on Node.js v22.20.0)
* **npm**: >= 9.0.0

### Step 1: Install Dependencies
Run from the root directory to install all monorepo dependencies:
```bash
npm run install:all
```
*(Alternatively: `npm install`, then `cd server && npm install`, then `cd ../client && npm install`)*

### Step 2: Seed Sample Data
Populate initial administrators, authors, technical articles, and comments:
```bash
npm run seed
```

### Step 3: Run the Application
Launch both backend and frontend concurrently:
```bash
npm run dev
```

* **Frontend**: Open [http://localhost:5173](http://localhost:5173)
* **Backend API**: Running at [http://localhost:5000](http://localhost:5000)
* **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## Database Execution Model

The platform is designed with **dual-mode database resilience**:

1. **Production / Local Daemon Mode**: If you provide a standard MongoDB connection string in `.env` (e.g. `MONGODB_URI=mongodb://localhost:27017/blog_platform` or MongoDB Atlas URI), the application connects directly.
2. **Seamless Zero-Config In-Memory Mode**: If no `MONGODB_URI` is supplied, the backend can use an embedded `MongoMemoryServer` fallback (subject to the project's runtime dependencies and configuration). This guarantees that evaluators can run the project immediately with zero external installations.

---

## Environment Variables

> **Security warning:** The values below are development examples only. Use long, random secrets in any shared, staging, or production environment. Never commit real credentials or `.env` files.

Copy `.env.example` to `.env` if custom overrides are needed:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database (Leave blank to use automatic embedded MongoMemoryServer)
MONGODB_URI=

# Security & Tokens
JWT_ACCESS_SECRET=super_secure_access_secret_change_in_production_key_123456789
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super_secure_refresh_secret_change_in_production_key_987654321
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=super_cookie_secret_change_me_in_production_34982347

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=10

# Admin Seed Account
ADMIN_EMAIL=admin@blogplatform.dev
ADMIN_PASSWORD=AdminSecurePass123!
ADMIN_USERNAME=systemadmin
```

---

## Pre-configured Test Accounts

When running `npm run seed`, the database is populated with the following ready-to-test accounts:

| Role | Email | Password | Permissions & Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@blogplatform.dev` | `AdminSecurePass123!` | Full access to Admin Panel, user management, metrics, post/comment moderation |
| **Regular User** | `alice@example.com` | `UserPass123!` | Active author; can create, edit, and delete only her own articles |
| **Regular User** | `bob@example.com` | `UserPass123!` | Active user; used in IDOR tests to prove access barrier |
| **Deactivated** | `carol@example.com` | `UserPass123!` | Deactivated account; demonstrates login barrier (HTTP 403) |

> **Evaluator Convenience**: The Login page includes one-click **"Demo Admin"** and **"Demo User"** buttons to auto-populate credentials instantly.

---

## OAuth 2.0 Integration & Dev Sandbox

* **Production Flow**: Configured for standard Google & Facebook OAuth 2.0 callback handlers with CSRF state verification.
* **Developer Sandbox**: The Login view includes an interactive **"OAuth 2.0 Dev Sandbox"** modal. Reviewers can test instant Google or Facebook account linking and token generation without needing real third-party cloud client credentials.

---

## API Documentation Overview

Base URL: `/api/v1`

### Authentication Endpoints
* `POST /auth/register` - Create account (validates complexity, hashes password).
* `POST /auth/login` - Authenticate, set `HttpOnly` refresh cookie, return access token.
* `POST /auth/refresh` - Rotate refresh token family; returns new token pair.
* `POST /auth/logout` - Invalidate refresh token and clear session cookie.
* `GET /auth/me` - Retrieve current user profile (requires `Bearer` access token).
* `POST /auth/oauth/dev` - Complete simulated OAuth identity callback.

### Blog Post Endpoints
* `GET /posts` - Paginated articles with search (`?search=`), tag filter (`?tag=`), and author filter.
* `GET /posts/:id` - Fetch single article by URL slug or MongoDB ObjectId.
* `POST /posts` - Author new post (requires authenticated user).
* `PATCH /posts/:id` - Update article (IDOR-guarded: requires author or admin).
* `DELETE /posts/:id` - Soft-delete article (IDOR-guarded: requires author or admin).
* `POST /posts/:id/restore` - Restore soft-deleted article (Admin only).

### Comment Endpoints
* `GET /posts/:postId/comments` - Paginated comments for an article.
* `POST /posts/:postId/comments` - Add comment to article (requires authenticated user).
* `PATCH /comments/:id` - Edit comment (IDOR-guarded: author only).
* `DELETE /comments/:id` - Soft-delete comment (IDOR-guarded: author or admin).

### Admin Endpoints (Requires `requireAuth` + `requireRole('ADMIN')`)
* `GET /admin/stats` - Platform metrics (users, posts, comments breakdown).
* `GET /admin/users` - Paginated user management table with search.
* `PATCH /admin/users/:id/role` - Update role (`ADMIN` / `USER`).
* `PATCH /admin/users/:id/status` - Toggle status (`ACTIVE` / `DEACTIVATED`).
* `DELETE /admin/users/:id` - Permanently delete user and revoke all sessions.
* `GET /admin/comments` - Global comment moderation view.
* `GET /admin/activity` - System audit trail logs.

---

## Automated Testing

The repository contains comprehensive automated test suites for both backend and frontend:

### Run Backend Tests (Jest + Supertest)
```bash
npm run test:server
```
Executes 41 automated tests:
* **Unit Tests**: Password hashing salt verification, JWT algorithm pinning, Zod schema validation.
* **Integration Tests**: Auth registration/login, refresh token rotation, replay attack detection, post CRUD, nested comment CRUD, admin RBAC boundaries.
* **Security / VAPT Tests**: NoSQL injection sanitization (`$gt` operators), security headers (`nosniff`, `SAMEORIGIN`), malformed JSON error handling, tampered JWT signature rejection.

### Run Frontend Tests (Vitest + React Testing Library)
```bash
npm run test:client
```
Executes React component unit and integration tests.

### Run All Tests
```bash
npm test
```

---

## Security Controls & VAPT Audit

A formal VAPT security audit was performed against the completed platform:
* **VAPT Report Location**: [docs/security/VAPT-REPORT.md](docs/security/VAPT-REPORT.md)
* **Excel Test Cases Matrix**: [qa/security-test-cases.xlsx](qa/security-test-cases.xlsx) (Generated with Python `openpyxl`, featuring 37 detailed OWASP scenarios with direct source file line mappings).

### Top Remediated Vulnerabilities:
1. **IDOR / BOLA Prevention**: Added `requireOwnership` middleware; users cannot manipulate foreign post or comment IDs.
2. **Token Replay Attack Defense**: Stored refresh token hashes in cryptographic families; reusing an old token revokes the entire user family.
3. **NoSQL Operator Sanitization**: Recursive removal of `$` and `.` in all incoming bodies and query parameters.
4. **Account Enumeration Defense**: Standardized generic error messages for nonexistent accounts vs. wrong passwords.
5. **Anti-Lockout Protection**: System prevents demoting the last active administrator and blocks self-deactivation.

---

## Demo Presentation Guide

A step-by-step walkthrough script for a 5–10 minute hiring assignment demo is available at:
👉 [**docs/DEMO-SCRIPT.md**](docs/DEMO-SCRIPT.md)

It provides ready-to-use talking points for presenting architecture, security mechanisms, content authoring, and governance features.
#
