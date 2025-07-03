ALTER TABLE "products" ADD COLUMN "author_earnings" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "platform_commission" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fixed_fee" numeric(10, 2) DEFAULT '9.90';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "printing_cost_per_page" numeric(5, 2) DEFAULT '0.10';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "commission_rate" numeric(5, 2) DEFAULT '30.00';