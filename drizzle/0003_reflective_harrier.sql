ALTER TABLE "campaigns" ADD COLUMN "attribution_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "attribution_source" varchar(100);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "attribution_medium" varchar(100);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "attribution_campaign" varchar(200);