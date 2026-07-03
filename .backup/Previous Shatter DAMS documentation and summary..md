# Shatter Application - Comprehensive Technical & Functional Documentation

This document serves as the exhaustive technical and functional specification for the **Shatter** Project Management and CRM application. It outlines the logical architecture, data models, role-based workflows, and detailed features across the Admin, Team, and Client portals.

---

## Table of Contents
1. [High-Level Endpoints & Routing Architecture](#1-high-level-endpoints--routing-architecture)
2. [Data Layer & Entity Architecture](#2-data-layer--entity-architecture)
3. [Authentication, RBAC & Security](#3-authentication-rbac--security)
4. [Admin Portal Experience](#4-admin-portal-experience)
5. [Team Portal Experience](#5-team-portal-experience)
6. [Client Portal Experience](#6-client-portal-experience)

---

## 1. High-Level Endpoints & Routing Architecture

Shatter utilizes a multi-domain/subdomain routing strategy within CodeIgniter 4 to isolate environments securely.

### Public & Authentication Endpoints (Global)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Default Application Landing Page |
| `GET/POST` | `/login` | Authentication form rendering and credential processing |
| `GET` | `/logout` | Session termination and redirect |
| `GET` | `/lang/(:segment)` | Switch localization/language preferences |

### Admin Portal (`admindash.great-site.net/admin/*`)
| Module | Endpoints (High Level) | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/dashboard`, `/` | Admin overview, metrics, pending approvals |
| **Projects** | `/projects/*` | CRUD for projects, milestones, task assignment, member assignment, internal file approval, and file uploads |
| **Clients** | `/clients/*` | CRUD for client CRM profiles and auto-user provisioning |
| **Team** | `/team/*` | CRUD for internal team member profiles (freelancers, employees) |
| **Timesheets**| `/timesheets/*` | View, log, and approve timesheets across the tenant |
| **Invoices** | `/invoices/*` | CRUD for invoices, Dompdf generation (`/pdf/(:num)`) |
| **Quotations**| `/quotations/*` | CRUD for estimates and pre-sale quotes |
| **Tasks** | `/tasks/*` | Global CRUD for tasks across all projects |
| **Reports** | `/reports/*` | Financial and Project-specific BI extraction |
| **Users** | `/users/*` | Global user/tenant management |
| **Settings** | `/settings/*` | Tenant-wide configurations (VAT, Currency, Formats) |
| **Profile** | `/profile/*` | Personal admin credential updates |

### Team Portal (`admindash.great-site.net/team/*`)
| Module | Endpoints (High Level) | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/dashboard` | Personal workspace, active assigned projects, pending tasks |
| **Tasks** | `/tasks/*` | Kanban view of assigned tasks, status updating endpoints |
| **Projects** | `/projects/*` | View scoped projects, upload internal deliverables |
| **Timesheets**| `/timesheets/*` | Log hours against projects/tasks, view personal history |
| **Profile** | `/profile/*` | Update name, email, avatar, password |

### Client Portal (`clientportal.great-site.net/*`)
| Module | Endpoints (High Level) | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/dashboard`, `/dashboard/search` | Client overview, active project tracking, global search |
| **Projects** | `/projects/*` | View project details, download approved files |
| **Feedback** | `/projects/approve_file`, `/projects/reject_file`, `/dashboard/add_comment` | File approval workflows and commentary endpoints |
| **Invoices** | `/invoices/*` | View digital quotes, download invoice PDFs |

---

## 2. Data Layer & Entity Architecture

The Data Layer follows a multi-tenant, relational architecture built on CodeIgniter 4 Models and a MySQL/MariaDB database. The schema is highly normalized and enforces strong referential integrity through foreign key constraints.

### 2.1 Core Platform & Identity Domain
*   **Tenant Model:** Acts as the highest level of isolation for multi-tenancy. Every major entity in the system is scoped to a specific tenant to ensure data segregation.
*   **User Model:** Manages authentication, identity, and profile information for all individuals accessing the system (Administrators, Employees, Clients, Freelancers). Contains attributes like Email, Password Hash, Display Name, and Profile Image.
*   **User Role Entity:** Defines the authorization level (`administrator`, `freelancer`, `client`, `employee`).
*   **Setting Model:** Stores configurable, global, or tenant-specific preferences like company details, formatting (currency, dates), and invoicing prefixes.
*   **Activity Log Model:** Provides a comprehensive audit trail (polymorphic) of actions performed within the application (e.g., uploads, approvals, deletions).

### 2.2 Customer Relationship Management (CRM) Domain
*   **Client Model:** Represents the companies or individuals paying for services. It acts as the primary anchor for financial documents and project deliverables. Includes Company Name, Contact Details, and Billing Addresses.

### 2.3 Project Management Domain
*   **Project Model:** The central operational entity representing a block of work for a client. It acts as a container for tasks, files, milestones, and financial tracking. Tracks Status, Priority, Timeline, Budget, and Progress.
*   **Project Team Entity (Pivot Table):** Resolves the many-to-many relationship between Users and Projects, defining exactly who has access to which project and in what capacity.
*   **Milestone Model:** Represents major checkpoints or phases within a Project's lifecycle, often tied to financial triggers or delivery dates.
*   **Task Model:** Actionable, granular items of work assigned to users. They track the day-to-day progress of the project (To-Do, In Progress, Review, Completed).

### 2.4 Asset & Collaboration Domain
*   **File Model:** Manages digital assets and deliverables uploaded to a project. It tracks file metadata, versioning, and internal/external review statuses.
*   **File Comment Model:** Facilitates collaboration by allowing users to leave feedback, change requests, or notes on specific file versions.

### 2.5 Financial & Billing Domain
*   **Quotation & Quotation Item Models:** Manages pre-sale project estimates sent to clients for approval. Structured in a parent-child relationship for header details and line items.
*   **Invoice & Invoice Item Models:** Manages the billing process. Generates auto-incrementing Invoice Numbers, tracks status (Draft, Sent, Paid, Overdue), and manages financial totals and PDF references.

### 2.6 Human Resources & Time Tracking Domain
*   **Timesheet Model:** Tracks billable and non-billable hours logged by employees against specific tasks and projects.
*   **Payroll Log Entity:** Manages the financial compensation paid to employees or freelancers over specific periods based on their logged work.

---

## 3. Authentication, RBAC & Security

Security and access segregation are enforced through a central middleware filter that intercepts requests before they reach the controllers.

### 3.1 The Login Process
1.  **Credential Verification:** The system accepts an email and password, querying the user database and verifying the password using secure hashing algorithms.
2.  **Session Initialization:** Upon successful verification, the system records the login timestamp and retrieves the user's designated role.
3.  **Client-Specific Checks:** If the user is identified as a 'client', the system additionally verifies their linkage to a specific company profile in the clients table.
4.  **Role-Based Routing:** The controller automatically redirects users to their appropriate domains based on their roles:
    *   **Administrators & Team:** Routed to the `admindash.` domain.
    *   **Clients:** Routed to the `clientportal.` domain.

### 3.2 Routing Filters & Domain Segregation
*   **Authentication Wall:** The middleware filter strictly enforces that all incoming requests originate from a logged-in session.
*   **Subdomain Segregation:** 
    *   If an internal endpoint (Admin panel) is accessed by someone lacking administrator privileges, they are blocked and redirected to their respective dashboard.
    *   If an internal user (admin or team member) navigates to the client subdomain, the filter detects the role mismatch and reroutes them back to the Admin Dashboard.

---

## 4. Admin Portal Experience

The Admin Portal is the command center of the Shatter application, allowing full lifecycle management of clients, projects, users, and financials.

### 4.1 Dashboard & Activity
*   **Key Metrics Overview:** Real-time aggregation of Total Projects, Active Projects, Total Clients, and Total Revenue.
*   **Pending File Approvals:** A dedicated queue showing project files currently under `internal_review`, alerting the admin to review them before client visibility.
*   **Recent Activity Feed:** A merged, time-sorted timeline capturing the 10 most recent system actions (uploads, approvals, rejections, comments).

### 4.2 Projects & File Management (DAMS)
*   **Lifecycle Management:** Complete control over project creation, status tracking, milestones, and deletion. Creates dedicated storage directories (`uploads/projects/project_{id}`) automatically.
*   **Team Assignment:** Admins can dynamically assign and remove internal team members to specific projects.
*   **Client File Workflow:** 
    *   Admins/Team upload physical assets or external URL links.
    *   Assets default to a 'pending' (internal review) state.
    *   **One-Click Approval:** Admins approve internal files. The file status flips, making it instantly visible on the client's portal.
    *   **Automated Notifications:** Approving a file automatically triggers a styled email notification directly to the client.

### 4.3 Financials (Invoices & Quotations)
*   **Billing Engine:** Robust invoicing and quoting capability tied to Clients and Projects.
*   **Auto-Incrementing Logic:** Invoice/Quote numbers automatically generate based on global prefix settings (e.g., `INV-001`).
*   **Dynamic Line Items:** Unlimited line items, automatic subtotal calculations, global VAT/Tax application.
*   **PDF Generation:** Integrated Dompdf engine compiles invoice data to stream a fully formatted A4 PDF invoice directly to the browser.

### 4.4 CRM & User Management
*   **Clients:** Centralized management of client profiles. **Auto-User Provisioning** instantly creates a User account, sets a default password (`Client@123`), and grants portal access upon client creation. Built-in dependency protection prevents deletion of clients with active projects.
*   **Users & Roles:** Full CRUD management of system users. Strict email uniqueness and password policies.

### 4.5 System Settings & Reporting
*   **Global Configuration:** Admins modify Company Name, Email, Address, Phone, Default Currency, VAT/Tax Percentages, Invoice Prefixes, Timezone, and Date Formats. Updating these alters PDF generation across the app immediately.
*   **Reporting:** Extracts business intelligence, summarizing revenue, invoice statuses, project adherence, and economic health.
*   **Timesheet Approvals:** Admins monitor, review, and approve time logged by freelancers and employees.

---

## 5. Team Portal Experience

The Team Portal operates on a tenant-aware architecture where data is strictly scoped to the user's ID and their respective tenant ID.

### 5.1 Workspace Dashboard
*   **Task Overview:** Surfaces imminent, incomplete tasks assigned directly to the user.
*   **Active Projects:** Displays active projects the user is explicitly assigned to, showing deadlines and progress.
*   **Time Tracking Summary:** Aggregates hours logged in the current calendar month.

### 5.2 Projects & File Asset Workflow
*   **Scoped Directory:** Team members only see projects they are assigned to.
*   **Upload Mechanisms:** Team members can submit files (PDF, DOCX, images, ZIP) or external links to their projects.
*   **Internal Review Lifecycle:** All assets uploaded by team members are automatically flagged with an `internal_review` status. They cannot bypass the Admin approval requirement before a client sees the file.

### 5.3 Task Tracking & Kanban
*   **Kanban Board:** Tasks are dynamically categorized into distinct lanes: To-Do, In Progress, Review, and Completed.
*   **Status Updates:** Team members possess the autonomy to drag-and-drop or update the status of their assigned tasks across the board.

### 5.4 Timesheets & Logging
*   **Contextual Logging:** When logging new hours, users select an active assigned project (and optionally a task). The entry requires a date, hours, and descriptive log.
*   **Modification Rights:** Team members can delete their own timesheet entries to make corrections, but cannot edit approved entries or others' logs.

---

## 6. Client Portal Experience

The Client Portal is a highly secure, interactive environment for clients to track engagements, review deliverables, and manage financials.

### 6.1 Dashboard & Tracking
*   **Global Search:** Queries across Project titles, Invoice numbers, and File names simultaneously.
*   **Active Projects Tracker:** Surfaces ongoing projects with interactive progress bars and dynamic deadline alerts (e.g., text turning red for "Overdue").
*   **Latest Docs:** Highlights the most recently uploaded, *approved* deliverables across all projects.

### 6.2 Deliverables & File Approval Workflow
*   **Isolation:** Clients *never* see files marked as `internal_review`.
*   **The Feedback Loop:** Every file displays a real-time status badge (Pending Review, Client Approved, Changes Requested).
    1.  **Approve (Confirming Delivery):** Triggers a confirmation modal. Stamping approval logs the client ID/timestamp and dispatches an automated email to the agency admins.
    2.  **Reject (Requesting Changes):** Opens a mandatory feedback modal. The client must type written feedback. The file status switches to "rejected", logging the feedback as a comment, and alerting the agency team instantly via email.

### 6.3 Financials & Invoices
*   **Financial Dashboard Metrics:** Calculates Total Outstanding, Total Paid, and flags any overdue invoices in real-time.
*   **Billing History:** Chronological table displaying all invoices. If a sent invoice passes its due date, the status dynamically changes to a red "OVERDUE" alert. Clients can generate and view PDFs on the fly.
*   **Project Quotations:** Tracks proposed quotes. Clicking a quote reveals a detailed, web-based digital document with branding, itemized breakdowns, taxes, and legal terms.
