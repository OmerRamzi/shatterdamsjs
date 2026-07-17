# Shatter DAMS — Security Standards

> **Last Updated**: July 2026

This document defines the security boundaries, authentication strategies, and data protection rules for the Shatter DAMS system.

---

## 1. Authentication

### 1.1 JWT Implementation
- **Mechanism**: The system uses JSON Web Tokens (JWT) for stateless authentication.
- **Library**: JWT signing and verification must be implemented securely using the native **Web Crypto API** within Cloudflare Workers, avoiding heavy external dependencies.
- **Algorithm**: `HS256` (HMAC with SHA-256).

### 1.2 Token Storage & Transport
- **Cookies**: JWTs must be transported via cookies, not `Authorization: Bearer` headers.
- **Cookie Flags**: 
  - `HttpOnly: true` (prevents XSS attacks from reading the token).
  - `Secure: true` (ensures the cookie is only sent over HTTPS).
  - `SameSite: None` (required since the API and frontend operate on different subdomains).

---

## 2. Authorization & Role-Based Access Control (RBAC)

### 2.1 User Roles
The database defines the following roles (`user_role` enum):
- `administrator` (Full access to tenant data)
- `employee` (Internal team member, limited access)
- `freelancer` (External contributor, limited access)
- `client` (External viewer/approver, read-only or highly restricted access)

### 2.2 Middleware Enforcement
- **Route Protection**: All protected API routes must run through an `authMiddleware` that verifies the JWT.
- **Role Verification**: High-privilege actions (e.g., deleting a project, viewing tenant settings) must explicitly check the authenticated user's role via middleware before processing the request.

---

## 3. Data Isolation (Multi-Tenancy)

Shatter DAMS is a multi-tenant application. Data leakage between tenants is the highest severity security risk.

- **Tenant Boundary**: The authenticated user's `tenantId` (extracted from the JWT) is the boundary for all database queries.
- **Query Rules**: Every single `SELECT`, `UPDATE`, `INSERT`, and `DELETE` operation in Drizzle ORM **must** include a `where(eq(table.tenantId, user.tenantId))` clause.
- **Cross-Tenant Access**: Cross-tenant data access is strictly forbidden by design.

---

## 4. Cross-Origin Resource Sharing (CORS)

- **Allowed Origins**: The Cloudflare Worker must strictly define allowed origins via the CORS middleware in `src/index.ts`.
- **Current Whitelist**:
  - `http://localhost:5173` (Development)
  - `https://admin.meetshatter.com`
  - `https://team.meetshatter.com`
  - `https://client.meetshatter.com`
- Wildcard origins (`*`) are prohibited in production. 

---

## 5. Input Validation & Data Sanitization

- **SQL Injection**: Drizzle ORM utilizes parameterized queries natively, effectively mitigating SQL injection. Do not bypass Drizzle with raw string interpolation in `sql` tags.
- **Payload Validation**: API endpoints should validate incoming JSON payloads (e.g., using `zod` if introduced, or explicit type checking) before attempting database operations.

---

## 6. Secrets Management

- **Cloudflare Secrets**: Production secrets (e.g., `DATABASE_URL`, `JWT_SECRET`) must be injected into the Worker via `wrangler secret put`. 
- **Development Secrets**: Local development secrets should reside exclusively in `backend/.dev.vars`.
- **Git Hygiene**: **Never** commit `.dev.vars` or any file containing plaintext credentials or database URIs to source control.
