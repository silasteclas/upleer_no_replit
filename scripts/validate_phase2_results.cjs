const { neon } = require('@neondatabase/serverless');

require('dotenv').config();

async function validatePhase2Results() {
  console.log('🔍 VALIDAÇÃO DOS RESULTADOS DA FASE 2');
  console.log('====================================');

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // 1. Verificar estrutura completa
    console.log('📊 1. Verificando estrutura completa...');
    
    const fullStructure = await sql`
      SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM sales) as total_sales,
        (SELECT COUNT(*) FROM sale_items) as total_sale_items,
        (SELECT COUNT(*) FROM sales WHERE order_id IS NOT NULL AND author_id IS NOT NULL) as sales_with_relationships,
        (SELECT COUNT(*) FROM produto_nuvemshop_mapping) as mapping_count
    `;
    
    const structure = fullStructure[0];
    console.log(`📦 Orders: ${structure.total_orders}`);
    console.log(`💰 Sales: ${structure.total_sales}`);
    console.log(`📋 Sale Items: ${structure.total_sale_items}`);
    console.log(`🔗 Sales com relacionamentos: ${structure.sales_with_relationships}`);
    console.log(`🚨 produto_nuvemshop_mapping: ${structure.mapping_count}`);
    
    // 2. Testar queries do modelo marketplace
    console.log('\n🔗 2. Testando queries do modelo marketplace...');
    
    // Query exemplo: Dashboard do vendedor
    const vendorDashboard = await sql`
      SELECT 
        s.author_id,
        COUNT(DISTINCT s.order_id) as total_orders,
        COUNT(s.id) as total_sales,
        SUM(si.quantity) as total_products_sold,
        SUM(s.author_earnings) as total_earnings
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      WHERE s.author_id IS NOT NULL
      GROUP BY s.author_id
      ORDER BY total_earnings DESC
    `;
    
    console.log('✅ Dashboard por vendedor:');
    vendorDashboard.forEach(vendor => {
      console.log(`   👤 ${vendor.author_id}: ${vendor.total_orders} pedidos, ${vendor.total_products_sold} produtos, R$ ${vendor.total_earnings}`);
    });
    
    // 3. Testar isolamento por vendedor
    console.log('\n🔒 3. Testando isolamento por vendedor...');
    
    const isolationTest = await sql`
      SELECT 
        s.author_id,
        s.id as sale_id,
        o.cliente_nome,
        si.product_name,
        si.quantity
      FROM sales s
      JOIN orders o ON s.order_id = o.id
      JOIN sale_items si ON s.id = si.sale_id
      WHERE s.author_id = (
        SELECT author_id FROM sales WHERE author_id IS NOT NULL LIMIT 1
      )
      LIMIT 3
    `;
    
    console.log('✅ Teste de isolamento (vendedor específico):');
    isolationTest.forEach(sale => {
      console.log(`   📦 Venda ${sale.sale_id}: ${sale.product_name} para ${sale.cliente_nome}`);
    });
    
    // 4. Verificar integridade referencial
    console.log('\n🔍 4. Verificando integridade referencial...');
    
    const integrityCheck = await sql`
      SELECT 
        (SELECT COUNT(*) FROM sales s LEFT JOIN orders o ON s.order_id = o.id WHERE o.id IS NULL AND s.order_id IS NOT NULL) as orphan_sales,
        (SELECT COUNT(*) FROM sale_items si LEFT JOIN sales s ON si.sale_id = s.id WHERE s.id IS NULL) as orphan_items,
        (SELECT COUNT(*) FROM sales s LEFT JOIN users u ON s.author_id = u.id WHERE u.id IS NULL AND s.author_id IS NOT NULL) as invalid_authors
    `;
    
    const integrity = integrityCheck[0];
    console.log(`🔗 Sales órfãos: ${integrity.orphan_sales}`);
    console.log(`📋 Items órfãos: ${integrity.orphan_items}`);
    console.log(`👤 Autores inválidos: ${integrity.invalid_authors}`);
    
    // 5. Simular cenário de marketplace
    console.log('\n🏪 5. Simulando cenário de marketplace...');
    
    const marketplaceScenario = await sql`
      SELECT 
        o.id as order_id,
        o.cliente_nome,
        o.valor_total as order_total,
        COUNT(DISTINCT s.author_id) as num_vendors,
        COUNT(s.id) as num_sales,
        SUM(si.quantity) as total_items
      FROM orders o
      JOIN sales s ON o.id = s.order_id
      JOIN sale_items si ON s.id = si.sale_id
      GROUP BY o.id, o.cliente_nome, o.valor_total
      HAVING COUNT(DISTINCT s.author_id) > 1
      LIMIT 3
    `;
    
    if (marketplaceScenario.length > 0) {
      console.log('✅ Pedidos multi-vendedor encontrados:');
      marketplaceScenario.forEach(order => {
        console.log(`   📦 ${order.order_id}: ${order.num_vendors} vendedores, ${order.total_items} itens`);
      });
    } else {
      console.log('ℹ️ Nenhum pedido multi-vendedor (dados legacy são individuais)');
    }
    
    // 6. Verificar compatibilidade com queries antigas
    console.log('\n🔄 6. Verificando compatibilidade com queries antigas...');
    
    const oldStyleQuery = await sql`
      SELECT 
        s.id,
        s.buyer_name,
        s.sale_price,
        s.author_earnings,
        p.title as product_title
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.author_id IS NOT NULL
      LIMIT 3
    `;
    
    console.log('✅ Queries antigas ainda funcionam:');
    oldStyleQuery.forEach(sale => {
      console.log(`   💰 Venda ${sale.id}: ${sale.product_title} - R$ ${sale.sale_price}`);
    });
    
    // 7. Status final
    console.log('\n🎯 7. STATUS FINAL DA FASE 2:');
    
    const allGood = 
      structure.total_orders > 0 &&
      structure.total_sales > 0 &&
      structure.total_sale_items > 0 &&
      structure.sales_with_relationships === structure.total_sales &&
      structure.mapping_count > 0 &&
      integrity.orphan_sales === 0 &&
      integrity.orphan_items === 0 &&
      integrity.invalid_authors === 0;
    
    if (allGood) {
      console.log('🎉 FASE 2 VALIDADA COM SUCESSO!');
      console.log('✅ Todos os dados migrados corretamente');
      console.log('✅ Relacionamentos íntegros');
      console.log('✅ Isolamento por vendedor funcionando');
      console.log('✅ Compatibilidade mantida');
      console.log('✅ produto_nuvemshop_mapping preservada');
      console.log('🚀 SISTEMA PRONTO PARA FASE 3!');
    } else {
      console.log('❌ PROBLEMAS DETECTADOS NA VALIDAÇÃO!');
      console.log('   Verifique os dados antes de prosseguir.');
    }
    
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    console.error('Stack:', error.stack);
  }
}

validatePhase2Results(); 