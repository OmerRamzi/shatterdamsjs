# Shatter DAMS — Coding Standards

> **Last Updated**: July 2026

This document outlines the coding standards, methodologies, and conventions to be followed by all developers contributing to the Shatter DAMS project.

---

## 1. General Principles

- **TypeScript First**: All new code must be written in TypeScript (`.ts` or `.tsx`). Avoid `any`; define explicit interfaces in `types/` directories.
- **Modularity**: Keep files small and focused. If a file exceeds 300 lines, consider breaking it into smaller components or utility functions.
- **Consistency**: Follow existing patterns in the codebase. When in doubt, refer to this document or ask in code review.

---

## 2. Frontend Standards (Vite + React)

### 2.1 React 19 Best Practices
- **Hooks & Context**: Use standard React hooks for local state. Use React Context for global state (e.g., authentication, theme). We do not use Redux, Zustand, or MobX.
- **Functional Components**: Use functional components with arrow functions.
- **Refs**: React 19 handles refs natively; avoid `forwardRef` unless strictly necessary for library compatibility.

### 2.2 Styling and Tailwind CSS (v4)
- **Utility Classes**: Use Tailwind CSS utility classes directly on elements. Avoid creating custom CSS classes in `index.css` unless for global resets or highly complex animations.
- **Component Libraries**: We build our own UI primitives (Button, Card, Input) in `src/components/common/`. Do not introduce large third-party UI libraries like MUI or Ant Design to keep the bundle small.
- **Icons**: Use `lucide-react` exclusively for icons to maintain visual consistency.

### 2.3 Directory Structure
- `src/components/common/`: Reusable, dumb UI components (buttons, inputs, modals).
- `src/components/layout/`: Layout shells (Header, Sidebar, AppShell).
- `src/components/shared/`: Domain-specific components used across multiple pages (e.g., `AssetGrid`, `DataTable`).
- `src/pages/`: Page components matching route paths.
- `src/hooks/`: Custom React hooks (e.g., `useApi`, `useAuth`).
- `src/services/`: API client wrappers and external service integrations.
- `src/types/`: Shared TypeScript interfaces.

---

## 3. Backend Standards (Cloudflare Workers + Hono)

### 3.1 Routing Architecture
- **Domain-Driven Routes**: Keep routes separated by feature domains (e.g., `clients.ts`, `projects.ts`, `invoices.ts`).
- **Mounting**: Mount all routes in `src/index.ts` under the `/api` prefix.

### 3.2 Database Access (Drizzle ORM)
- **Schema Modifications**: Any changes to the database schema must be done in `src/db/schema.ts` and accompanied by a corresponding Drizzle migration (`npm run db:generate`).
- **Query Building**: Use Drizzle's query builder (e.g., `db.select().from(users).where(...)`) over raw SQL strings to ensure type safety.
- **Multi-Tenancy**: **CRITICAL RULE**: Every database query (select, update, delete) must explicitly filter by `tenantId` to ensure data isolation. Never fetch records solely by `id` without also verifying `tenantId`.

### 3.3 Configuration & Cloudflare Bindings
- **Precedence Rule**: Be aware of Cloudflare Wrangler configuration precedence. `wrangler.jsonc` takes precedence over `wrangler.toml`. Always update bindings (like `DATABASE_URL` or `ASSETS_BUCKET`) in `wrangler.jsonc`.
- **Environment Variables**: Access environment variables securely through Hono context (`c.env`). Do not rely on `process.env` since the runtime is Cloudflare Workers, not Node.js.

### 3.4 Error Handling
- Use structured JSON error responses.
- Catch unhandled exceptions in the global `app.onError` handler in `src/index.ts`.
- Return appropriate HTTP status codes: `400` for bad request, `401` for unauthorized, `403` for forbidden, `404` for not found, and `500` for server errors.

---

## 4. Git & Code Review Standards

- **Branch Naming**: `feature/feature-name`, `bugfix/issue-description`, `chore/task-name`.
- **Commit Messages**: Use conventional commits (e.g., `feat: added invoice generation`, `fix: resolved CORS issue on client portal`).
- **PRs**: Pull requests must pass all TypeScript checks (`tsc --noEmit`) and linting (`oxlint`) before merging.
