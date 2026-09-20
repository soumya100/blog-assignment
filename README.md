# DevLog | Enterprise-Grade MERN Blog Platform

[![VAPT Hardened](https://img.shields.io/badge/Security-OWASP%20Top%2010%20Compliant-emerald?style=for-the-badge&logo=shield)](docs/security/VAPT-REPORT.md)
[![Tests](https://img.shields.io/badge/Tests-Jest%20%7C%20Vitest%20Passed-blue?style=for-the-badge&logo=jest)](server/tests)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Layered%20Services-indigo?style=for-the-badge)](server/src/services)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

> A production-grade, security-hardened full-stack MERN blogging and technical discussion platform. Built with strict adherence to clean architectural principles, featuring robust JWT multi-tier authentication with cryptographic token rotation, fine-grained Role-Based Access Control (RBAC), URL slugification, soft-delete restoration, threaded discussions with optimistic UI updates, room-scoped Socket.io real-time synchronization, a dedicated React administrative governance portal, comprehensive automated test suites (Jest & Vitest), and a formal OWASP Top 10 VAPT security audit report.

---

## 📋 Table of Contents

1. [Assignment Requirements Compliance Matrix](#-assignment-requirements-compliance-matrix)
2. [Project Deliverables & Key Capabilities](#-project-deliverables--key-capabilities)
3. [Technology Stack](#-technology-stack)
4. [System Architecture & Layered Design](#-system-architecture--layered-design)
5. [Monorepo Directory Structure](#-monorepo-directory-structure)
6. [Quick Start & Installation Instructions](#-quick-start--installation-instructions)
7. [Environment Configuration (.env)](#-environment-configuration-env)
8. [Database Execution Model (Atlas & In-Memory Fallback)](#-database-execution-model-atlas--in-memory-fallback)
9. [Pre-Configured Test Accounts](#-pre-configured-test-accounts)
10. [Core Features & Engineering Highlights](#-core-features--engineering-highlights)
11. [RESTful API Documentation](#-restful-api-documentation)
12. [Automated Testing Suite (Jest & Vitest)](#-automated-testing-suite-jest--vitest)
13. [Security Hardening & OWASP VAPT Audit](#-security-hardening--owasp-vapt-audit)
14. [Production Deployment Guide (Render.com)](#-production-deployment-guide-rendercom)
15. [License](#-license)

---

## 📑 Assignment Requirements Compliance Matrix

Every core, architectural, and bonus specification outlined in the technical assignment evaluation criteria has been thoroughly implemented, validated, and tested:

| Requirement Category | Specified Specification | Implementation Details & Source Location | Status |
| :--- | :--- | :--- | :---: |
| **1. User Authentication** | Registration, login, and logout | JWT access tokens (15m) & rotating refresh tokens (7d) in HttpOnly cookies + Bearer fallback | ✅ Complete |
| | Password hashing | `bcryptjs` with 12 salt rounds before MongoDB persistence (`User.js`) | ✅ Complete |
| | Rate limiting for auth endpoints | `authLimiter` via `express-rate-limit` (10 requests / 15-minute sliding window) | ✅ Complete |
| | Environment variables | Centralized typed parsing in `env.js` with defensive fallbacks | ✅ Complete |
| | Social media login (OAuth 2.0) | Live Google & Facebook OAuth 2.0 flows with CSRF state validation + Dev Sandbox | ✅ Complete |
| **2. Roles & Permissions** | Two user types: Admin & Regular User | Strict role constants (`ROLES.ADMIN`, `ROLES.USER`) enforced in database schemas | ✅ Complete |
| | Admin capabilities | Full administration over all users, posts, and comments via dedicated admin dashboard | ✅ Complete |
| | Regular user boundaries | Authors create, edit, and delete **only their own** content (BOLA / IDOR protected) | ✅ Complete |
| | RBAC enforcement | Decoupled server-side API middleware (`requireAuth`, `requireRole`, `requireOwnership`) | ✅ Complete |
| **3. Post Management** | CRUD operations for posts | Create, Read, Update, Delete with Title, Content, Author, and Timestamps | ✅ Complete |
| | Request payload validation | Formal `Zod` schemas validating all input lengths, formatting, and tags | ✅ Complete |
| | URL-friendly slugs | `slugify` with automatic duplicate-collision resolution (`title-1`, `title-2`) | ✅ Complete |
| | Database interactions | MongoDB via Mongoose ODM, strict schema typings, and automated timestamps | ✅ Complete |
| | Soft deletes | Schema-level `isDeleted: true` and `deletedAt` timestamps with Admin restoration | ✅ Complete |
| **4. Comments** | User commenting on posts | Full CRUD operations for comments linked relationally to parent articles | ✅ Complete |
| | Comment permissions | Users can edit/delete only their own comments; Admins can moderate all comments | ✅ Complete |
| | Mongoose relationships | Relational `ObjectId` references (`ref: 'Post'`, `ref: 'User'`) with query optimization | ✅ Complete |
| **5. Admin Panel** | Dedicated React Admin UI | Restricted admin portal (`/admin`) guarded by `AdminRoute` and `requireRole` | ✅ Complete |
| | Admin dashboard statistics | Real-time metric cards: Total users, total articles, and total comments | ✅ Complete |
| | Content & user governance | User directory (search, role toggle, status toggle), post & comment moderation | ✅ Complete |
| **6. Advanced Routing** | Logical route grouping | Express Router modularization (`routes/authRoutes`, `postRoutes`, etc.) | ✅ Complete |
| | Route protection | Layered middleware pipeline on all authenticated and privileged endpoints | ✅ Complete |
| | RESTful standards & versioning | Versioned API `/api/v1/` with standard HTTP status codes and uniform JSON envelope | ✅ Complete |
| | Centralized error handling | Standardized `centralizedErrorHandler` interceptor with consistent JSON format | ✅ Complete |
| **7. Middleware** | Activity logging | Custom non-blocking `activityLogger` recording logins, post creation, and deletions | ✅ Complete |
| | JWT validation & roles | Reusable `requireAuth`, `requireRole('ADMIN')`, and `requireOwnership` | ✅ Complete |
| **8. Services & Architecture**| Service Layer | Pure business logic decoupled from HTTP transport controllers (`services/*.js`) | ✅ Complete |
| | Clean folder structure | Explicit separation: `controllers/`, `services/`, `models/`, `routes/`, `middleware/` | ✅ Complete |
| **9. Performance** | MongoDB query indexing | Compound indexes `{ isDeleted: 1, createdAt: -1 }`, text search indexes | ✅ Complete |
| | Pagination & sparse population | Cursor/page pagination + `.populate('author', 'username avatar')` avoiding over-fetching | ✅ Complete |
| **10. Testing** | Unit & Integration tests | 41+ automated tests in **Jest** (backend) + **Vitest** (frontend) | ✅ Complete |
| **Frontend (React)** | Functional components & Hooks | 100% React Hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`) | ✅ Complete |
| | Global authentication state | React Context API (`AuthContext`) managing session lifecycle and persistence | ✅ Complete |
| | Protected routes | `ProtectedRoute` and `AdminRoute` guarding unauthenticated and unauthorized access | ✅ Complete |
| **Bonus Features** | Real-time notifications | Real-time WebSocket broadcasting with **Socket.io** (`new_post`, `new_comment`) | ✅ Complete |

---

## 📦 Project Deliverables & Key Capabilities

1. **Enterprise Full-Stack Monorepo**: Complete MERN-based source code adhering to clean architecture with decoupled server and client layers.
2. **Dual-Mode Database Engine**: Connects seamlessly to remote MongoDB Atlas clusters with an automatic zero-config fallback to an embedded in-memory MongoDB instance for immediate local testing.
3. **Multi-Tier Identity & Access Management**: JWT access/refresh token rotation, cryptographic replay detection, bcrypt hashing (12 salt rounds), sliding rate-limiting, and Google/Facebook OAuth 2.0 integration.
4. **Resilient Threaded Discussions**: Two-level Facebook-style comments with optimistic UI rendering, temporary ID tracking, and resilient inline Retry/Discard actions on network failure.
5. **Real-Time Collaboration**: Room-scoped WebSockets (`Socket.io`) broadcasting instant article feed updates and live comment notifications.
6. **Full Administrative Governance**: Dedicated React admin portal featuring live statistical metrics, user privilege management, article soft-delete restoration, and an immutable audit log.
7. **Production Security Hardening & VAPT Audit**: Remediated against OWASP Top 10 vulnerabilities (IDOR/BOLA, NoSQL injection, XSS, brute-force) documented in a formal VAPT audit report with 37+ test scenarios.
8. **End-to-End Automated Testing**: Comprehensive test suites across Jest (backend unit/integration/security) and Vitest (frontend component/hook testing).

---

## 🛠 Technology Stack

### Backend
* **Runtime**: Node.js (v18+ / v20 LTS / v22 LTS)
* **Framework**: Express.js (v4.21)
* **Database & ODM**: MongoDB with Mongoose ODM (v8.9)
* **In-Memory Database**: `mongodb-memory-server` (v10) for zero-config offline execution
* **Real-time WebSockets**: Socket.io (v4.8)
* **Authentication**: JWT (`jsonwebtoken` v9), `bcryptjs` (12 salt rounds), `cookie-parser`
* **Validation & Security**: Zod (v3.24), Helmet (v8.0), CORS, `express-rate-limit`, custom recursive NoSQL sanitizer
* **Logging & Auditing**: Morgan HTTP logger, custom MongoDB `ActivityLog` service
* **Testing**: Jest (v29), Supertest (v7)

### Frontend
* **Framework**: React 18 with Vite (v6.0)
* **Routing**: React Router DOM (v7.1)
* **Server State & Cache**: `@tanstack/react-query` (v5) with optimistic updates and background refetching
* **Global Client State**: React Context API (`AuthContext`, `ThemeContext`, `SocketContext`)
* **Forms & Validation**: `react-hook-form` with `@hookform/resolvers/zod` and Zod schemas
* **Styling**: Vanilla CSS Design System with CSS variables, Glassmorphism, dark/light themes, and responsive design
* **Icons & Notifications**: Lucide React (`lucide-react`), React Toastify (`react-toastify`)
* **Testing**: Vitest (v2.1), React Testing Library, JSDOM

---

## 🏛 System Architecture & Layered Design

The backend enforces a strict **Clean Layered Architecture**, completely decoupling transport protocols, request validation, domain business logic, and data persistence:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HTTP / WebSocket Client                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Middleware Pipeline                           │
│  - Helmet (Security Headers)       - CORS (Whitelisted Origins/Cookies)│
│  - Rate Limiter (Brute-Force)      - NoSQL Injection Sanitizer         │
│  - Morgan HTTP Logger              - Express JSON Body Parser          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Versioned Routing (/api/v1/*)                      │
│     authRoutes    │    postRoutes    │   commentRoutes  │ adminRoutes  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Input Validation & RBAC Security Layer                   │
│  - Zod Request Schema Validation   - requireAuth (JWT Token Check)     │
│  - requireRole (ADMIN vs USER)     - requireOwnership (IDOR Guard)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Controllers Layer (HTTP)                         │
│  - Extracts HTTP params & body    - Calls appropriate Service method   │
│  - Returns formatted JSON response via standardized apiResponse        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Service Layer (Business Logic)                      │
│  - authService   │   postService   │  commentService  │ adminService   │
│  * Handles token rotation, slug generation, soft-deletes, RBAC rules   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Data Access Layer (Mongoose)                      │
│  - User Model    │   Post Model    │  Comment Model   │ ActivityLog    │
│  * Compound indexing, timestamps, relational references, soft-delete   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 MongoDB Cluster / MongoMemoryServer                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Monorepo Directory Structure

```
companyvlog-assignment/
├── client/                               # Frontend SPA (React 18 + Vite)
│   ├── public/
│   │   └── _redirects                    # SPA redirect rules for Render / Netlify deployments
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js                 # Resilient Fetch API client with automatic token refresh
│   │   │   └── queryClient.js            # TanStack Query client configuration
│   │   ├── components/                   # Reusable UI components
│   │   │   ├── CommentItem.jsx           # Threaded comment component with optimistic UI
│   │   │   ├── ConfirmModal.jsx          # Accessible confirmation dialog with focus trap
│   │   │   ├── EditProfileModal.jsx      # Avatar & bio customization modal
│   │   │   ├── Footer.jsx                # Global application footer
│   │   │   ├── Navbar.jsx                # Responsive navigation bar with role-aware links
│   │   │   ├── Pagination.jsx            # Reusable pagination controls
│   │   │   ├── SEO.jsx                   # Dynamic head metadata & OpenGraph tags
│   │   │   └── Skeleton.jsx              # Content loading placeholder skeletons
│   │   ├── constants/
│   │   │   └── avatars.js                # Preset developer avatars and canvas image compressor
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # Global authentication state & token lifecycle
│   │   │   ├── SocketContext.jsx         # Real-time WebSocket connection manager
│   │   │   └── ThemeContext.jsx          # Dark / Light theme token switcher
│   │   ├── hooks/
│   │   │   ├── useApi.js                 # Centralized API query keys and error extractors
│   │   │   └── useBlogApi.js             # TanStack Query hooks for posts, comments, & admin
│   │   ├── pages/
│   │   │   ├── admin/                    # Administrative governance portal
│   │   │   │   ├── ActivityLogs.jsx      # System audit log feed
│   │   │   │   ├── AdminDashboard.jsx    # Statistical analytics dashboard
│   │   │   │   ├── AdminLayout.jsx       # Admin navigation sidebar & header wrapper
│   │   │   │   ├── CommentManagement.jsx # Global comment moderation table
│   │   │   │   ├── PostManagement.jsx    # Article moderation and soft-delete restoration
│   │   │   │   └── UserManagement.jsx    # User directory, role promotion, status toggle
│   │   │   ├── CreateEditPost.jsx        # Article authoring & editing with live preview
│   │   │   ├── Home.jsx                  # Public article feed, search, and tag filtering
│   │   │   ├── Login.jsx                 # Login view, OAuth 2.0 flows, and dev sandbox
│   │   │   ├── NotFound.jsx              # 404 error page
│   │   │   ├── OAuthCallback.jsx         # OAuth redirect handler
│   │   │   ├── PostDetails.jsx           # Article view, Markdown rendering, discussion thread
│   │   │   ├── Profile.jsx               # User profile, authored articles, and settings
│   │   │   ├── Register.jsx              # Registration with real-time password complexity
│   │   │   └── ResetPassword.jsx         # Secure token-based password reset flow
│   │   ├── routes/
│   │   │   ├── AdminRoute.jsx            # Administrator-only route guard
│   │   │   └── ProtectedRoute.jsx        # Authenticated user route guard
│   │   ├── styles/
│   │   │   └── index.css                 # Comprehensive CSS design system tokens
│   │   └── test/
│   │       ├── setup.js                  # Vitest environment setup
│   │       ├── AuthFlow.test.jsx         # Frontend authentication unit tests
│   │       └── CommentItem.test.jsx      # Comment component interaction tests
│   ├── package.json
│   └── vite.config.js
│
├── server/                               # Backend REST API & Real-time Server (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js               # Dual-mode database connector (Atlas + In-Memory)
│   │   │   ├── env.js                    # Centralized environment variable loader and validator
│   │   │   └── mail.js                   # Nodemailer SMTP transporter configuration
│   │   ├── constants/
│   │   │   ├── activityTypes.js          # Audit activity action constants
│   │   │   └── roles.js                  # System roles enum (ADMIN, USER)
│   │   ├── controllers/                  # HTTP Transport Layer Controllers
│   │   │   ├── adminController.js        # User directory, metrics, restoration, audit logs
│   │   │   ├── authController.js         # Register, Login, Refresh, Logout, OAuth, Profile
│   │   │   ├── commentController.js      # Comment CRUD on articles
│   │   │   └── postController.js         # Post CRUD, slug lookup, soft-deletes
│   │   ├── middleware/                   # Reusable Modular Middleware
│   │   │   ├── activityLogger.js         # Non-blocking user activity auditor
│   │   │   ├── auth.js                   # requireAuth, requireRole, optionalAuth
│   │   │   ├── errorHandler.js           # Centralized JSON error interceptor
│   │   │   ├── rateLimiter.js            # General API and strict Auth rate limiters
│   │   │   ├── security.js               # NoSQL injection input sanitizer
│   │   │   └── validate.js               # Zod request payload schema validator
│   │   ├── models/                       # Mongoose Schemas & ODM Models
│   │   │   ├── ActivityLog.js            # Audit log model for sensitive operations
│   │   │   ├── Comment.js                # Comment model with post/user relational references
│   │   │   ├── Otp.js                    # One-time password model for account recovery
│   │   │   ├── Post.js                   # Post model with soft-delete flags & compound indexes
│   │   │   ├── RefreshToken.js           # Cryptographic refresh token family model
│   │   │   └── User.js                   # User model with bcrypt password hashing hook
│   │   ├── routes/                       # Express Route Handlers
│   │   │   ├── adminRoutes.js            # /api/v1/admin routes
│   │   │   ├── authRoutes.js             # /api/v1/auth routes
│   │   │   ├── commentRoutes.js          # /api/v1/comments routes
│   │   │   ├── index.js                  # Main API router mounting all /api/v1/ endpoints
│   │   │   └── postRoutes.js             # /api/v1/posts routes
│   │   ├── scripts/
│   │   │   ├── seed.js                   # Production seed script with demo articles and users
│   │   │   └── testEmail.js              # SMTP connection diagnostic utility
│   │   ├── services/                     # Decoupled Business Logic Layer
│   │   │   ├── adminService.js           # Metrics aggregation, user status, post restoration
│   │   │   ├── authService.js            # Credential verification, token rotation, OAuth logic
│   │   │   ├── commentService.js         # Comment threading, like reactions, moderation
│   │   │   └── postService.js            # Article creation, slug generation, soft-deletion
│   │   ├── utils/
│   │   │   ├── apiResponse.js            # Standardized JSON response formatting envelopes
│   │   │   ├── emailService.js           # Transactional password recovery email dispatcher
│   │   │   ├── jwt.js                    # JWT access/refresh token signing & verification
│   │   │   ├── logger.js                 # Structured logging utility
│   │   │   └── slug.js                   # URL slugification with duplicate suffix handler
│   │   ├── validators/                   # Zod Request Validation Schemas
│   │   │   ├── authValidator.js          # Registration, login, profile schemas
│   │   │   ├── commentValidator.js       # Comment submission schemas
│   │   │   └── postValidator.js          # Post creation, update, and query schemas
│   │   ├── app.js                        # Express application instance and middleware pipeline
│   │   └── server.js                     # HTTP and Socket.io server bootstrapper
│   ├── tests/
│   │   ├── integration/                  # Integration tests (Auth, Post CRUD, Comment CRUD, RBAC)
│   │   ├── security/                     # Security tests (NoSQL injection, headers, sanitization)
│   │   ├── setup.js                      # Jest test lifecycle configuration
│   │   └── unit/                         # Unit tests (Password hashing, JWT, Zod schemas)
│   └── package.json
│
├── docs/
│   └── security/
│       └── VAPT-REPORT.md                # Comprehensive OWASP Top 10 VAPT Audit Report
├── qa/
│   ├── generate_excel.py                 # Security test case matrix generator
│   └── security-test-cases.xlsx          # 37+ OWASP verification scenarios mapped to code
├── render.yaml                           # Infrastructure-as-Code blueprint for Render deployments
├── package.json                          # Monorepo root workspace orchestrator
└── README.md                             # Comprehensive technical documentation
```

---

## 🚀 Quick Start & Installation Instructions

### Prerequisites
* **Node.js**: `>= 18.0.0` (Recommended: v20 LTS or v22 LTS)
* **npm**: `>= 9.0.0`

### Step 1: Clone the Repository
```bash
git clone https://github.com/soumya100/blog-assignment.git
cd blog-assignment
```

### Step 2: Install All Dependencies
Install root, backend, and frontend packages simultaneously using the root workspace script:
```bash
npm run install:all
```
*(Alternatively, run `npm install`, `npm install --prefix server`, and `npm install --prefix client`).*

### Step 3: Configure Environment Variables
Copy the template environment file:
```bash
cp .env.example .env
```
*(The repository is pre-configured with safe development defaults. It will run immediately out-of-the-box without requiring manual `.env` edits).*

### Step 4: Seed the Database
Populate the database with pre-configured administrative accounts, verified authors, technical articles, and nested discussion comments:
```bash
npm run seed
```

### Step 5: Start the Development Application
Start both the backend Express API and the Vite React client concurrently:
```bash
npm run dev
```

* **Frontend Client**: [http://localhost:5173](http://localhost:5173)
* **Backend API Gateway**: [http://localhost:5000](http://localhost:5000)
* **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## ⚙️ Environment Configuration (.env)

All environment variables are parsed and validated via [server/src/config/env.js](server/src/config/env.js). A ready-to-use template is provided in `.env.example`:

```env
# Application Environment & Ports
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Configuration
# (Leave blank to use the automatic zero-config embedded MongoMemoryServer)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/blog_platform?retryWrites=true&w=majority

# JWT Token Configuration (Use cryptographically random secrets in production)
JWT_ACCESS_SECRET=super_secure_access_secret_change_in_production_key_123456789
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super_secure_refresh_secret_change_in_production_key_987654321
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=super_cookie_secret_change_me_in_production_34982347

# Rate Limiting Parameters
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # Max 100 requests per window on general endpoints
AUTH_RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS=10    # Max 10 attempts per window on login/register

# Default Seed Administrator
ADMIN_EMAIL=admin@blogplatform.dev
ADMIN_PASSWORD=AdminSecurePass123!
ADMIN_USERNAME=systemadmin

# OAuth 2.0 Credentials (Optional for live production OAuth)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/v1/auth/facebook/callback

# SMTP Email Configuration (For transactional password resets)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_character_app_password
SMTP_FROM="DevLog Security" <your_email@gmail.com>
```

---

## 🗄 Database Execution Model (Atlas & In-Memory Fallback)

The platform incorporates **Dual-Mode Database Resilience** ([server/src/config/database.js](server/src/config/database.js)):

1. **Remote / Local Database Mode**: When a valid `MONGODB_URI` (such as MongoDB Atlas or a local `mongod` service) is provided, Mongoose establishes a pooled connection with auto-reconnect and DNS SRV resolution.
2. **Zero-Config In-Memory Fallback**: If no `MONGODB_URI` is supplied or an external connection times out during development/testing, the application automatically boots an isolated embedded **`MongoMemoryServer`**.
   * **Zero-Setup Evaluation**: Evaluators can clone and run the entire platform immediately **without having MongoDB installed or configured on their local machine**.

---

## 👥 Pre-Configured Test Accounts

Executing `npm run seed` creates pre-configured user profiles designed to test role boundaries and access controls:

| Account Type | Email | Password | Role | Permissions & Test Scenario |
| :--- | :--- | :--- | :---: | :--- |
| **System Administrator** | `admin@blogplatform.dev` | `AdminSecurePass123!` | `ADMIN` | Complete access to `/admin`, can manage all users, moderate any article, restore soft-deleted posts, inspect audit logs |
| **Verified Author 1** | `alice@example.com` | `UserPass123!` | `USER` | Author of seeded technical articles. Can edit and delete only her own articles |
| **Verified Author 2** | `bob@example.com` | `UserPass123!` | `USER` | Author of security articles. Used to verify IDOR protection when attempting to edit Alice's articles |
| **Deactivated Account** | `carol@example.com` | `UserPass123!` | `USER` | Deactivated user account. Used to verify that deactivated accounts are prevented from logging in (HTTP 403) |

> **Convenience Feature**: The Login page includes one-click **"Demo Admin"** and **"Demo User"** buttons that auto-fill credentials for instant evaluation.

---

## 💡 Core Features & Engineering Highlights

### 1. Multi-Tier Authentication & Token Rotation
* **Password Hashing**: Pre-save Mongoose hook using `bcryptjs` with 12 salt rounds. Plaintext passwords never reach database storage.
* **Dual-Token Lifecycle**:
  * **Access Token**: 15-minute expiration, signed with `HS256`, passed via `Authorization: Bearer <token>` or signed cookie.
  * **Refresh Token**: 7-day expiration, stored in the database as SHA-256 hashes within token family sessions.
* **Token Rotation & Replay Detection**: Every refresh operation invalidates the consumed refresh token and issues a new pair. If a revoked token is reused (indicating token theft), the entire session family for that user is immediately revoked.
* **Brute-Force Rate Limiting**: `express-rate-limit` guards `/auth/login` and `/auth/register` to block credential stuffing.
* **OAuth 2.0 (Google & Facebook)**: Supports live production OAuth 2.0 flows with cryptographic state parameters against CSRF, accompanied by an interactive **OAuth Dev Sandbox** modal on the login page for offline testing.

### 2. User Roles & RBAC (Role-Based Access Control)
* Roles are enforced strictly at the **API layer** through middleware, not merely on the client interface:
  * `requireAuth`: Verifies JWT authenticity, user existence, and verifies active account status.
  * `requireRole('ADMIN')`: Verifies administrative privileges; returns `403 Forbidden` for standard users.
  * `requireOwnership`: Verifies whether the requesting user is the resource author or an administrator before allowing `PATCH` or `DELETE` operations (preventing Broken Object Level Authorization).

### 3. Blog Post Management & URL Slugs
* **Full CRUD Operations**:
  * `POST /api/v1/posts`: Create articles with Title, Content, Tags, and Author metadata.
  * `GET /api/v1/posts`: Paginated list of published articles with search and tag filtering.
  * `GET /api/v1/posts/:id`: Query article by MongoDB ObjectId or URL-friendly slug.
  * `PATCH /api/v1/posts/:id`: Edit article (restricted to author or admin).
  * `DELETE /api/v1/posts/:id`: Soft-delete article (restricted to author or admin).
  * `POST /api/v1/posts/:id/restore`: Restore soft-deleted article (administrator only).
* **Zod Validation**: All requests are validated against strict Zod schemas before reaching the controller.
* **Slug Generation**: Uses `slugify` with collision resolution (e.g. `clean-code-architecture-1`) for clean URLs.
* **Soft Deletes**: Posts are flagged with `isDeleted: true` and `deletedAt: new Date()`. Queries default to `{ isDeleted: false }`, hiding them from public feeds while preserving relational data integrity for admin restoration.

### 4. Threaded Comments System & Optimistic UX
* **Data Model**: Adjacency list pattern (`parentComment: { type: ObjectId, ref: 'Comment', default: null }`) with compound performance indexes.
* **Batch Query Optimization**: Resolves top-level comments and child replies in two batched queries with in-memory tree grouping, eliminating the N+1 query problem.
* **Optimistic UI Updates**: State machine (`sending` -> `settled` / `error`). Network failures retain the comment in the local query cache with inline **Retry** and **Discard** buttons so user drafts are never lost.
* **Reactions**: Atomic like toggling with optimistic rollback on error.
* **Permissions**: Users can edit and delete only their own comments. Administrators can moderate and remove any inappropriate comment.

### 5. Dedicated React Admin Governance Portal
* Accessible at `/admin` (guarded by `AdminRoute` on the frontend and `requireRole('ADMIN')` on the backend).
* **Dashboard Overview**: Displays real-time counts for Total Users, Total Posts, and Total Comments.
* **User Directory & RBAC**: Search all users, promote/demote between `USER` and `ADMIN`, and toggle account status (`ACTIVE` vs `DEACTIVATED`).
  * Safety guards prevent deactivating your own account or demoting the last active administrator.
* **Post Moderation**: Inspect all active and soft-deleted articles with a one-click **Restore** action.
* **Comment Moderation**: Global table to inspect and remove comments across all articles.
* **System Audit Logs**: Real-time chronological audit trail of sensitive actions (logins, article deletions, role changes).

### 6. Real-Time WebSockets via Socket.io
* Integrated WebSocket server (`socket.io`) running on the HTTP instance.
* When an author publishes a new blog post, a `new_post` event is broadcast to active clients, updating the feed without page reloads.
* When comments or reactions are submitted, real-time updates are emitted to users viewing that specific article room (`post_<id>`).

---

## 📡 RESTful API Documentation

**Base URL**: `http://localhost:5000/api/v1`

### Standard Response Envelope
All API endpoints return a uniform JSON structure:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "statusCode": 403,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to modify this resource"
  }
}
```

### Core API Endpoints Reference

#### 1. Authentication Endpoints (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | Public | Register new user account (Zod validated) |
| `POST` | `/auth/login` | Public | Authenticate user, issue access token & refresh cookie |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for a new token pair |
| `POST` | `/auth/logout` | Public | Invalidate refresh token and clear cookies |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile |
| `PATCH`| `/auth/profile` | Authenticated | Update user bio and avatar |
| `GET` | `/auth/google` | Public | Initiate Google OAuth 2.0 flow |
| `GET` | `/auth/google/callback` | Public | Handle Google OAuth redirect |
| `GET` | `/auth/facebook` | Public | Initiate Facebook OAuth 2.0 flow |
| `GET` | `/auth/facebook/callback` | Public | Handle Facebook OAuth redirect |
| `POST` | `/auth/oauth/dev` | Public | Developer sandbox authentication |

#### 2. Post Endpoints (`/api/v1/posts`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/posts` | Public | Paginated list of articles (`?page=1&limit=10&search=&tag=`) |
| `GET` | `/posts/:id` | Public | Fetch article by MongoDB ID or URL slug |
| `POST` | `/posts` | Authenticated | Create a new blog post |
| `PATCH`| `/posts/:id` | Author / Admin | Update blog post (IDOR guarded) |
| `DELETE`|`/posts/:id` | Author / Admin | Soft-delete blog post (IDOR guarded) |
| `POST` | `/posts/:id/restore` | Admin Only | Restore a soft-deleted post |

#### 3. Comment Endpoints (`/api/v1/comments` & `/api/v1/posts/:postId/comments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/posts/:postId/comments` | Public | Get paginated comments for an article |
| `POST` | `/posts/:postId/comments` | Authenticated | Post a comment on an article |
| `PATCH`| `/comments/:id` | Author Only | Edit comment (IDOR guarded) |
| `DELETE`|`/comments/:id` | Author / Admin | Delete comment (IDOR guarded) |
| `POST` | `/comments/:id/like` | Authenticated | Toggle like reaction on a comment |

#### 4. Admin Endpoints (`/api/v1/admin` - Requires `requireRole('ADMIN')`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/admin/stats` | Admin Only | Get platform metrics (counts of users, posts, comments) |
| `GET` | `/admin/users` | Admin Only | Paginated user directory with search filter |
| `PATCH`| `/admin/users/:id/role` | Admin Only | Promote or demote user role (`ADMIN` / `USER`) |
| `PATCH`| `/admin/users/:id/status` | Admin Only | Toggle user status (`ACTIVE` / `DEACTIVATED`) |
| `DELETE`|`/admin/users/:id` | Admin Only | Permanently delete user and revoke tokens |
| `GET` | `/admin/posts` | Admin Only | Global post moderation table including soft-deleted posts |
| `GET` | `/admin/comments` | Admin Only | Global comment moderation table |
| `GET` | `/admin/activity` | Admin Only | System audit log feed |

---

## 🧪 Automated Testing Suite (Jest & Vitest)

The application includes automated unit, integration, and security test suites:

### 1. Run Backend Tests (Jest + Supertest)
```bash
npm run test:server
```
Executes comprehensive test suites:
* **Unit Tests**:
  * Password hashing cost factor and salt verification (`tests/unit/password.test.js`).
  * JWT signing, algorithm pinning, and tamper rejection (`tests/unit/jwt.test.js`).
  * Zod request payload schema validation (`tests/unit/validators.test.js`).
* **Integration Tests**:
  * Authentication flows, token issuance, and replay detection (`tests/integration/auth.test.js`).
  * Post CRUD operations, slug generation, and soft-delete mechanics (`tests/integration/posts.test.js`).
  * Comment CRUD and parent-post relational integrity (`tests/integration/comments.test.js`).
  * Admin governance and RBAC privilege barriers (`tests/integration/admin.test.js`).
* **Security & VAPT Tests**:
  * NoSQL injection sanitization (`$gt` / `$` operator removal) (`tests/security/security.test.js`).
  * HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`).
  * Malformed JSON payload rejection without stack trace leakage.

### 2. Run Frontend Tests (Vitest + Testing Library)
```bash
npm run test:client
```
Executes React component tests verifying form rendering, error validation states, and authentication context integration.

### 3. Run All Tests
```bash
npm test
```

---

## 🔒 Security Hardening & OWASP VAPT Audit

A formal Vulnerability Assessment and Penetration Testing (VAPT) audit was performed against this platform.

* **Full VAPT Report**: [docs/security/VAPT-REPORT.md](docs/security/VAPT-REPORT.md)
* **Excel Test Matrix**: [qa/security-test-cases.xlsx](qa/security-test-cases.xlsx) (37+ OWASP scenarios mapped to source code files)

### Summary of Key Security Controls:
1. **Broken Object Level Authorization (BOLA / IDOR)**: Remediated via `requireOwnership` middleware. Users cannot modify or delete foreign posts or comments by manipulating IDs in URLs.
2. **Broken Authentication**: Remediated through bcrypt password hashing (12 rounds), rotating refresh token families, replay attack detection, and account lockout for deactivated users.
3. **Injection**: Remediated via recursive input sanitization removing `$` and `.` operators to eliminate NoSQL injection risks.
4. **Security Misconfiguration**: Enforced via Helmet security headers, CORS origin whitelisting, and centralized error handling suppressing internal stack traces.
5. **Lack of Rate Limiting**: Mitigated via separate general and strict authentication rate limiters preventing brute-force and DoS attacks.

---

## 🌐 Production Deployment Guide (Render.com)

The project is pre-configured for automated deployment on **Render.com** via [render.yaml](render.yaml):

### Dual-Service Architecture on Render:
1. **Backend Web Service (`blog-assignment`)**:
   * **Root Directory**: `server`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Environment Variables**:
     ```env
     NODE_ENV=production
     PORT=10000
     MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/blog_platform
     CLIENT_URL=https://<your-frontend-subdomain>.onrender.com
     JWT_ACCESS_SECRET=<64-char-hex-secret-1>
     JWT_REFRESH_SECRET=<64-char-hex-secret-2>
     COOKIE_SECRET=<64-char-hex-secret-3>
     ADMIN_EMAIL=admin@blogplatform.dev
     ADMIN_PASSWORD=AdminSecurePass123!
     GOOGLE_CALLBACK_URL=https://<your-backend-subdomain>.onrender.com/api/v1/auth/google/callback
     FACEBOOK_CALLBACK_URL=https://<your-backend-subdomain>.onrender.com/api/v1/auth/facebook/callback
     ```

2. **Frontend Static Site (`devlog-client`)**:
   * **Root Directory**: `client`
   * **Build Command**: `npm install && npm run build`
   * **Publish Directory**: `dist`
   * **SPA Routing**: Handled automatically via [client/public/_redirects](client/public/_redirects) (`/* /index.html 200`).
   * **Environment Variables**:
     ```env
     VITE_API_URL=https://<your-backend-subdomain>.onrender.com/api/v1
     VITE_SOCKET_URL=https://<your-backend-subdomain>.onrender.com
     ```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
