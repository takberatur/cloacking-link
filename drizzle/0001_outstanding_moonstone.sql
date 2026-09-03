CREATE TYPE "public"."block_rule_action" AS ENUM('block', 'allow', 'redirect');--> statement-breakpoint
CREATE TYPE "public"."block_rule_operator" AS ENUM('equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', 'matches', 'cidr');--> statement-breakpoint
CREATE TYPE "public"."block_rule_type" AS ENUM('country', 'ip', 'ip_range', 'device', 'os', 'browser', 'bot', 'user_agent', 'referrer', 'asn');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."click_outcome" AS ENUM('redirected', 'blocked', 'fallback', 'safelink', 'error');--> statement-breakpoint
CREATE TYPE "public"."destination_platform" AS ENUM('generic', 'amazon', 'ebay', 'shopee', 'tiktok', 'traveloka', 'custom');--> statement-breakpoint
CREATE TYPE "public"."destination_type" AS ENUM('affiliate', 'cpa', 'direct', 'popunder');--> statement-breakpoint
CREATE TYPE "public"."geo_mode" AS ENUM('all', 'include', 'exclude');--> statement-breakpoint
CREATE TYPE "public"."popunder_behavior" AS ENUM('background', 'new_tab', 'same_tab');--> statement-breakpoint
CREATE TYPE "public"."redirect_type" AS ENUM('direct', 'safelink', 'deeplink');--> statement-breakpoint
CREATE TYPE "public"."rotation_strategy" AS ENUM('equal', 'percentage', 'priority');--> statement-breakpoint
CREATE TYPE "public"."safelink_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "block_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"campaign_id" uuid,
	"name" varchar(160) NOT NULL,
	"type" "block_rule_type" NOT NULL,
	"operator" "block_rule_operator" DEFAULT 'equals' NOT NULL,
	"action" "block_rule_action" DEFAULT 'block' NOT NULL,
	"value" text NOT NULL,
	"redirect_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"redirect_type" "redirect_type" DEFAULT 'direct' NOT NULL,
	"rotation_strategy" "rotation_strategy" DEFAULT 'equal' NOT NULL,
	"fallback_url" text,
	"redirect_code" integer DEFAULT 302 NOT NULL,
	"preserve_query_params" boolean DEFAULT true NOT NULL,
	"strip_referrer" boolean DEFAULT false NOT NULL,
	"bot_protection_enabled" boolean DEFAULT true NOT NULL,
	"tracking_enabled" boolean DEFAULT true NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"destination_id" uuid,
	"visitor_id" uuid,
	"block_rule_id" uuid,
	"outcome" "click_outcome" NOT NULL,
	"redirect_type" "redirect_type",
	"country_code" varchar(2),
	"region_code" varchar(16),
	"city" varchar(120),
	"timezone" varchar(64),
	"ip_hash" varchar(128),
	"device_type" varchar(32),
	"os" varchar(64),
	"browser" varchar(64),
	"user_agent" text,
	"referrer" text,
	"language" varchar(32),
	"is_unique" boolean DEFAULT false NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"bot_score" integer DEFAULT 0 NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"response_time_ms" integer,
	"query_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "click_events_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "destination_deep_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"android_scheme" text,
	"android_package_name" varchar(255),
	"android_store_url" text,
	"ios_scheme" text,
	"ios_app_id" varchar(64),
	"ios_store_url" text,
	"universal_link" text,
	"web_fallback_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destination_deep_links_destination_id_unique" UNIQUE("destination_id")
);
--> statement-breakpoint
CREATE TABLE "destination_geo_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"url" text NOT NULL,
	"type" "destination_type" DEFAULT 'affiliate' NOT NULL,
	"platform" "destination_platform" DEFAULT 'generic' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"geo_mode" "geo_mode" DEFAULT 'all' NOT NULL,
	"max_daily_clicks" integer,
	"active_from" timestamp with time zone,
	"active_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "popunder_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"target_url" text NOT NULL,
	"behavior" "popunder_behavior" DEFAULT 'background' NOT NULL,
	"delay_ms" integer DEFAULT 0 NOT NULL,
	"frequency_cap" integer DEFAULT 1 NOT NULL,
	"frequency_window_hours" integer DEFAULT 24 NOT NULL,
	"browser_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "popunder_settings_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "safelink_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"status" "safelink_status" DEFAULT 'draft' NOT NULL,
	"document" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_document" jsonb,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"custom_css" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safelink_pages_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"visitor_key_hash" varchar(128) NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_visits" integer DEFAULT 1 NOT NULL,
	"last_country_code" varchar(2),
	"last_device_type" varchar(32),
	"last_browser" varchar(64),
	"last_os" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "block_rules" ADD CONSTRAINT "block_rules_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_rules" ADD CONSTRAINT "block_rules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_block_rule_id_block_rules_id_fk" FOREIGN KEY ("block_rule_id") REFERENCES "public"."block_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_deep_links" ADD CONSTRAINT "destination_deep_links_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destination_geo_targets" ADD CONSTRAINT "destination_geo_targets_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "popunder_settings" ADD CONSTRAINT "popunder_settings_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safelink_pages" ADD CONSTRAINT "safelink_pages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "block_rules_owner_campaign_idx" ON "block_rules" USING btree ("owner_id","campaign_id");--> statement-breakpoint
