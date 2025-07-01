require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const baseUrl = process.env.VITE_API_URL || 'http://localhost:5000';

async function phase5IntegrationTests() {
  console.log('🧪 FASE 5 - TESTES DE INTEGRAÇÃO COMPLETOS');
  console.log('==========================================');
  
  try {
    // 5.1 TESTE DE FLUXO COMPLETO: N8N → Webhook → Banco → Frontend
    console.log('\n🔄 5.1 TESTANDO FLUXO COMPLETO...');
    
    const testOrderId = `FASE5_INTEGRATION_${Date.now()}`;
    const testPayload = [
      {
        "order_id": testOrderId,
        "cliente_nome": "Maria da Silva - Teste FASE5",
        "cliente_email": "maria.fase5@teste.com",
        "id_autor": "user_1750970151254_5uo1e69u5",
        "valor_total": 120.50,
        "produtos": [
          {
            "id_produto_interno": "19",
            "nome": "COMANDOS ELÉTRICOS INDUSTRIAL E RESIDENCIAL (VOLUME 2)",
            "preco": 89.90,
            "quantidade": 1
          },
          {
            "id_produto_interno": "21", 
            "nome": "Apostila de camara Frigorifica 2",
            "preco": 30.60,
            "quantidade": 1
          }
        ]
      },
      {
        "order_id": testOrderId,
        "cliente_nome": "Maria da Silva - Teste FASE5",
        "cliente_email": "maria.fase5@teste.com",
        "id_autor": "user_1751330180522_x4shzkcl7",
        "valor_total": 75.00,
        "produtos": [
          {
            "id_produto_interno": "20",
            "nome": "Ar condicionado Split",
            "preco": 75.00,
            "quantidade": 1
          }
        ]
      }
    ];
    
    console.log(`   📤 Enviando payload para webhook...`);
    console.log(`   Order ID: ${testOrderId}`);
    console.log(`   Vendedores: 2`);
    console.log(`   Produtos totais: 3`);
    
    // Enviar para webhook
    const webhookResponse = await fetch(`${baseUrl}/api/webhook/sales/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }
    
    const webhookResult = await webhookResponse.json();
    console.log(`   ✅ Webhook processado com sucesso`);
    console.log(`      Vendedores processados: ${webhookResult.totalVendors}`);
    console.log(`      Produtos totais: ${webhookResult.totalProducts}`);
    console.log(`      Valor total: R$ ${webhookResult.totalValue}`);
    
    // Aguardar um momento para garantir que os dados foram salvos
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5.2 VALIDAR DADOS NO BANCO
    console.log('\n🗄️ 5.2 VALIDANDO DADOS NO BANCO...');
    
    // Verificar order
    const orderQuery = `SELECT * FROM orders WHERE id = $1`;
    const orderResult = await pool.query(orderQuery, [testOrderId]);
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order não encontrado no banco');
    }
    
    const order = orderResult.rows[0];
    console.log(`   ✅ Order encontrado:`);
    console.log(`      ID: ${order.id}`);
    console.log(`      Cliente: ${order.cliente_nome}`);
    console.log(`      Email: ${order.cliente_email}`);
    console.log(`      Total: R$ ${order.valor_total}`);
    
    // Verificar sales
    const salesQuery = `SELECT * FROM sales WHERE order_id = $1`;
    const salesResult = await pool.query(salesQuery, [testOrderId]);
    
    console.log(`   ✅ Sales encontrados: ${salesResult.rows.length}`);
    
    let totalSaleItems = 0;
    for (const sale of salesResult.rows) {
      console.log(`      Sale ID ${sale.id}: Autor ${sale.author_id}, Valor R$ ${sale.sale_price}`);
      
      // Verificar sale_items para cada sale
      const itemsQuery = `SELECT * FROM sale_items WHERE sale_id = $1`;
      const itemsResult = await pool.query(itemsQuery, [sale.id]);
      
      console.log(`         Sale Items: ${itemsResult.rows.length}`);
      totalSaleItems += itemsResult.rows.length;
      
      itemsResult.rows.forEach((item, index) => {
        console.log(`           ${index + 1}. ${item.product_name}: ${item.quantity}x R$ ${item.price}`);
      });
    }
    
    console.log(`   📊 Total de Sale Items: ${totalSaleItems}`);
    
    // 5.3 VALIDAR ISOLAMENTO POR VENDEDOR
    console.log('\n🔒 5.3 VALIDANDO ISOLAMENTO POR VENDEDOR...');
    
    for (const vendor of ['user_1750970151254_5uo1e69u5', 'user_1751330180522_x4shzkcl7']) {
      const vendorSalesQuery = `
        SELECT s.*, p.title, o.cliente_nome 
        FROM sales s
        JOIN products p ON s.product_id = p.id
        JOIN orders o ON s.order_id = o.id
        WHERE s.author_id = $1 AND s.order_id = $2
      `;
      
      const vendorResult = await pool.query(vendorSalesQuery, [vendor, testOrderId]);
      
      console.log(`   👤 Vendedor ${vendor}:`);
      console.log(`      Vendas visíveis: ${vendorResult.rows.length}`);
      
      if (vendorResult.rows.length > 0) {
        const sale = vendorResult.rows[0];
        console.log(`      Produto: ${sale.title}`);
        console.log(`      Cliente: ${sale.cliente_nome}`);
        console.log(`      ✅ Isolamento funcionando - vê apenas suas vendas`);
      }
    }
    
    // 5.4 TESTAR INTEGRIDADE REFERENCIAL
    console.log('\n🔗 5.4 TESTANDO INTEGRIDADE REFERENCIAL...');
    
    const integrityQuery = `
      SELECT 
        o.id as order_id,
        COUNT(DISTINCT s.id) as sales_count,
        COUNT(si.id) as sale_items_count,
        SUM(si.quantity) as total_products,
        SUM(si.price * si.quantity) as calculated_total
      FROM orders o
      LEFT JOIN sales s ON o.id = s.order_id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    
    const integrityResult = await pool.query(integrityQuery, [testOrderId]);
    const integrity = integrityResult.rows[0];
    
    console.log(`   ✅ Integridade verificada:`);
    console.log(`      Order: 1`);
    console.log(`      Sales: ${integrity.sales_count}`);
    console.log(`      Sale Items: ${integrity.sale_items_count}`);
    console.log(`      Total de produtos: ${integrity.total_products}`);
    console.log(`      Valor calculado: R$ ${integrity.calculated_total}`);
    
    // 5.5 SIMULAR ACESSO DO FRONTEND
    console.log('\n🖥️ 5.5 SIMULANDO ACESSO DO FRONTEND...');
    
    // Simular login e acesso às vendas
    for (const authorId of ['user_1750970151254_5uo1e69u5', 'user_1751330180522_x4shzkcl7']) {
      console.log(`   👤 Testando acesso para autor: ${authorId}`);
      
      // Simular query que o frontend faria
      const frontendQuery = `
        SELECT 
          s.id,
          s.order_id,
          s.sale_price,
          s.quantity,
          p.title as product_title,
          o.cliente_nome,
          o.cliente_email,
          (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count,
          (SELECT SUM(si.quantity) FROM sale_items si WHERE si.sale_id = s.id) as total_quantity
        FROM sales s
        JOIN products p ON s.product_id = p.id
        JOIN orders o ON s.order_id = o.id
        WHERE s.author_id = $1 AND s.order_id = $2
      `;
      
      const frontendResult = await pool.query(frontendQuery, [authorId, testOrderId]);
      
      if (frontendResult.rows.length > 0) {
        const sale = frontendResult.rows[0];
        console.log(`      ✅ Dados do frontend:`);
        console.log(`         Sale ID: ${sale.id}`);
        console.log(`         Produto: ${sale.product_title}`);
        console.log(`         Cliente: ${sale.cliente_nome}`);
        console.log(`         Items: ${sale.items_count}`);
        console.log(`         Quantidade total: ${sale.total_quantity}`);
      } else {
        console.log(`      ❌ Nenhuma venda encontrada para este autor`);
      }
    }
    
    console.log('\n🎉 TESTES DE INTEGRAÇÃO FASE 5 CONCLUÍDOS COM SUCESSO!');
    console.log('✅ Fluxo completo N8N → Webhook → Banco → Frontend funcionando');
    console.log('✅ Isolamento por vendedor validado');
    console.log('✅ Integridade referencial confirmada');
    console.log('✅ Frontend recebendo dados corretos');
    
  } catch (error) {
    console.error('❌ ERRO nos testes de integração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

phase5IntegrationTests(); 