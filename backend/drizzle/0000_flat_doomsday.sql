CREATE TABLE "activity_logs" (
	"id" integer PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"user_id" integer,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" integer PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"tenant_id" integer
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" integer PRIMARY KEY NOT NULL,
	"tenantId" integer,
	"projectId" integer,
	"uploadedBy" integer,
	"filename" varchar(255) NOT NULL,
	"originalFilename" varchar(255) NOT NULL,
	"filePath" text NOT NULL,
	"fileSize" integer,
	"mimeType" varchar(255),
	"status" varchar(50),
	"version" integer DEFAULT 1,
	"approvedBy" integer,
	"approvedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"client_id" integer,
	"tenant_id" integer,
	"budget" numeric,
	"deadline" date,
	"status" varchar(50) DEFAULT 'active',
	"priority" varchar(50) DEFAULT 'medium',
	"progress" integer DEFAULT 0,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"project_id" integer,
	"tenant_id" integer,
	"status" varchar(50) DEFAULT 'todo',
	"priority" varchar(50) DEFAULT 'medium',
	"due_date" timestamp with time zone,
	"assignee_id" integer
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"role" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"tenant_id" integer,
	"reset_token" text,
	"reset_token_expires" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;