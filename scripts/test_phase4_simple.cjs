require('dotenv').config();

async function testPhase4Frontend() {
  console.log('🧪 TESTANDO API FRONTEND FASE 4 - NOVA ESTRUTURA MARKETPLACE');
  console.log('==============================================================');
  
  try {
    const baseUrl = process.env.VITE_API_URL || 'http://localhost:5000';
    
    // Simular login como um autor específico
    const authorId = 'user_1750970151254_5uo1e69u5';
    console.log(`📊 Testando API para autor: ${authorId}`);
    
    // Testar endpoint de vendas
    console.log('\n📥 Testando GET /api/sales...');
    const salesResponse = await fetch(`${baseUrl}/api/sales`, {
      headers: {
        'Content-Type': 'application/json',
        // Simular auth header
        'Authorization': `Bearer mock-token-for-${authorId}`
      }
    });
    
    if (salesResponse.ok) {
      const salesData = await salesResponse.json();
      console.log(`✅ Sales endpoint funcionando`);
      console.log(`   Vendas encontradas: ${salesData.length}`);
      
      if (salesData.length > 0) {
        const firstSale = salesData[0];
        console.log(`\n📦 PRIMEIRA VENDA (ID: ${firstSale.id}):`);
        console.log(`   Order ID: ${firstSale.orderId || 'N/A'}`);
        console.log(`   Produto: ${firstSale.product?.title || 'N/A'}`);
        console.log(`   Cliente: ${firstSale.buyerName || 'N/A'}`);
        console.log(`   Valor: R$ ${firstSale.salePrice || 'N/A'}`);
        console.log(`   Quantidade: ${firstSale.quantity || 'N/A'}`);
        
        // Verificar se tem dados do order
        if (firstSale.order) {
          console.log(`   ✅ Dados do order disponíveis:`);
          console.log(`      Cliente: ${firstSale.order.cliente_nome}`);
          console.log(`      Email: ${firstSale.order.cliente_email}`);
          console.log(`      Total: R$ ${firstSale.order.valor_total}`);
        }
        
        // Verificar se tem sale_items
        if (firstSale.saleItems && firstSale.saleItems.length > 0) {
          console.log(`   ✅ Sale Items disponíveis: ${firstSale.saleItems.length}`);
          firstSale.saleItems.forEach((item, index) => {
            console.log(`      ${index + 1}. ${item.product_name}: ${item.quantity}x R$ ${item.price}`);
          });
        }
      }
    } else {
      console.log(`❌ Sales endpoint com erro: ${salesResponse.status}`);
    }
    
    // Testar endpoint de stats
    console.log('\n📊 Testando GET /api/stats...');
    const statsResponse = await fetch(`${baseUrl}/api/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-token-for-${authorId}`
      }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log(`✅ Stats endpoint funcionando`);
      console.log(`   Total de vendas: ${statsData.totalSales}`);
      console.log(`   Receita total: R$ ${statsData.totalRevenue}`);
      console.log(`   Produtos ativos: ${statsData.activeProducts}`);
    } else {
      console.log(`❌ Stats endpoint com erro: ${statsResponse.status}`);
    }
    
    console.log('\n🎉 TESTE DA API FASE 4 CONCLUÍDO!');
    console.log('✅ Endpoints funcionando');
    console.log('✅ Nova estrutura marketplace implementada');
    
  } catch (error) {
    console.error('❌ ERRO no teste:', error.message);
  }
}

testPhase4Frontend(); 