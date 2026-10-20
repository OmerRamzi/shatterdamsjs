import { pgTable, foreignKey, serial, integer, varchar, text, timestamp, boolean, unique, date, numeric, pgEnum, index, json } from "drizzle-orm/pg-core"
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
export const revenueStreamFrequency = pgEnum("revenue_stream_frequency", ['one_time', 'weekly', 'monthly', 'quarterly', 'yearly'])
export const revenueStreamStatus = pgEnum("revenue_stream_status", ['active', 'paused', 'completed', 'cancelled'])
export const commissionStatus = pgEnum("commission_status", ['pending', 'paid', 'cancelled'])
export const creditNoteStatus = pgEnum("credit_note_status", ['draft', 'applied', 'void'])
export const notificationType = pgEnum("notification_type", ['invoice_send', 'quote_send', 'payment_reminder', 'overdue_alert'])
export const notificationStatus = pgEnum("notification_status", ['pending', 'approved', 'rejected', 'expired'])
export const leadStatus = pgEnum("lead_status", ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'])
export const leadSource = pgEnum("lead_source", ['website', 'referral', 'linkedin', 'instagram', 'outreach', 'partner', 'other'])
export const leadPriority = pgEnum("lead_priority", ['low', 'medium', 'high', 'hot'])
export const dealStage = pgEnum("deal_stage", ['discovery', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
export const contactRole = pgEnum("contact_role", ['decision_maker', 'influencer', 'billing', 'technical', 'primary', 'other'])
export const interactionType = pgEnum("interaction_type", ['call', 'meeting', 'email', 'note', 'task', 'whatsapp'])


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
	currency: varchar({ length: 10 }).default('LKR').notNull(),
	exchangeRate: numeric("exchange_rate", { precision: 15, scale: 6 }).default('1.000000').notNull(),
	paidAmount: numeric("paid_amount", { precision: 15, scale:  2 }).default('0.00'),
	status: invoiceStatus().default('draft'),
	paidDate: date("paid_date"),
	notes: text(),
	pdfFilePath: varchar("pdf_file_path", { length: 255 }),
	terms: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
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
	index("invoices_tenant_id_idx").on(table.tenantId),
	index("invoices_client_id_idx").on(table.clientId),
	index("invoices_project_id_idx").on(table.projectId),
]);

export const milestones = pgTable("milestones", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
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
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "milestones_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.projectId],
		foreignColumns: [projects.id],
		name: "milestones_project_id_projects_id_fk"
	}).onDelete("cascade"),
	index("milestones_tenant_id_idx").on(table.tenantId),
	index("milestones_project_id_idx").on(table.projectId),
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
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }).default('0.00'),
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
	index("projects_tenant_id_idx").on(table.tenantId),
	index("projects_client_id_idx").on(table.clientId),
]);

export const quotations = pgTable("quotations", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	clientId: integer("client_id").notNull(),
	projectId: integer("project_id"),
	convertedToInvoiceId: integer("converted_to_invoice_id"),
	quoteNumber: varchar("quote_number", { length: 50 }).notNull(),
	title: varchar({ length: 255 }),
	issueDate: date("issue_date").notNull(),
	validUntil: date("valid_until").notNull(),
	subtotal: numeric({ precision: 15, scale:  2 }).notNull(),
	tax: numeric({ precision: 15, scale:  2 }).default('0.00'),
	discount: numeric({ precision: 15, scale:  2 }).default('0.00'),
	total: numeric({ precision: 15, scale:  2 }).notNull(),
	currency: varchar({ length: 10 }).default('LKR').notNull(),
	exchangeRate: numeric("exchange_rate", { precision: 15, scale: 6 }).default('1.000000').notNull(),
	status: quoteStatus().default('draft'),
	notes: text(),
	terms: text(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
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
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "quotations_project_id_projects_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.convertedToInvoiceId],
			foreignColumns: [invoices.id],
			name: "quotations_converted_to_invoice_id_invoices_id_fk"
		}).onDelete("set null"),
	unique("quotations_quote_number_unique").on(table.quoteNumber),
	index("quotations_tenant_id_idx").on(table.tenantId),
	index("quotations_client_id_idx").on(table.clientId),
	index("quotations_project_id_idx").on(table.projectId),
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
	tenantId: integer("tenant_id").notNull(),
	projectId: integer("project_id").notNull(),
	milestoneId: integer("milestone_id"),
	assignedTo: integer("assigned_to"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	status: taskStatus().default('todo'),
	priority: taskPriority().default('medium'),
	dueDate: date("due_date"),
	estimatedHours: numeric("estimated_hours", { precision: 5, scale: 2 }).default('0.00'),
	subtasks: json("subtasks").$type<Array<{ id: string; title: string; completed: boolean }>>().default([]),
	orderIndex: integer("order_index").default(0),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "tasks_tenant_id_tenants_id_fk"
	}),
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
	index("tasks_tenant_id_idx").on(table.tenantId),
	index("tasks_project_id_idx").on(table.projectId),
	index("tasks_milestone_id_idx").on(table.milestoneId),
	index("tasks_assigned_to_idx").on(table.assignedTo),
	index("tasks_status_idx").on(table.status),
]);

