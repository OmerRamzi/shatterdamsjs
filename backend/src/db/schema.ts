import { pgTable, foreignKey, serial, integer, varchar, text, timestamp, boolean, unique, date, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const invoiceStatus = pgEnum("invoice_status", ['draft', 'sent', 'paid', 'overdue', 'cancelled'])
export const milestoneStatus = pgEnum("milestone_status", ['pending', 'in_progress', 'completed', 'cancelled'])
export const projectPriority = pgEnum("project_priority", ['low', 'medium', 'high', 'urgent'])
export const projectStatus = pgEnum("project_status", ['active', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'])
export const quoteStatus = pgEnum("quote_status", ['draft', 'sent', 'accepted', 'rejected', 'expired'])
export const status = pgEnum("status", ['active', 'inactive', 'suspended'])
export const taskPriority = pgEnum("task_priority", ['low', 'medium', 'high', 'urgent'])
export const taskStatus = pgEnum("task_status", ['todo', 'in_progress', 'review', 'completed', 'cancelled'])
export const userRole = pgEnum("user_role", ['administrator', 'freelancer', 'client', 'employee'])


export const activityLogs = pgTable("activity_logs", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	userId: integer("user_id").notNull(),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: integer("entity_id"),
	description: text(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: varchar("user_agent", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "activity_logs_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_logs_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	userId: integer("user_id"),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	contactPerson: varchar("contact_person", { length: 255 }),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	address: text(),
	city: varchar({ length: 100 }),
	country: varchar({ length: 100 }).default('Sri Lanka'),
	status: status().default('active'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "clients_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "clients_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const files = pgTable("files", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	projectId: integer("project_id").notNull(),
	uploadedBy: integer("uploaded_by").notNull(),
	filename: varchar({ length: 255 }).notNull(),
	originalFilename: varchar("original_filename", { length: 255 }).notNull(),
	filePath: varchar("file_path", { length: 500 }).notNull(),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	version: integer().default(1),
	status: varchar({ length: 50 }).default('internal_review'),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	isExternal: boolean("is_external").default(false),
	externalLink: text("external_link"),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "files_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "files_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "files_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "files_uploaded_by_users_id_fk"
		}),
]);

export const fileComments = pgTable("file_comments", {
	id: serial().primaryKey().notNull(),
	fileId: integer("file_id").notNull(),
	userId: integer("user_id").notNull(),
	comment: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "file_comments_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "file_comments_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const invoices = pgTable("invoices", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	projectId: integer("project_id"),
	clientId: integer("client_id").notNull(),
	invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
	title: varchar({ length: 255 }),
	issueDate: date("issue_date").notNull(),
	dueDate: date("due_date").notNull(),
	subtotal: numeric({ precision: 15, scale:  2 }).notNull(),
	tax: numeric({ precision: 15, scale:  2 }).default('0.00'),
	discount: numeric({ precision: 15, scale:  2 }).default('0.00'),
	total: numeric({ precision: 15, scale:  2 }).notNull(),
	paidAmount: numeric("paid_amount", { precision: 15, scale:  2 }).default('0.00'),
	status: invoiceStatus().default('draft'),
	paidDate: date("paid_date"),
	notes: text(),
	pdfFilePath: varchar("pdf_file_path", { length: 255 }),
	terms: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "invoices_client_id_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "invoices_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "invoices_project_id_projects_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "invoices_tenant_id_tenants_id_fk"
		}),
	unique("invoices_invoice_number_unique").on(table.invoiceNumber),
]);

export const milestones = pgTable("milestones", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	dueDate: date("due_date"),
	status: milestoneStatus().default('pending'),
	amount: numeric({ precision: 15, scale:  2 }),
	orderIndex: integer("order_index").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "milestones_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const quotationItems = pgTable("quotation_items", {
	id: serial().primaryKey().notNull(),
	quotationId: integer("quotation_id").notNull(),
	description: text().notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).default('1.00').notNull(),
	unitPrice: numeric("unit_price", { precision: 15, scale:  2 }).notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.quotationId],
			foreignColumns: [quotations.id],
			name: "quotation_items_quotation_id_quotations_id_fk"
		}).onDelete("cascade"),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	clientId: integer("client_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	status: projectStatus().default('active'),
	priority: projectPriority().default('medium'),
	startDate: date("start_date"),
	deadline: date(),
	completionDate: date("completion_date"),
	budget: numeric({ precision: 15, scale:  2 }),
	progress: integer().default(0),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "projects_client_id_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "projects_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "projects_tenant_id_tenants_id_fk"
		}),
]);

