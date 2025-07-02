require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function checkVendorOrderNumbers() {
  console.log('🔍 VERIFICAÇÃO: Números Sequenciais de Pedidos por Vendedor');
  console.log('=======================================================');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
    return;
  }
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Verificar se a coluna vendor_order_number existe
    console.log('\n📋 1. Verificando estrutura da tabela sales...');
    
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sales' AND column_name = 'vendor_order_number'
    `;
    
    if (columns.length > 0) {
      console.log('✅ Coluna vendor_order_number encontrada:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
      });
    } else {
      console.log('❌ Coluna vendor_order_number NÃO encontrada!');
      return;
    }
    
    // Verificar vendas por autor com números sequenciais
    console.log('\n👥 2. Verificando números sequenciais por vendedor...');
    
    const vendorSales = await sql`
      SELECT 
        author_id,
        vendor_order_number,
        order_id,
        sale_price,
        created_at,
        buyer_name
      FROM sales 
      WHERE author_id IS NOT NULL 
      ORDER BY author_id, vendor_order_number
    `;
    
    if (vendorSales.length === 0) {
      console.log('📭 Nenhuma venda encontrada com author_id.');
      return;
    }
    
    // Agrupar por vendedor
    const vendorGroups = {};
    vendorSales.forEach(sale => {
      if (!vendorGroups[sale.author_id]) {
        vendorGroups[sale.author_id] = [];
      }
      vendorGroups[sale.author_id].push(sale);
    });
    
    // Exibir resultados por vendedor
    Object.keys(vendorGroups).forEach((authorId, index) => {
      const sales = vendorGroups[authorId];
      console.log(`\n👤 Vendedor ${index + 1}: ${authorId}`);
      console.log(`   📊 Total de vendas: ${sales.length}`);
      
      sales.forEach(sale => {
        const orderNumber = String(sale.vendor_order_number).padStart(3, '0');
        const salePrice = parseFloat(sale.sale_price).toFixed(2);
        const date = new Date(sale.created_at).toLocaleDateString('pt-BR');
        
        console.log(`   #${orderNumber} - R$ ${salePrice} - ${sale.buyer_name || 'Cliente'} (${date})`);
      });
      
      // Verificar sequência
      const expectedNumbers = Array.from({length: sales.length}, (_, i) => i + 1);
      const actualNumbers = sales.map(s => s.vendor_order_number).sort((a, b) => a - b);
      const isSequential = JSON.stringify(expectedNumbers) === JSON.stringify(actualNumbers);
      
      if (isSequential) {
        console.log(`   ✅ Sequência correta: 1 a ${sales.length}`);
      } else {
        console.log(`   ❌ Sequência incorreta!`);
        console.log(`      Esperado: [${expectedNumbers.join(', ')}]`);
        console.log(`      Atual: [${actualNumbers.join(', ')}]`);
      }
    });
    
    // Estatísticas gerais
    console.log('\n📊 3. Estatísticas gerais...');
    
    const stats = await sql`
      SELECT 
        COUNT(DISTINCT author_id) as total_vendors,
        COUNT(*) as total_sales,
        MIN(vendor_order_number) as min_number,
        MAX(vendor_order_number) as max_number
      FROM sales 
      WHERE author_id IS NOT NULL
    `;
    
    const stat = stats[0];
    console.log(`   👥 Total de vendedores: ${stat.total_vendors}`);
    console.log(`   🛒 Total de vendas: ${stat.total_sales}`);
    console.log(`   📈 Faixa de números: ${stat.min_number} a ${stat.max_number}`);
    
    // Verificar duplicatas
    const duplicates = await sql`
      SELECT author_id, vendor_order_number, COUNT(*) as count
      FROM sales 
      WHERE author_id IS NOT NULL
      GROUP BY author_id, vendor_order_number
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length > 0) {
      console.log('\n⚠️ ATENÇÃO: Números duplicados encontrados!');
      duplicates.forEach(dup => {
        console.log(`   Vendedor ${dup.author_id}: Número #${dup.vendor_order_number} aparece ${dup.count} vezes`);
      });
    } else {
      console.log('\n✅ Nenhum número duplicado encontrado por vendedor.');
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar verificação
checkVendorOrderNumbers().catch(console.error); 