const { neon } = require('@neondatabase/serverless');

require('dotenv').config();

async function quickCheckPhase2() {
  console.log('🔍 VERIFICAÇÃO RÁPIDA DA FASE 2');
  console.log('==============================');

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Verificação básica
    const basic = await sql`
      SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM sales) as total_sales,
        (SELECT COUNT(*) FROM sale_items) as total_sale_items,
        (SELECT COUNT(*) FROM sales WHERE order_id IS NOT NULL AND author_id IS NOT NULL) as sales_with_relationships,
        (SELECT COUNT(*) FROM produto_nuvemshop_mapping) as mapping_count
    `;
    
    const b = basic[0];
    console.log(`Orders: ${b.total_orders}`);
    console.log(`Sales: ${b.total_sales}`);
    console.log(`Sale Items: ${b.total_sale_items}`);
    console.log(`Sales com relacionamentos: ${b.sales_with_relationships}`);
    console.log(`Mapping: ${b.mapping_count}`);
    
    // Verificar integridade
    const integrity = await sql`
      SELECT 
        (SELECT COUNT(*) FROM sales s LEFT JOIN orders o ON s.order_id = o.id WHERE o.id IS NULL AND s.order_id IS NOT NULL) as orphan_sales,
        (SELECT COUNT(*) FROM sale_items si LEFT JOIN sales s ON si.sale_id = s.id WHERE s.id IS NULL) as orphan_items,
        (SELECT COUNT(*) FROM sales s LEFT JOIN users u ON s.author_id = u.id WHERE u.id IS NULL AND s.author_id IS NOT NULL) as invalid_authors
    `;
    
    const i = integrity[0];
    console.log(`\nIntegridade:`);
    console.log(`Sales órfãos: ${i.orphan_sales}`);
    console.log(`Items órfãos: ${i.orphan_items}`);
    console.log(`Autores inválidos: ${i.invalid_authors}`);
    
    // Condições para sucesso
    const allGood = 
      b.total_orders > 0 &&
      b.total_sales > 0 &&
      b.total_sale_items > 0 &&
      b.sales_with_relationships === b.total_sales &&
      b.mapping_count > 0 &&
      i.orphan_sales === 0 &&
      i.orphan_items === 0 &&
      i.invalid_authors === 0;
    
    console.log(`\nValidação detalhada:`);
    console.log(`✅ Orders > 0: ${b.total_orders > 0}`);
    console.log(`✅ Sales > 0: ${b.total_sales > 0}`);
    console.log(`✅ Sale Items > 0: ${b.total_sale_items > 0}`);
    console.log(`✅ Sales com relacionamentos = Total: ${b.sales_with_relationships === b.total_sales} (${b.sales_with_relationships}/${b.total_sales})`);
    console.log(`✅ Mapping preservado: ${b.mapping_count > 0}`);
    console.log(`✅ Sem órfãos: ${i.orphan_sales === 0 && i.orphan_items === 0 && i.invalid_authors === 0}`);
    
    if (allGood) {
      console.log('\n🎉 FASE 2 ESTÁ PERFEITA!');
    } else {
      console.log('\n❌ Há problemas na FASE 2');
      
      // Diagnosticar problema específico
      if (b.sales_with_relationships !== b.total_sales) {
        console.log(`🔍 Problema: ${b.total_sales - b.sales_with_relationships} sales sem relacionamentos`);
        
        const problemSales = await sql`
          SELECT id, order_id, author_id FROM sales 
          WHERE order_id IS NULL OR author_id IS NULL
          LIMIT 3
        `;
        
        console.log('Sales problemáticas:');
        problemSales.forEach(sale => {
          console.log(`   Sale ${sale.id}: order_id=${sale.order_id}, author_id=${sale.author_id}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

quickCheckPhase2(); 