export const quotations = pgTable("quotations", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	clientId: integer("client_id").notNull(),
	quoteNumber: varchar("quote_number", { length: 50 }).notNull(),
	title: varchar({ length: 255 }),
	issueDate: date("issue_date").notNull(),
	validUntil: date("valid_until").notNull(),
	subtotal: numeric({ precision: 15, scale:  2 }).notNull(),
	tax: numeric({ precision: 15, scale:  2 }).default('0.00'),
	discount: numeric({ precision: 15, scale:  2 }).default('0.00'),
	total: numeric({ precision: 15, scale:  2 }).notNull(),
	status: quoteStatus().default('draft'),
	notes: text(),
	terms: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "quotations_client_id_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "quotations_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "quotations_tenant_id_tenants_id_fk"
		}),
	unique("quotations_quote_number_unique").on(table.quoteNumber),
]);

export const timesheets = pgTable("timesheets", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	userId: integer("user_id").notNull(),
	projectId: integer("project_id").notNull(),
	taskId: integer("task_id"),
	date: date().notNull(),
	hours: numeric({ precision: 5, scale:  2 }).notNull(),
	description: text(),
	billable: boolean().default(true),
	approved: boolean().default(false),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "timesheets_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "timesheets_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "timesheets_task_id_tasks_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "timesheets_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "timesheets_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userRoles = pgTable("user_roles", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	role: userRole().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const projectTeam = pgTable("project_team", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: integer("user_id").notNull(),
	role: varchar({ length: 100 }),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_team_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_team_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const tenants = pgTable("tenants", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	subdomain: varchar({ length: 100 }),
	status: status().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("tenants_subdomain_unique").on(table.subdomain),
]);

export const invoiceItems = pgTable("invoice_items", {
	id: serial().primaryKey().notNull(),
	invoiceId: integer("invoice_id").notNull(),
	description: text().notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).default('1.00').notNull(),
	unitPrice: numeric("unit_price", { precision: 15, scale:  2 }).notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_items_invoice_id_invoices_id_fk"
		}).onDelete("cascade"),
]);

export const payrollLogs = pgTable("payroll_logs", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	userId: integer("user_id").notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	hoursWorked: numeric("hours_worked", { precision: 10, scale:  2 }).default('0.00'),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }).default('0.00'),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	paidDate: date("paid_date"),
	paymentMethod: varchar("payment_method", { length: 50 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "payroll_logs_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payroll_logs_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const settings = pgTable("settings", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: text("setting_value"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "settings_tenant_id_tenants_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	milestoneId: integer("milestone_id"),
	assignedTo: integer("assigned_to"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	status: taskStatus().default('todo'),
	priority: taskPriority().default('medium'),
	dueDate: date("due_date"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "tasks_assigned_to_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.milestoneId],
			foreignColumns: [milestones.id],
			name: "tasks_milestone_id_milestones_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tasks_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	preferredLocale: varchar("preferred_locale", { length: 10 }).default('en'),
	isActive: boolean("is_active").default(true),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	profileImage: varchar("profile_image", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	resetToken: text("reset_token"),
	resetTokenExpires: timestamp("reset_token_expires", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "users_tenant_id_tenants_id_fk"
		}),
	unique("users_email_unique").on(table.email),
]);
