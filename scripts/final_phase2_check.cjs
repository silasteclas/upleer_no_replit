const { neon } = require('@neondatabase/serverless');

require('dotenv').config();

async function finalPhase2Check() {
  console.log('🎯 VERIFICAÇÃO FINAL DA FASE 2');
  console.log('==============================');

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Verificação com conversão de tipos
    const check = await sql`
      SELECT 
        (SELECT COUNT(*)::int FROM orders) as total_orders,
        (SELECT COUNT(*)::int FROM sales) as total_sales,
        (SELECT COUNT(*)::int FROM sale_items) as total_sale_items,
        (SELECT COUNT(*)::int FROM sales WHERE order_id IS NOT NULL AND author_id IS NOT NULL) as sales_with_relationships,
        (SELECT COUNT(*)::int FROM produto_nuvemshop_mapping) as mapping_count,
        (SELECT COUNT(*)::int FROM sales s LEFT JOIN orders o ON s.order_id = o.id WHERE o.id IS NULL AND s.order_id IS NOT NULL) as orphan_sales,
        (SELECT COUNT(*)::int FROM sale_items si LEFT JOIN sales s ON si.sale_id = s.id WHERE s.id IS NULL) as orphan_items,
        (SELECT COUNT(*)::int FROM sales s LEFT JOIN users u ON s.author_id = u.id WHERE u.id IS NULL AND s.author_id IS NOT NULL) as invalid_authors
    `;
    
    const c = check[0];
    
    console.log('📊 Contadores:');
    console.log(`   Orders: ${c.total_orders}`);
    console.log(`   Sales: ${c.total_sales}`);
    console.log(`   Sale Items: ${c.total_sale_items}`);
    console.log(`   Sales com relacionamentos: ${c.sales_with_relationships}`);
    console.log(`   Mapping: ${c.mapping_count}`);
    
    console.log('\n🔍 Integridade:');
    console.log(`   Sales órfãos: ${c.orphan_sales}`);
    console.log(`   Items órfãos: ${c.orphan_items}`);
    console.log(`   Autores inválidos: ${c.invalid_authors}`);
    
    // Verificação final
    const success = 
      c.total_orders > 0 &&
      c.total_sales > 0 &&
      c.total_sale_items > 0 &&
      c.sales_with_relationships === c.total_sales &&
      c.mapping_count > 0 &&
      c.orphan_sales === 0 &&
      c.orphan_items === 0 &&
      c.invalid_authors === 0;
    
    console.log('\n✅ Validações:');
    console.log(`   Orders criados: ${c.total_orders > 0 ? '✅' : '❌'}`);
    console.log(`   Sales migrados: ${c.total_sales > 0 ? '✅' : '❌'}`);
    console.log(`   Sale Items criados: ${c.total_sale_items > 0 ? '✅' : '❌'}`);
    console.log(`   Relacionamentos completos: ${c.sales_with_relationships === c.total_sales ? '✅' : '❌'}`);
    console.log(`   Mapping preservado: ${c.mapping_count > 0 ? '✅' : '❌'}`);
    console.log(`   Integridade referencial: ${c.orphan_sales === 0 && c.orphan_items === 0 && c.invalid_authors === 0 ? '✅' : '❌'}`);
    
    if (success) {
      console.log('\n🎉 FASE 2 VALIDADA COM SUCESSO!');
      console.log('✅ Todos os dados migrados corretamente');
      console.log('✅ Relacionamentos íntegros');
      console.log('✅ produto_nuvemshop_mapping preservada');
      console.log('🚀 SISTEMA PRONTO PARA FASE 3!');
    } else {
      console.log('\n❌ PROBLEMAS DETECTADOS');
      console.log('   Revise os dados antes de prosseguir');
    }
    
    // Teste rápido de funcionamento
    console.log('\n🧪 Teste de funcionamento:');
    const testQuery = await sql`
      SELECT 
        o.id as order_id,
        s.author_id,
        si.product_name,
        si.quantity
      FROM orders o
      JOIN sales s ON o.id = s.order_id
      JOIN sale_items si ON s.id = si.sale_id
      LIMIT 2
    `;
    
    testQuery.forEach(test => {
      console.log(`   📦 ${test.order_id.substring(0, 12)}... → ${test.product_name} (${test.quantity}x)`);
    });
    
    return success;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

finalPhase2Check().then(success => {
  if (success) {
    console.log('\n🎯 CONCLUSÃO: FASE 2 ESTÁ PERFEITA!');
    console.log('Pode prosseguir para a FASE 3 com segurança.');
  } else {
    console.log('\n⚠️ CONCLUSÃO: Há problemas na FASE 2');
    console.log('Revise antes de continuar.');
  }
}); 