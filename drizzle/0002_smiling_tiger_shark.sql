CREATE TYPE "public"."embed_event_type" AS ENUM('impression', 'click');--> statement-breakpoint
CREATE TABLE "campaign_embed_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"public_key" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rewrite_links" boolean DEFAULT true NOT NULL,
	"selector" varchar(255) DEFAULT 'a[data-linkshift]' NOT NULL,
	"forward_page_query" boolean DEFAULT true NOT NULL,
	"allowed_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_embed_settings_campaign_id_unique" UNIQUE("campaign_id"),
	CONSTRAINT "campaign_embed_settings_public_key_unique" UNIQUE("public_key")
);
--> statement-breakpoint
CREATE TABLE "embed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"embed_setting_id" uuid NOT NULL,
	"type" "embed_event_type" NOT NULL,
	"source_domain" varchar(255) NOT NULL,
	"page_url" text,
	"user_agent" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_embed_settings" ADD CONSTRAINT "campaign_embed_settings_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embed_events" ADD CONSTRAINT "embed_events_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embed_events" ADD CONSTRAINT "embed_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embed_events" ADD CONSTRAINT "embed_events_embed_setting_id_campaign_embed_settings_id_fk" FOREIGN KEY ("embed_setting_id") REFERENCES "public"."campaign_embed_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_embed_settings_campaign_enabled_idx" ON "campaign_embed_settings" USING btree ("campaign_id","enabled");--> statement-breakpoint
CREATE INDEX "campaign_embed_settings_public_key_idx" ON "campaign_embed_settings" USING btree ("public_key");--> statement-breakpoint
CREATE INDEX "embed_events_campaign_occurred_at_idx" ON "embed_events" USING btree ("campaign_id","occurred_at");--> statement-breakpoint
CREATE INDEX "embed_events_setting_type_occurred_idx" ON "embed_events" USING btree ("embed_setting_id","type","occurred_at");--> statement-breakpoint
CREATE INDEX "embed_events_owner_occurred_at_idx" ON "embed_events" USING btree ("owner_id","occurred_at");