const { neon } = require('@neondatabase/serverless');

require('dotenv').config();

async function testPhase3Endpoint() {
  console.log('🧪 TESTANDO ENDPOINT FASE 3 - MODELO MARKETPLACE');
  console.log('=================================================');

  const webhookUrl = 'http://localhost:5000/api/webhook/sales/batch';
  
  // Payload de teste com múltiplos vendedores
  const testPayload = [
    {
      order_id: "TEST_ORDER_PHASE3_001",
      cliente_nome: "João da Silva Teste",
      cliente_email: "joao.teste@email.com",
      id_autor: "user_1750970151254_5uo1e69u5", // Samuel Reis
      valor_total: 150.00,
      produtos: [
        {
          id_produto_interno: "19", // Comandos Elétricos
          nome: "COMANDOS ELÉTRICOS INDUSTRIAL E RESIDENCIAL (VOLUME 2)",
          preco: 89.90,
          quantidade: 1
        },
        {
          id_produto_interno: "21", // Câmara Frigorífica
          nome: "Apostila de camara Frigorifica 2",
          preco: 60.10,
          quantidade: 1
        }
      ]
    },
    {
      order_id: "TEST_ORDER_PHASE3_001",
      cliente_nome: "João da Silva Teste",
      cliente_email: "joao.teste@email.com",
      id_autor: "user_1751330180522_x4shzkcl7", // Maria Ferreira
      valor_total: 50.00,
      produtos: [
        {
          id_produto_interno: "20", // Ar Condicionado
          nome: "Ar condicionado Split",
          preco: 50.00,
          quantidade: 1
        }
      ]
    }
  ];

  try {
    console.log('📤 Enviando payload de teste...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Phase3/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseData = await response.text();
    
    console.log('\n📥 RESPOSTA DO SERVIDOR:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response:', responseData);

    if (response.ok) {
      const jsonResponse = JSON.parse(responseData);
      
      console.log('\n🎉 TESTE REALIZADO COM SUCESSO!');
      console.log('✅ Message:', jsonResponse.message);
      console.log('📦 Order ID:', jsonResponse.orderId);
      console.log('👥 Total Vendors:', jsonResponse.totalVendors);
      console.log('📋 Total Products:', jsonResponse.totalProducts);
      console.log('🔢 Total Quantity:', jsonResponse.totalQuantity);
      console.log('💰 Total Value:', jsonResponse.totalValue);
      console.log('❌ Total Errors:', jsonResponse.totalErrors);
      
      if (jsonResponse.vendors) {
        console.log('\n👥 VENDEDORES PROCESSADOS:');
        jsonResponse.vendors.forEach((vendor, index) => {
          console.log(`\n${index + 1}. Vendedor: ${vendor.authorId}`);
          console.log(`   Sale ID: ${vendor.saleId}`);
          console.log(`   Total: R$ ${vendor.vendorTotal}`);
          console.log(`   Comissão: R$ ${vendor.vendorCommission}`);
          console.log(`   Ganhos: R$ ${vendor.vendorEarnings}`);
          console.log(`   Produtos: ${vendor.productCount}`);
          console.log(`   Quantidade: ${vendor.totalQuantity}`);
          
          if (vendor.products) {
            console.log('   Detalhes dos produtos:');
            vendor.products.forEach(product => {
              console.log(`     - ${product.productTitle}: ${product.quantity}x R$ ${product.unitPrice} = R$ ${product.totalPrice}`);
            });
          }
        });
      }
      
      if (jsonResponse.errors && jsonResponse.errors.length > 0) {
        console.log('\n❌ ERROS ENCONTRADOS:');
        jsonResponse.errors.forEach(error => {
          console.log(`   - Autor ${error.author}: ${error.error}`);
        });
      }
      
    } else {
      console.log('\n❌ ERRO NO TESTE!');
      console.log('Response:', responseData);
    }

  } catch (error) {
    console.error('\n❌ ERRO NA REQUISIÇÃO:', error.message);
  }

  // Verificar dados no banco após o teste
  console.log('\n🔍 VERIFICANDO DADOS NO BANCO...');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Verificar order criado
    const orderCheck = await sql`
      SELECT * FROM orders WHERE id = 'TEST_ORDER_PHASE3_001'
    `;
    
    if (orderCheck.length > 0) {
      console.log('✅ Order criado no banco:');
      console.log(`   ID: ${orderCheck[0].id}`);
      console.log(`   Cliente: ${orderCheck[0].cliente_nome}`);
      console.log(`   Email: ${orderCheck[0].cliente_email}`);
      console.log(`   Valor Total: R$ ${orderCheck[0].valor_total}`);
    } else {
      console.log('❌ Order não encontrado no banco');
    }
    
    // Verificar sales criados
    const salesCheck = await sql`
      SELECT * FROM sales WHERE order_id = 'TEST_ORDER_PHASE3_001'
    `;
    
    console.log(`\n✅ Sales criados: ${salesCheck.length}`);
    salesCheck.forEach((sale, index) => {
      console.log(`   ${index + 1}. Sale ID: ${sale.id}`);
      console.log(`      Author: ${sale.author_id}`);
      console.log(`      Valor: R$ ${sale.sale_price}`);
      console.log(`      Quantidade: ${sale.quantity}`);
    });
    
    // Verificar sale_items criados
    if (salesCheck.length > 0) {
      const saleIds = salesCheck.map(s => s.id);
      const itemsCheck = await sql`
        SELECT * FROM sale_items WHERE sale_id = ANY(${saleIds})
      `;
      
      console.log(`\n✅ Sale Items criados: ${itemsCheck.length}`);
      itemsCheck.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.product_name}: ${item.quantity}x R$ ${item.price}`);
      });
    }
    
  } catch (dbError) {
    console.error('❌ Erro ao verificar banco:', dbError.message);
  }
}

testPhase3Endpoint(); 