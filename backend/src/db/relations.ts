import { relations } from "drizzle-orm/relations";
import { tenants, activityLogs, users, clients, files, projects, fileComments, invoices, milestones, quotations, quotationItems, timesheets, tasks, userRoles, projectTeam, invoiceItems, payrollLogs, settings } from "./schema";

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	tenant: one(tenants, {
		fields: [activityLogs.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [activityLogs.userId],
		references: [users.id]
	}),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	activityLogs: many(activityLogs),
	clients: many(clients),
	files: many(files),
	invoices: many(invoices),
	projects: many(projects),
	quotations: many(quotations),
	timesheets: many(timesheets),
	payrollLogs: many(payrollLogs),
	settings: many(settings),
	users: many(users),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	activityLogs: many(activityLogs),
	clients: many(clients),
	files_approvedBy: many(files, {
		relationName: "files_approvedBy_users_id"
	}),
	files_uploadedBy: many(files, {
		relationName: "files_uploadedBy_users_id"
	}),
	fileComments: many(fileComments),
	invoices: many(invoices),
	projects: many(projects),
	quotations: many(quotations),
	timesheets_approvedBy: many(timesheets, {
		relationName: "timesheets_approvedBy_users_id"
	}),
	timesheets_userId: many(timesheets, {
		relationName: "timesheets_userId_users_id"
	}),
	userRoles: many(userRoles),
	projectTeams: many(projectTeam),
	payrollLogs: many(payrollLogs),
	tasks: many(tasks),
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [clients.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [clients.userId],
		references: [users.id]
	}),
	invoices: many(invoices),
	projects: many(projects),
	quotations: many(quotations),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [files.approvedBy],
		references: [users.id],
		relationName: "files_approvedBy_users_id"
	}),
	project: one(projects, {
		fields: [files.projectId],
		references: [projects.id]
	}),
	tenant: one(tenants, {
		fields: [files.tenantId],
		references: [tenants.id]
	}),
	user_uploadedBy: one(users, {
		fields: [files.uploadedBy],
		references: [users.id],
		relationName: "files_uploadedBy_users_id"
	}),
	fileComments: many(fileComments),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	files: many(files),
	invoices: many(invoices),
	milestones: many(milestones),
	client: one(clients, {
		fields: [projects.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [projects.createdBy],
		references: [users.id]
	}),
	tenant: one(tenants, {
		fields: [projects.tenantId],
		references: [tenants.id]
	}),
	timesheets: many(timesheets),
	projectTeams: many(projectTeam),
	tasks: many(tasks),
}));

export const fileCommentsRelations = relations(fileComments, ({one}) => ({
	file: one(files, {
		fields: [fileComments.fileId],
		references: [files.id]
	}),
	user: one(users, {
		fields: [fileComments.userId],
		references: [users.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	client: one(clients, {
		fields: [invoices.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [invoices.createdBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [invoices.projectId],
		references: [projects.id]
	}),
	tenant: one(tenants, {
		fields: [invoices.tenantId],
		references: [tenants.id]
	}),
	invoiceItems: many(invoiceItems),
}));

export const milestonesRelations = relations(milestones, ({one, many}) => ({
	project: one(projects, {
		fields: [milestones.projectId],
		references: [projects.id]
	}),
	tasks: many(tasks),
}));

export const quotationItemsRelations = relations(quotationItems, ({one}) => ({
	quotation: one(quotations, {
		fields: [quotationItems.quotationId],
		references: [quotations.id]
	}),
}));

export const quotationsRelations = relations(quotations, ({one, many}) => ({
	quotationItems: many(quotationItems),
	client: one(clients, {
		fields: [quotations.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [quotations.createdBy],
		references: [users.id]
	}),
	tenant: one(tenants, {
		fields: [quotations.tenantId],
		references: [tenants.id]
	}),
}));

export const timesheetsRelations = relations(timesheets, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [timesheets.approvedBy],
		references: [users.id],
		relationName: "timesheets_approvedBy_users_id"
	}),
	project: one(projects, {
		fields: [timesheets.projectId],
		references: [projects.id]
	}),
	task: one(tasks, {
		fields: [timesheets.taskId],
		references: [tasks.id]
	}),
	tenant: one(tenants, {
		fields: [timesheets.tenantId],
		references: [tenants.id]
	}),
	user_userId: one(users, {
		fields: [timesheets.userId],
		references: [users.id],
		relationName: "timesheets_userId_users_id"
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	timesheets: many(timesheets),
	user: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id]
	}),
	milestone: one(milestones, {
		fields: [tasks.milestoneId],
		references: [milestones.id]
	}),
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
}));

export const projectTeamRelations = relations(projectTeam, ({one}) => ({
	project: one(projects, {
		fields: [projectTeam.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectTeam.userId],
		references: [users.id]
	}),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceItems.invoiceId],
		references: [invoices.id]
	}),
}));

export const payrollLogsRelations = relations(payrollLogs, ({one}) => ({
	tenant: one(tenants, {
		fields: [payrollLogs.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [payrollLogs.userId],
		references: [users.id]
	}),
}));

export const settingsRelations = relations(settings, ({one}) => ({
	tenant: one(tenants, {
		fields: [settings.tenantId],
		references: [tenants.id]
	}),
}));