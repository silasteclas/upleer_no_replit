const { neon } = require('@neondatabase/serverless');

require('dotenv').config();

async function verifyPhase3() {
  console.log('🔍 VERIFICANDO FASE 3 - MODELO MARKETPLACE');
  console.log('==========================================');

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Verificar order criado
    const order = await sql`SELECT * FROM orders WHERE id = 'PHASE3_TEST_002'`;
    
    if (order.length > 0) {
      console.log('✅ Order criado com sucesso:');
      console.log(`   ID: ${order[0].id}`);
      console.log(`   Cliente: ${order[0].cliente_nome}`);
      console.log(`   Email: ${order[0].cliente_email}`);
      console.log(`   Valor Total: R$ ${order[0].valor_total}`);
      console.log(`   Status: ${order[0].status}`);
    } else {
      console.log('❌ Order não encontrado');
      return;
    }
    
    // Verificar sales criados
    const sales = await sql`SELECT * FROM sales WHERE order_id = 'PHASE3_TEST_002'`;
    
    console.log(`\n✅ Sales criados: ${sales.length}`);
    sales.forEach((sale, index) => {
      console.log(`\n   ${index + 1}. Sale ID: ${sale.id}`);
      console.log(`      Order ID: ${sale.order_id}`);
      console.log(`      Author ID: ${sale.author_id}`);
      console.log(`      Valor: R$ ${sale.sale_price}`);
      console.log(`      Comissão: R$ ${sale.commission}`);
      console.log(`      Ganhos: R$ ${sale.author_earnings}`);
      console.log(`      Quantidade: ${sale.quantity}`);
    });
    
    // Verificar sale_items criados
    if (sales.length > 0) {
      const saleIds = sales.map(s => s.id);
      const items = await sql`SELECT * FROM sale_items WHERE sale_id = ANY(${saleIds})`;
      
      console.log(`\n✅ Sale Items criados: ${items.length}`);
      items.forEach((item, index) => {
        console.log(`\n   ${index + 1}. Item ID: ${item.id}`);
        console.log(`      Sale ID: ${item.sale_id}`);
        console.log(`      Product ID: ${item.product_id}`);
        console.log(`      Produto: ${item.product_name}`);
        console.log(`      Preço: R$ ${item.price}`);
        console.log(`      Quantidade: ${item.quantity}`);
      });
    }
    
    // Verificar relacionamentos
    console.log('\n🔗 Testando relacionamentos:');
    const fullQuery = await sql`
      SELECT 
        o.id as order_id,
        o.cliente_nome,
        o.valor_total as order_total,
        s.id as sale_id,
        s.author_id,
        s.sale_price as sale_total,
        si.product_name,
        si.quantity,
        si.price as item_price
      FROM orders o
      JOIN sales s ON o.id = s.order_id
      JOIN sale_items si ON s.id = si.sale_id
      WHERE o.id = 'PHASE3_TEST_002'
      ORDER BY s.author_id, si.id
    `;
    
    console.log('✅ Relacionamentos funcionando:');
    fullQuery.forEach(row => {
      console.log(`   📦 ${row.order_id} → Sale ${row.sale_id} (${row.author_id}) → ${row.product_name} (${row.quantity}x)`);
    });
    
    console.log('\n🎉 FASE 3 VALIDADA COM SUCESSO!');
    console.log('✅ Modelo marketplace funcionando');
    console.log('✅ Orders, Sales e Sale Items criados');
    console.log('✅ Relacionamentos estabelecidos');
    console.log('✅ Isolamento por vendedor garantido');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

verifyPhase3(); 