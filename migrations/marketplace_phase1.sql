-- FASE 1: Criação das Novas Tabelas para Modelo Marketplace
-- Data: 2025-01-28
-- Descrição: Adiciona tabelas orders e sale_items, e campos order_id/author_id na tabela sales

-- 1. Criar tabela ORDERS (pedidos completos da Nuvem Shop)
CREATE TABLE IF NOT EXISTS "orders" (
  "id" varchar PRIMARY KEY NOT NULL,
  "cliente_nome" varchar NOT NULL,
  "cliente_email" varchar NOT NULL,
  "valor_total" numeric(10, 2),
  "status" varchar DEFAULT 'pending',
  "created_at" timestamp DEFAULT now()
);

-- 2. Adicionar novos campos à tabela SALES existente
ALTER TABLE "sales" 
ADD COLUMN IF NOT EXISTS "order_id" varchar,
ADD COLUMN IF NOT EXISTS "author_id" varchar;

-- 3. Criar tabela SALE_ITEMS (produtos específicos de cada venda)
CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "sale_id" integer NOT NULL,
  "product_id" varchar NOT NULL,
  "product_name" varchar NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "quantity" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 4. Adicionar Foreign Keys
ALTER TABLE "sales" 
ADD CONSTRAINT IF NOT EXISTS "sales_order_id_orders_id_fk" 
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "sales" 
ADD CONSTRAINT IF NOT EXISTS "sales_author_id_users_id_fk" 
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "sale_items" 
ADD CONSTRAINT IF NOT EXISTS "sale_items_sale_id_sales_id_fk" 
FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE no action ON UPDATE no action;

-- 5. Comentários para documentação
COMMENT ON TABLE "orders" IS 'Pedidos completos da Nuvem Shop - um registro por pedido';
COMMENT ON TABLE "sale_items" IS 'Produtos específicos de cada venda - relacionamento detalhado';
COMMENT ON COLUMN "sales"."order_id" IS 'Referência ao pedido na tabela orders';
COMMENT ON COLUMN "sales"."author_id" IS 'ID do autor/vendedor da venda';

-- FASE 1 CONCLUÍDA: Estrutura marketplace criada com sucesso! 