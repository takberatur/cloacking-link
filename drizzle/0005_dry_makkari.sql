CREATE TYPE "public"."campaign_domain_status" AS ENUM('pending', 'verified', 'disabled');--> statement-breakpoint
CREATE TABLE "campaign_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"hostname" varchar(253) NOT NULL,
	"status" "campaign_domain_status" DEFAULT 'pending' NOT NULL,
	"verification_token" varchar(96) NOT NULL,
	"verified_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_domains" ADD CONSTRAINT "campaign_domains_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_domains" ADD CONSTRAINT "campaign_domains_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_domains_hostname_uidx" ON "campaign_domains" USING btree ("hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_domains_verification_token_uidx" ON "campaign_domains" USING btree ("verification_token");--> statement-breakpoint
CREATE INDEX "campaign_domains_campaign_idx" ON "campaign_domains" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_domains_owner_status_idx" ON "campaign_domains" USING btree ("owner_id","status");