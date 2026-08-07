CREATE TYPE "public"."credit_note_status" AS ENUM('draft', 'applied', 'void');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('invoice_send', 'quote_send', 'payment_reminder', 'overdue_alert');--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"credit_note_number" varchar(50) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reason" text,
	"status" "credit_note_status" DEFAULT 'draft',
	"applied_date" date,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "credit_notes_credit_note_number_unique" UNIQUE("credit_note_number")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"project_id" integer,
	"category_id" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'LKR' NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"receipt_file_path" varchar(500),
	"receipt_file_name" varchar(255),
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "notification_status" DEFAULT 'pending',
	"created_by" integer,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "commissions" ALTER COLUMN "currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "revenue_records" ALTER COLUMN "currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "revenue_streams" ALTER COLUMN "currency" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "hourly_rate" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "converted_to_invoice_id" integer;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_notes_tenant_id_idx" ON "credit_notes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "credit_notes_invoice_id_idx" ON "credit_notes" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "expense_categories_tenant_id_idx" ON "expense_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "expenses_tenant_id_idx" ON "expenses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "expenses_project_id_idx" ON "expenses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "notification_queue_tenant_id_idx" ON "notification_queue" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notification_queue_status_idx" ON "notification_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_proofs_invoice_id_idx" ON "payment_proofs" USING btree ("invoice_id");--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_converted_to_invoice_id_invoices_id_fk" FOREIGN KEY ("converted_to_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commissions_tenant_id_idx" ON "commissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "commissions_client_id_idx" ON "commissions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "commissions_project_id_idx" ON "commissions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_id_idx" ON "invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_project_id_idx" ON "invoices" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_tenant_id_idx" ON "projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "projects_client_id_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "quotations_tenant_id_idx" ON "quotations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "quotations_client_id_idx" ON "quotations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "quotations_project_id_idx" ON "quotations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "revenue_streams_tenant_id_idx" ON "revenue_streams" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "revenue_streams_client_id_idx" ON "revenue_streams" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "revenue_streams_project_id_idx" ON "revenue_streams" USING btree ("project_id");