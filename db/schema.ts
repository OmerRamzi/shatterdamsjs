import { pgTable, serial, integer, varchar, text, timestamp, boolean, date, numeric, pgEnum, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- ENUMS ---
export const statusEnum = pgEnum("status", ["active", "inactive", "suspended"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "in_progress", "review", "completed", "on_hold", "cancelled"]);
export const projectPriorityEnum = pgEnum("project_priority", ["low", "medium", "high", "urgent"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "completed", "cancelled"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled"]);
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "accepted", "rejected", "expired"]);
export const milestoneStatusEnum = pgEnum("milestone_status", ["pending", "in_progress", "completed", "cancelled"]);
export const userRoleEnum = pgEnum("user_role", ["administrator", "freelancer", "client", "employee"]);

// --- TABLES ---

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  status: statusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  preferredLocale: varchar("preferred_locale", { length: 10 }).default("en"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  profileImage: varchar("profile_image", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  settingKey: varchar("setting_key", { length: 100 }).notNull(),
  settingValue: text("setting_value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }), // Auto-provisioned user
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("Sri Lanka"),
  status: statusEnum("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: integer("entity_id"),
  description: text("description"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("active"),
  priority: projectPriorityEnum("priority").default("medium"),
  startDate: date("start_date"),
  deadline: date("deadline"),
  completionDate: date("completion_date"),
  budget: numeric("budget", { precision: 15, scale: 2 }),
  progress: integer("progress").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const projectTeam = pgTable("project_team", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 100 }),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: milestoneStatusEnum("status").default("pending"),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneId: integer("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("todo"),
  priority: taskPriorityEnum("priority").default("medium"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(), // This will now store the R2 Key
  fileSize: integer("file_size"), // bigserial or integer based on size, using integer
  mimeType: varchar("mime_type", { length: 100 }),
  version: integer("version").default(1),
  status: varchar("status", { length: 50 }).default("internal_review"), // Could be enum, kept as varchar based on original
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  isExternal: boolean("is_external").default(false),
  externalLink: text("external_link"),
});

export const fileComments = pgTable("file_comments", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 15, scale: 2 }).default("0.00"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0.00"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 }).default("0.00"),
  status: invoiceStatusEnum("status").default("draft"),
  paidDate: date("paid_date"),
  notes: text("notes"),
  pdfFilePath: varchar("pdf_file_path", { length: 255 }), // R2 Key
  terms: text("terms"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
});

export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  quoteNumber: varchar("quote_number", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  issueDate: date("issue_date").notNull(),
  validUntil: date("valid_until").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 15, scale: 2 }).default("0.00"),
  discount: numeric("discount", { precision: 15, scale: 2 }).default("0.00"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  status: quoteStatusEnum("status").default("draft"),
  notes: text("notes"),
  terms: text("terms"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  billable: boolean("billable").default(true),
  approved: boolean("approved").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollLogs = pgTable("payroll_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  hoursWorked: numeric("hours_worked", { precision: 10, scale: 2 }).default("0.00"),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).default("0.00"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  paidDate: date("paid_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
