require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function updateExistingVendorNumbers() {
  console.log('🔄 ATUALIZAÇÃO: Numeração Sequencial de Vendas Existentes');
  console.log('====================================================');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
    return;
  }
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // 1. Buscar todas as vendas agrupadas por autor
    console.log('\n📋 1. Buscando vendas existentes...');
    
    const vendorSales = await sql`
      SELECT 
        id,
        author_id,
        vendor_order_number,
        created_at,
        buyer_name,
        sale_price
      FROM sales 
      WHERE author_id IS NOT NULL 
      ORDER BY author_id, created_at ASC
    `;
    
    if (vendorSales.length === 0) {
      console.log('📭 Nenhuma venda encontrada.');
      return;
    }
    
    console.log(`✅ Encontradas ${vendorSales.length} vendas para processar`);
    
    // 2. Agrupar por vendedor
    const vendorGroups = {};
    vendorSales.forEach(sale => {
      if (!vendorGroups[sale.author_id]) {
        vendorGroups[sale.author_id] = [];
      }
      vendorGroups[sale.author_id].push(sale);
    });
    
    console.log(`👥 Vendedores encontrados: ${Object.keys(vendorGroups).length}`);
    
    // 3. Atualizar numeração sequencial para cada vendedor
    let totalUpdated = 0;
    
    for (const [authorId, sales] of Object.entries(vendorGroups)) {
      console.log(`\n👤 Processando vendedor: ${authorId}`);
      console.log(`   📊 Total de vendas: ${sales.length}`);
      
      // Ordenar por data de criação para manter ordem cronológica
      sales.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      // Atualizar cada venda com número sequencial correto
      for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        const newOrderNumber = i + 1;
        
        if (sale.vendor_order_number !== newOrderNumber) {
          await sql`
            UPDATE sales 
            SET vendor_order_number = ${newOrderNumber}
            WHERE id = ${sale.id}
          `;
          
          console.log(`   🔄 Venda ID ${sale.id}: ${sale.vendor_order_number} → #${String(newOrderNumber).padStart(3, '0')}`);
          totalUpdated++;
        } else {
          console.log(`   ✅ Venda ID ${sale.id}: #${String(newOrderNumber).padStart(3, '0')} (já correto)`);
        }
      }
      
      console.log(`   ✅ Vendedor ${authorId} processado: sequência 1 a ${sales.length}`);
    }
    
    console.log(`\n📊 4. Resumo da atualização:`);
    console.log(`   🔄 Vendas atualizadas: ${totalUpdated}`);
    console.log(`   ✅ Vendas já corretas: ${vendorSales.length - totalUpdated}`);
    console.log(`   📊 Total processado: ${vendorSales.length}`);
    
    // 5. Verificação final
    console.log(`\n🔍 5. Verificação final...`);
    
    const duplicates = await sql`
      SELECT author_id, vendor_order_number, COUNT(*) as count
      FROM sales 
      WHERE author_id IS NOT NULL
      GROUP BY author_id, vendor_order_number
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length > 0) {
      console.log('❌ AINDA EXISTEM DUPLICATAS:');
      duplicates.forEach(dup => {
        console.log(`   Vendedor ${dup.author_id}: #${dup.vendor_order_number} aparece ${dup.count} vezes`);
      });
    } else {
      console.log('✅ Nenhuma duplicata encontrada - numeração corrigida!');
    }
    
    console.log('\n🎉 Atualização concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante atualização:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar atualização
updateExistingVendorNumbers().catch(console.error); 