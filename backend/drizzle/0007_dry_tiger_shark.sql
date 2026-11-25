CREATE TYPE "public"."access_level" AS ENUM('view', 'manage', 'full');--> statement-breakpoint
CREATE TYPE "public"."data_scope" AS ENUM('all', 'assigned');--> statement-breakpoint
CREATE TABLE "user_module_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"module_key" varchar(64) NOT NULL,
	"access_level" "access_level" DEFAULT 'manage' NOT NULL,
	"scope" "data_scope" DEFAULT 'all' NOT NULL,
	"granted_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_module_permissions_tenant_user_module_unique" UNIQUE("tenant_id","user_id","module_key")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "assigned_to" integer;--> statement-breakpoint
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_module_permissions_user_id_idx" ON "user_module_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_module_permissions_tenant_id_idx" ON "user_module_permissions" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_assigned_to_idx" ON "contacts" USING btree ("assigned_to");