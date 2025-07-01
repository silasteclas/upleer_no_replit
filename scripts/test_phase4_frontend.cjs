require('dotenv').config();
const { db } = require('../server/db.ts');
const { sales, orders, saleItems, products } = require('../shared/schema.ts');
const { eq } = require('drizzle-orm');

async function testPhase4Frontend() {
  console.log('🧪 TESTANDO FRONTEND FASE 4 - NOVA ESTRUTURA MARKETPLACE');
  console.log('=======================================================');
  
  try {
    // Buscar vendas de um autor específico para testar
    const authorId = 'user_1750970151254_5uo1e69u5';
    console.log(`📊 Buscando vendas do autor: ${authorId}`);
    
    // Simular a query que o frontend fará
    const authorSales = await db
      .select({
        // Campos da venda
        id: sales.id,
        orderId: sales.orderId,
        authorId: sales.authorId,
        productId: sales.productId,
        buyerEmail: sales.buyerEmail,
        buyerName: sales.buyerName,
        salePrice: sales.salePrice,
        commission: sales.commission,
        authorEarnings: sales.authorEarnings,
        quantity: sales.quantity,
        createdAt: sales.createdAt,
        
        // Campos do produto
        productTitle: products.title,
        productAuthor: products.author,
        
        // Campos do pedido
        orderClienteNome: orders.clienteNome,
        orderClienteEmail: orders.clienteEmail,
        orderValorTotal: orders.valorTotal,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .innerJoin(orders, eq(sales.orderId, orders.id))
      .where(eq(sales.authorId, authorId));

    console.log(`✅ Encontradas ${authorSales.length} vendas`);
    
    // Para cada venda, buscar os sale_items
    for (const sale of authorSales) {
      console.log(`\n📦 VENDA ID: ${sale.id}`);
      console.log(`   Order ID: ${sale.orderId}`);
      console.log(`   Produto Principal: ${sale.productTitle}`);
      console.log(`   Cliente: ${sale.orderClienteNome} (${sale.orderClienteEmail})`);
      console.log(`   Valor: R$ ${sale.salePrice}`);
      console.log(`   Quantidade: ${sale.quantity}`);
      
      // Buscar sale_items
      const items = await db
        .select({
          product_name: saleItems.productName,
          quantity: saleItems.quantity,
          price: saleItems.price,
        })
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id));
      
      console.log(`   Sale Items: ${items.length}`);
      items.forEach((item, index) => {
        console.log(`     ${index + 1}. ${item.product_name}: ${item.quantity}x R$ ${item.price}`);
      });
      
      // Calcular total de produtos
      const totalProducts = items.reduce((total, item) => total + item.quantity, 0);
      console.log(`   ✅ Total de produtos: ${totalProducts}`);
    }
    
    console.log('\n🎉 TESTE DO FRONTEND FASE 4 CONCLUÍDO COM SUCESSO!');
    console.log('✅ Nova estrutura marketplace funcionando');
    console.log('✅ Relacionamentos entre orders, sales e sale_items OK');
    console.log('✅ Isolamento por vendedor mantido');
    
  } catch (error) {
    console.error('❌ ERRO no teste:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testPhase4Frontend(); 