CREATE INDEX "block_rules_campaign_enabled_position_idx" ON "block_rules" USING btree ("campaign_id","enabled","position");--> statement-breakpoint
CREATE INDEX "block_rules_owner_global_idx" ON "block_rules" USING btree ("owner_id","enabled","position");--> statement-breakpoint
CREATE INDEX "campaigns_owner_status_idx" ON "campaigns" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_owner_created_at_idx" ON "campaigns" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "campaigns_status_schedule_idx" ON "campaigns" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "campaigns_slug_idx" ON "campaigns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "click_events_owner_occurred_at_idx" ON "click_events" USING btree ("owner_id","occurred_at");--> statement-breakpoint
CREATE INDEX "click_events_campaign_occurred_at_idx" ON "click_events" USING btree ("campaign_id","occurred_at");--> statement-breakpoint
CREATE INDEX "click_events_campaign_outcome_occurred_idx" ON "click_events" USING btree ("campaign_id","outcome","occurred_at");--> statement-breakpoint
CREATE INDEX "click_events_destination_occurred_at_idx" ON "click_events" USING btree ("destination_id","occurred_at");--> statement-breakpoint
CREATE INDEX "click_events_visitor_occurred_at_idx" ON "click_events" USING btree ("visitor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "click_events_country_occurred_at_idx" ON "click_events" USING btree ("country_code","occurred_at");--> statement-breakpoint
CREATE INDEX "click_events_ip_hash_occurred_at_idx" ON "click_events" USING btree ("ip_hash","occurred_at");--> statement-breakpoint
CREATE INDEX "destination_deep_links_destination_idx" ON "destination_deep_links" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "destination_geo_targets_destination_country_uidx" ON "destination_geo_targets" USING btree ("destination_id","country_code");--> statement-breakpoint
CREATE INDEX "destination_geo_targets_country_idx" ON "destination_geo_targets" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_campaign_position_uidx" ON "destinations" USING btree ("campaign_id","position");--> statement-breakpoint
CREATE INDEX "destinations_campaign_enabled_idx" ON "destinations" USING btree ("campaign_id","enabled");--> statement-breakpoint
CREATE INDEX "destinations_campaign_priority_idx" ON "destinations" USING btree ("campaign_id","priority");--> statement-breakpoint
CREATE INDEX "destinations_active_window_idx" ON "destinations" USING btree ("active_from","active_until");--> statement-breakpoint
CREATE INDEX "popunder_settings_campaign_enabled_idx" ON "popunder_settings" USING btree ("campaign_id","enabled");--> statement-breakpoint
CREATE INDEX "safelink_pages_campaign_status_idx" ON "safelink_pages" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "visitors_owner_key_hash_uidx" ON "visitors" USING btree ("owner_id","visitor_key_hash");--> statement-breakpoint
CREATE INDEX "visitors_owner_last_seen_idx" ON "visitors" USING btree ("owner_id","last_seen_at");