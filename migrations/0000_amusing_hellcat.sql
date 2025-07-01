CREATE TABLE "api_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"endpoint" varchar NOT NULL,
	"method" varchar NOT NULL,
	"request_body" jsonb,
	"response_mapping" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"base_url" varchar NOT NULL,
	"auth_type" varchar NOT NULL,
	"auth_config" jsonb NOT NULL,
	"headers" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer NOT NULL,
	"endpoint_id" integer,
	"method" varchar NOT NULL,
	"url" text NOT NULL,
	"request_headers" jsonb,
	"request_body" jsonb,
	"response_status" integer,
	"response_headers" jsonb,
	"response_body" jsonb,
	"response_time" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY NOT NULL,
	"cliente_nome" varchar NOT NULL,
	"cliente_email" varchar NOT NULL,
	"valor_total" numeric(10, 2),
	"status" varchar DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"isbn" varchar,
	"author" varchar NOT NULL,
	"co_authors" varchar,
	"genre" varchar NOT NULL,
	"language" varchar DEFAULT 'português' NOT NULL,
	"target_audience" varchar,
	"pdf_url" varchar NOT NULL,
	"cover_image_url" varchar,
	"page_count" integer NOT NULL,
	"base_cost" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"margin_percent" integer DEFAULT 150 NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"public_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" varchar NOT NULL,
	"product_name" varchar NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar,
	"author_id" varchar,
	"product_id" integer NOT NULL,
	"buyer_email" varchar,
	"buyer_name" varchar,
	"buyer_phone" varchar,
	"buyer_cpf" varchar,
	"buyer_address" varchar,
	"buyer_city" varchar,
	"buyer_state" varchar,
	"buyer_zip_code" varchar,
	"sale_price" numeric(10, 2) NOT NULL,
	"commission" numeric(10, 2) NOT NULL,
	"author_earnings" numeric(10, 2) NOT NULL,
	"order_date" timestamp,
	"payment_status" varchar DEFAULT 'pendente',
	"payment_method" varchar,
	"installments" integer DEFAULT 1,
	"discount_coupon" varchar,
	"discount_amount" numeric(10, 2) DEFAULT '0.00',
	"shipping_cost" numeric(10, 2) DEFAULT '0.00',
	"shipping_carrier" varchar,
	"delivery_days" integer,
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"phone" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'author' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_endpoints" ADD CONSTRAINT "api_endpoints_integration_id_api_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."api_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_integration_id_api_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."api_integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_endpoint_id_api_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."api_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");