require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkIsolation() {
  try {
    console.log('🔒 VERIFICANDO ISOLAMENTO POR VENDEDOR');
    console.log('====================================');
    
    // Verificar vendedores únicos
    const vendorsQuery = `
      SELECT DISTINCT author_id, COUNT(*) as sales_count
      FROM sales 
      WHERE author_id IS NOT NULL
      GROUP BY author_id
      ORDER BY author_id
    `;
    
    const vendorsResult = await pool.query(vendorsQuery);
    
    console.log(`\n👥 Vendedores encontrados: ${vendorsResult.rows.length}`);
    
    for (const vendor of vendorsResult.rows) {
      console.log(`\n📊 Vendedor: ${vendor.author_id}`);
      console.log(`   Vendas totais: ${vendor.sales_count}`);
      
      // Verificar se o vendedor vê apenas suas vendas
      const salesQuery = `
        SELECT 
          s.id,
          s.order_id,
          s.author_id,
          p.title,
          s.sale_price
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.author_id = $1
        ORDER BY s.created_at DESC
        LIMIT 5
      `;
      
      const salesResult = await pool.query(salesQuery, [vendor.author_id]);
      
      console.log(`   Vendas visíveis: ${salesResult.rows.length}`);
      
      // Verificar se todas as vendas pertencem ao vendedor correto
      const wrongSales = salesResult.rows.filter(sale => sale.author_id !== vendor.author_id);
      
      if (wrongSales.length === 0) {
        console.log(`   ✅ Isolamento OK - vê apenas suas vendas`);
      } else {
        console.log(`   ❌ VAZAMENTO - vê ${wrongSales.length} vendas de outros`);
        wrongSales.forEach(sale => {
          console.log(`      Sale ${sale.id}: pertence a ${sale.author_id}`);
        });
      }
      
      // Mostrar algumas vendas de exemplo
      if (salesResult.rows.length > 0) {
        console.log(`   📋 Exemplos:`);
        salesResult.rows.slice(0, 3).forEach(sale => {
          console.log(`      Sale ${sale.id}: ${sale.title} - R$ ${sale.sale_price}`);
        });
      }
    }
    
    // Verificar se há vendas órfãs (sem author_id)
    const orphanQuery = `SELECT COUNT(*) as count FROM sales WHERE author_id IS NULL`;
    const orphanResult = await pool.query(orphanQuery);
    
    if (orphanResult.rows[0].count > 0) {
      console.log(`\n⚠️ Vendas órfãs encontradas: ${orphanResult.rows[0].count}`);
      console.log(`   Estas vendas não têm author_id definido`);
    } else {
      console.log(`\n✅ Nenhuma venda órfã encontrada`);
    }
    
    console.log('\n🎯 RESULTADO DO TESTE DE ISOLAMENTO:');
    console.log(`   Vendedores: ${vendorsResult.rows.length}`);
    console.log(`   Vendas órfãs: ${orphanResult.rows[0].count}`);
    
    if (vendorsResult.rows.length >= 3 && orphanResult.rows[0].count <= 1) {
      console.log(`   ✅ ISOLAMENTO FUNCIONANDO CORRETAMENTE`);
    } else {
      console.log(`   ❌ PROBLEMAS DE ISOLAMENTO DETECTADOS`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkIsolation(); 