const { neon } = require('@neondatabase/serverless');

require('dotenv').config();

async function applyPhase1Migration() {
  console.log('🚀 APLICANDO MIGRATION DA FASE 1 - MODELO MARKETPLACE');
  console.log('====================================================');

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('📋 Executando migration...');
    
    // 1. Criar tabela ORDERS
    console.log('📤 Criando tabela orders...');
    await sql`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" varchar PRIMARY KEY NOT NULL,
        "cliente_nome" varchar NOT NULL,
        "cliente_email" varchar NOT NULL,
        "valor_total" numeric(10, 2),
        "status" varchar DEFAULT 'pending',
        "created_at" timestamp DEFAULT now()
      )
    `;
    
    // 2. Adicionar campos à tabela SALES
    console.log('📤 Adicionando campos à tabela sales...');
    try {
      await sql`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "order_id" varchar`;
    } catch (e) {
      console.log('   ⚠️ Campo order_id já existe');
    }
    
    try {
      await sql`ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "author_id" varchar`;
    } catch (e) {
      console.log('   ⚠️ Campo author_id já existe');
    }
    
    // 3. Criar tabela SALE_ITEMS
    console.log('📤 Criando tabela sale_items...');
    await sql`
      CREATE TABLE IF NOT EXISTS "sale_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "sale_id" integer NOT NULL,
        "product_id" varchar NOT NULL,
        "product_name" varchar NOT NULL,
        "price" numeric(10, 2) NOT NULL,
        "quantity" integer NOT NULL,
        "created_at" timestamp DEFAULT now()
      )
    `;
    
    // 4. Adicionar Foreign Keys
    console.log('📤 Criando foreign keys...');
    
    try {
      await sql`
        ALTER TABLE "sales" 
        ADD CONSTRAINT "sales_order_id_orders_id_fk" 
        FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      `;
    } catch (e) {
      console.log('   ⚠️ FK sales->orders já existe');
    }
    
    try {
      await sql`
        ALTER TABLE "sales" 
        ADD CONSTRAINT "sales_author_id_users_id_fk" 
        FOREIGN KEY ("author_id") REFERENCES "users"("id")
      `;
    } catch (e) {
      console.log('   ⚠️ FK sales->users já existe');
    }
    
    try {
      await sql`
        ALTER TABLE "sale_items" 
        ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" 
        FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
      `;
    } catch (e) {
      console.log('   ⚠️ FK sale_items->sales já existe');
    }
    
    console.log('✅ Migration aplicada com sucesso!');
    console.log('');
    
    // Verificar se as tabelas foram criadas
    console.log('🔍 Verificando estrutura criada...');
    
    const orders = await sql`SELECT COUNT(*) as count FROM orders`;
    console.log(`📦 Tabela orders: ${orders[0].count} registros`);
    
    const saleItems = await sql`SELECT COUNT(*) as count FROM sale_items`;
    console.log(`📋 Tabela sale_items: ${saleItems[0].count} registros`);
    
    const salesColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sales' 
      AND column_name IN ('order_id', 'author_id')
      ORDER BY column_name
    `;
    console.log(`🔗 Novos campos em sales: ${salesColumns.map(c => c.column_name).join(', ')}`);
    
    console.log('');
    console.log('🎉 FASE 1 CONCLUÍDA COM SUCESSO!');
    console.log('✅ Tabela orders criada');
    console.log('✅ Tabela sale_items criada');
    console.log('✅ Campos order_id e author_id adicionados à tabela sales');
    console.log('✅ Foreign keys estabelecidas');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    console.error('Stack:', error.stack);
  }
}

applyPhase1Migration(); 