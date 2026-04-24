CREATE TABLE "weekly_share_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"week_starts_on" timestamp with time zone NOT NULL,
	"shared_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_share_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_share_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"visitor_user_id" uuid,
	"referrer" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weekly_share_campaigns" ADD CONSTRAINT "weekly_share_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_share_referrals" ADD CONSTRAINT "weekly_share_referrals_campaign_id_weekly_share_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."weekly_share_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_share_referrals" ADD CONSTRAINT "weekly_share_referrals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_share_referrals" ADD CONSTRAINT "weekly_share_referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_share_visits" ADD CONSTRAINT "weekly_share_visits_campaign_id_weekly_share_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."weekly_share_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_share_visits" ADD CONSTRAINT "weekly_share_visits_visitor_user_id_users_id_fk" FOREIGN KEY ("visitor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_share_campaigns_user_id_week_starts_on_index" ON "weekly_share_campaigns" USING btree ("user_id","week_starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_share_campaigns_token_index" ON "weekly_share_campaigns" USING btree ("token");--> statement-breakpoint
CREATE INDEX "weekly_share_campaigns_user_id_created_at_index" ON "weekly_share_campaigns" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_share_referrals_owner_user_id_referred_user_id_index" ON "weekly_share_referrals" USING btree ("owner_user_id","referred_user_id");--> statement-breakpoint
CREATE INDEX "weekly_share_referrals_owner_user_id_acknowledged_at_index" ON "weekly_share_referrals" USING btree ("owner_user_id","acknowledged_at");--> statement-breakpoint
CREATE INDEX "weekly_share_referrals_campaign_id_index" ON "weekly_share_referrals" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "weekly_share_visits_campaign_id_created_at_index" ON "weekly_share_visits" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "weekly_share_visits_visitor_user_id_index" ON "weekly_share_visits" USING btree ("visitor_user_id");