export const taskComments = pgTable("task_comments", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	taskId: integer("task_id").notNull(),
	userId: integer("user_id").notNull(),
	comment: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "task_comments_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.taskId],
		foreignColumns: [tasks.id],
		name: "task_comments_task_id_tasks_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "task_comments_user_id_users_id_fk"
	}).onDelete("cascade"),
	index("task_comments_tenant_id_idx").on(table.tenantId),
	index("task_comments_task_id_idx").on(table.taskId),
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

export const revenueStreams = pgTable("revenue_streams", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	clientId: integer("client_id").notNull(),
	projectId: integer("project_id"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	amount: numeric({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('LKR').notNull(),
	frequency: revenueStreamFrequency().default('monthly'),
	status: revenueStreamStatus().default('active'),
	autoGenerateInvoice: boolean("auto_generate_invoice").default(false),
	nextBillingDate: date("next_billing_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "revenue_streams_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [clients.id],
		name: "revenue_streams_client_id_clients_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.projectId],
		foreignColumns: [projects.id],
		name: "revenue_streams_project_id_projects_id_fk"
	}).onDelete("set null"),
	index("revenue_streams_tenant_id_idx").on(table.tenantId),
	index("revenue_streams_client_id_idx").on(table.clientId),
	index("revenue_streams_project_id_idx").on(table.projectId),
]);

export const revenueRecords = pgTable("revenue_records", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	streamId: integer("stream_id").notNull(),
	amount: numeric({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('LKR').notNull(),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).defaultNow(),
	notes: text(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "revenue_records_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.streamId],
		foreignColumns: [revenueStreams.id],
		name: "revenue_records_stream_id_revenue_streams_id_fk"
	}).onDelete("cascade"),
]);

export const commissions = pgTable("commissions", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	clientId: integer("client_id"),
	projectId: integer("project_id"),
	source: varchar({ length: 100 }).notNull(),
	amount: numeric({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('LKR').notNull(),
	date: date().notNull(),
	status: commissionStatus().default('pending'),
	referenceId: varchar("reference_id", { length: 255 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "commissions_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [clients.id],
		name: "commissions_client_id_clients_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.projectId],
		foreignColumns: [projects.id],
		name: "commissions_project_id_projects_id_fk"
	}).onDelete("set null"),
	index("commissions_tenant_id_idx").on(table.tenantId),
	index("commissions_client_id_idx").on(table.clientId),
	index("commissions_project_id_idx").on(table.projectId),
]);

export const expenseCategories = pgTable("expense_categories", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "expense_categories_tenant_id_tenants_id_fk"
	}),
	index("expense_categories_tenant_id_idx").on(table.tenantId),
]);

export const expenses = pgTable("expenses", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	projectId: integer("project_id"),
	categoryId: integer("category_id").notNull(),
	amount: numeric({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 10 }).default('LKR').notNull(),
	description: text(),
	date: date().notNull(),
	receiptFilePath: varchar("receipt_file_path", { length: 500 }),
	receiptFileName: varchar("receipt_file_name", { length: 255 }),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "expenses_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.projectId],
		foreignColumns: [projects.id],
		name: "expenses_project_id_projects_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.categoryId],
		foreignColumns: [expenseCategories.id],
		name: "expenses_category_id_expense_categories_id_fk"
	}),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "expenses_created_by_users_id_fk"
	}),
	index("expenses_tenant_id_idx").on(table.tenantId),
	index("expenses_project_id_idx").on(table.projectId),
]);

export const creditNotes = pgTable("credit_notes", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	invoiceId: integer("invoice_id").notNull(),
	creditNoteNumber: varchar("credit_note_number", { length: 50 }).notNull(),
	amount: numeric({ precision: 15, scale: 2 }).notNull(),
	reason: text(),
	status: creditNoteStatus().default('draft'),
	appliedDate: date("applied_date"),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "credit_notes_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.invoiceId],
		foreignColumns: [invoices.id],
		name: "credit_notes_invoice_id_invoices_id_fk"
	}),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "credit_notes_created_by_users_id_fk"
	}),
	unique("credit_notes_credit_note_number_unique").on(table.creditNoteNumber),
	index("credit_notes_tenant_id_idx").on(table.tenantId),
	index("credit_notes_invoice_id_idx").on(table.invoiceId),
]);

export const notificationQueue = pgTable("notification_queue", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	type: notificationType().notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: integer("entity_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	status: notificationStatus().default('pending'),
	createdBy: integer("created_by"),
	reviewedBy: integer("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "notification_queue_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "notification_queue_created_by_users_id_fk"
	}),
	foreignKey({
		columns: [table.reviewedBy],
		foreignColumns: [users.id],
		name: "notification_queue_reviewed_by_users_id_fk"
	}),
	index("notification_queue_tenant_id_idx").on(table.tenantId),
	index("notification_queue_status_idx").on(table.status),
]);

