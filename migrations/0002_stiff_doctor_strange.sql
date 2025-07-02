CREATE TABLE "produto_nuvemshop_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_produto_interno" varchar NOT NULL,
	"id_autor" varchar NOT NULL,
	"produto_id_nuvemshop" varchar NOT NULL,
	"variant_id_nuvemshop" varchar NOT NULL,
	"sku" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cliente_cpf" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cliente_telefone" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "endereco_rua" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "endereco_numero" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "endereco_bairro" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "endereco_cidade" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "endereco_estado" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "endereco_cep" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "endereco_complemento" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "forma_pagamento" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bandeira_cartao" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "parcelas" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status_pagamento" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status_envio" varchar;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "foto_produto" varchar;