require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function optimizeIndexes() {
  console.log('🚀 OTIMIZANDO PERFORMANCE - CRIANDO ÍNDICES');
  console.log('==========================================');
  
  try {
    // Índices essenciais para performance
    const indexes = [
      {
        name: 'idx_sales_author_id',
        table: 'sales',
        sql: 'CREATE INDEX IF NOT EXISTS idx_sales_author_id ON sales(author_id)',
        purpose: 'Isolamento por vendedor'
      },
      {
        name: 'idx_sales_order_id',
        table: 'sales', 
        sql: 'CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id)',
        purpose: 'Relacionamento com orders'
      },
      {
        name: 'idx_sale_items_sale_id',
        table: 'sale_items',
        sql: 'CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)',
        purpose: 'Relacionamento com sales'
      },
      {
        name: 'idx_sales_author_created',
        table: 'sales',
        sql: 'CREATE INDEX IF NOT EXISTS idx_sales_author_created ON sales(author_id, created_at DESC)',
        purpose: 'Ordenação por vendedor e data'
      },
      {
        name: 'idx_products_author_status',
        table: 'products',
        sql: 'CREATE INDEX IF NOT EXISTS idx_products_author_status ON products(author_id, status)',
        purpose: 'Estatísticas de produtos'
      }
    ];
    
    console.log(`\n📋 Criando ${indexes.length} índices otimizados...`);
    
    for (const index of indexes) {
      console.log(`   🔧 Criando ${index.name}...`);
      console.log(`      Finalidade: ${index.purpose}`);
      
      const start = Date.now();
      await pool.query(index.sql);
      const time = Date.now() - start;
      
      console.log(`      ✅ Criado em ${time}ms`);
    }
    
    // Verificar índices criados
    console.log('\n🔍 Verificando índices criados...');
    
    const checkQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('sales', 'orders', 'sale_items', 'products')
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `;
    
    const result = await pool.query(checkQuery);
    
    console.log(`   📊 Índices personalizados encontrados: ${result.rows.length}`);
    
    const tableIndexes = {};
    result.rows.forEach(idx => {
      if (!tableIndexes[idx.tablename]) {
        tableIndexes[idx.tablename] = [];
      }
      tableIndexes[idx.tablename].push(idx.indexname);
    });
    
    Object.keys(tableIndexes).forEach(table => {
      console.log(`      ${table}: ${tableIndexes[table].join(', ')}`);
    });
    
    console.log('\n🎉 OTIMIZAÇÃO DE ÍNDICES CONCLUÍDA!');
    console.log('✅ Índices criados para melhor performance');
    console.log('✅ Isolamento por vendedor otimizado');
    console.log('✅ Relacionamentos otimizados');
    console.log('✅ Ordenação otimizada');
    
  } catch (error) {
    console.error('❌ ERRO na otimização:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

optimizeIndexes(); 