export const paymentProofs = pgTable("payment_proofs", {
	id: serial().primaryKey().notNull(),
	invoiceId: integer("invoice_id").notNull(),
	filePath: varchar("file_path", { length: 500 }).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	uploadedBy: integer("uploaded_by").notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.invoiceId],
		foreignColumns: [invoices.id],
		name: "payment_proofs_invoice_id_invoices_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.uploadedBy],
		foreignColumns: [users.id],
		name: "payment_proofs_uploaded_by_users_id_fk"
	}),
	index("payment_proofs_invoice_id_idx").on(table.invoiceId),
]);

export const leads = pgTable("leads", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	companyName: varchar("company_name", { length: 255 }),
	contactName: varchar("contact_name", { length: 255 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	source: leadSource().default('website'),
	status: leadStatus().default('new'),
	priority: leadPriority().default('medium'),
	estimatedValue: numeric("estimated_value", { precision: 15, scale: 2 }).default('0.00'),
	currency: varchar({ length: 10 }).default('LKR'),
	assignedTo: integer("assigned_to"),
	convertedToClientId: integer("converted_to_client_id"),
	convertedToDealId: integer("converted_to_deal_id"),
	lostReason: text("lost_reason"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "leads_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.assignedTo],
		foreignColumns: [users.id],
		name: "leads_assigned_to_users_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.convertedToClientId],
		foreignColumns: [clients.id],
		name: "leads_converted_to_client_id_clients_id_fk"
	}).onDelete("set null"),
	index("leads_tenant_id_idx").on(table.tenantId),
	index("leads_status_idx").on(table.status),
	index("leads_assigned_to_idx").on(table.assignedTo),
]);

export const deals = pgTable("deals", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	stage: dealStage().default('discovery'),
	amount: numeric({ precision: 15, scale: 2 }).default('0.00').notNull(),
	currency: varchar({ length: 10 }).default('LKR'),
	probability: integer().default(20),
	expectedCloseDate: date("expected_close_date"),
	leadId: integer("lead_id"),
	clientId: integer("client_id"),
	assignedTo: integer("assigned_to"),
	quotationId: integer("quotation_id"),
	projectId: integer("project_id"),
	lostReason: text("lost_reason"),
	orderIndex: integer("order_index").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "deals_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.leadId],
		foreignColumns: [leads.id],
		name: "deals_lead_id_leads_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [clients.id],
		name: "deals_client_id_clients_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.assignedTo],
		foreignColumns: [users.id],
		name: "deals_assigned_to_users_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.quotationId],
		foreignColumns: [quotations.id],
		name: "deals_quotation_id_quotations_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.projectId],
		foreignColumns: [projects.id],
		name: "deals_project_id_projects_id_fk"
	}).onDelete("set null"),
	index("deals_tenant_id_idx").on(table.tenantId),
	index("deals_stage_idx").on(table.stage),
	index("deals_client_id_idx").on(table.clientId),
	index("deals_assigned_to_idx").on(table.assignedTo),
]);

export const contacts = pgTable("contacts", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	leadId: integer("lead_id"),
	clientId: integer("client_id"),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	jobTitle: varchar("job_title", { length: 100 }),
	role: contactRole().default('decision_maker'),
	isPrimary: boolean("is_primary").default(false),
	linkedinUrl: varchar("linkedin_url", { length: 255 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "contacts_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.leadId],
		foreignColumns: [leads.id],
		name: "contacts_lead_id_leads_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [clients.id],
		name: "contacts_client_id_clients_id_fk"
	}).onDelete("cascade"),
	index("contacts_tenant_id_idx").on(table.tenantId),
	index("contacts_client_id_idx").on(table.clientId),
	index("contacts_lead_id_idx").on(table.leadId),
]);

export const crmInteractions = pgTable("crm_interactions", {
	id: serial().primaryKey().notNull(),
	tenantId: integer("tenant_id").notNull(),
	type: interactionType().default('note'),
	title: varchar({ length: 255 }).notNull(),
	content: text(),
	leadId: integer("lead_id"),
	dealId: integer("deal_id"),
	clientId: integer("client_id"),
	contactId: integer("contact_id"),
	performedBy: integer("performed_by").notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	isCompleted: boolean("is_completed").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "crm_interactions_tenant_id_tenants_id_fk"
	}),
	foreignKey({
		columns: [table.leadId],
		foreignColumns: [leads.id],
		name: "crm_interactions_lead_id_leads_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.dealId],
		foreignColumns: [deals.id],
		name: "crm_interactions_deal_id_deals_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [clients.id],
		name: "crm_interactions_client_id_clients_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.contactId],
		foreignColumns: [contacts.id],
		name: "crm_interactions_contact_id_contacts_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.performedBy],
		foreignColumns: [users.id],
		name: "crm_interactions_performed_by_users_id_fk"
	}),
	index("crm_interactions_tenant_id_idx").on(table.tenantId),
	index("crm_interactions_lead_id_idx").on(table.leadId),
	index("crm_interactions_deal_id_idx").on(table.dealId),
	index("crm_interactions_client_id_idx").on(table.clientId),
]);
