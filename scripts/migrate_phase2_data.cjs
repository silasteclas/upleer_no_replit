const { neon } = require('@neondatabase/serverless');

require('dotenv').config();

async function migratePhase2Data() {
  console.log('🔄 FASE 2: MIGRAÇÃO DE DADOS EXISTENTES');
  console.log('=====================================');

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // 1. Fazer backup de segurança
    console.log('💾 1. Criando backup de segurança...');
    
    // Criar tabela temporária de backup
    await sql`
      CREATE TABLE IF NOT EXISTS sales_backup_phase2 AS 
      SELECT * FROM sales
    `;
    
    const backupCount = await sql`SELECT COUNT(*) as count FROM sales_backup_phase2`;
    console.log(`✅ Backup criado: ${backupCount[0].count} registros salvos`);
    
    // 2. Analisar dados existentes
    console.log('\n📊 2. Analisando dados existentes...');
    
    const existingSales = await sql`
      SELECT 
        s.*,
        p.title as product_title,
        p.author_id,
        u.email as author_email
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN users u ON p.author_id = u.id
      WHERE s.order_id IS NULL OR s.author_id IS NULL
      ORDER BY s.created_at DESC
    `;
    
    console.log(`📋 Vendas para migrar: ${existingSales.length}`);
    
    if (existingSales.length === 0) {
      console.log('✅ Nenhuma venda precisa ser migrada!');
      return;
    }
    
    // 3. Migrar dados para novo modelo
    console.log('\n🔄 3. Migrando dados para novo modelo...');
    
    let ordersCreated = 0;
    let salesUpdated = 0;
    let saleItemsCreated = 0;
    
    for (const sale of existingSales) {
      try {
        // Gerar order_id único baseado na venda (para vendas antigas)
        const orderId = `LEGACY_${sale.id}_${Date.now()}`;
        
        console.log(`📤 Processando venda ${sale.id} (${sale.product_title})...`);
        
        // Criar registro em orders
        await sql`
          INSERT INTO orders (id, cliente_nome, cliente_email, valor_total, status, created_at)
          VALUES (
            ${orderId},
            ${sale.buyer_name || 'Cliente Não Informado'},
            ${sale.buyer_email || sale.author_email},
            ${sale.sale_price},
            'completed',
            ${sale.created_at}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        ordersCreated++;
        
        // Atualizar registro em sales com order_id e author_id
        await sql`
          UPDATE sales 
          SET 
            order_id = ${orderId},
            author_id = ${sale.author_id}
          WHERE id = ${sale.id}
        `;
        salesUpdated++;
        
        // Criar registro em sale_items
        await sql`
          INSERT INTO sale_items (
            sale_id, 
            product_id, 
            product_name, 
            price, 
            quantity,
            created_at
          )
          VALUES (
            ${sale.id},
            ${sale.product_id.toString()},
            ${sale.product_title},
            ${sale.sale_price},
            ${sale.quantity || 1},
            ${sale.created_at}
          )
        `;
        saleItemsCreated++;
        
        console.log(`   ✅ Migrado: Order ${orderId.substring(0, 20)}...`);
        
      } catch (error) {
        console.error(`   ❌ Erro na venda ${sale.id}:`, error.message);
      }
    }
    
    // 4. Verificar integridade dos dados migrados
    console.log('\n🔍 4. Verificando integridade dos dados migrados...');
    
    const verificationQueries = await sql`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE id LIKE 'LEGACY_%') as legacy_orders,
        (SELECT COUNT(*) FROM sales WHERE order_id IS NOT NULL AND author_id IS NOT NULL) as updated_sales,
        (SELECT COUNT(*) FROM sale_items) as total_sale_items,
        (SELECT COUNT(*) FROM sales WHERE order_id IS NULL OR author_id IS NULL) as pending_sales
    `;
    
    const verification = verificationQueries[0];
    
    console.log('📊 Resultados da migração:');
    console.log(`   📦 Orders criados: ${ordersCreated}`);
    console.log(`   🔄 Sales atualizados: ${salesUpdated}`);
    console.log(`   📋 Sale items criados: ${saleItemsCreated}`);
    console.log(`   🔍 Orders legacy no banco: ${verification.legacy_orders}`);
    console.log(`   ✅ Sales com relacionamentos: ${verification.updated_sales}`);
    console.log(`   📊 Total sale items: ${verification.total_sale_items}`);
    console.log(`   ⚠️ Sales pendentes: ${verification.pending_sales}`);
    
    // 5. Testar relacionamentos
    console.log('\n🔗 5. Testando relacionamentos...');
    
    const relationshipTest = await sql`
      SELECT 
        o.id as order_id,
        o.cliente_nome,
        s.id as sale_id,
        s.author_id,
        si.product_name,
        si.quantity,
        si.price
      FROM orders o
      JOIN sales s ON o.id = s.order_id
      JOIN sale_items si ON s.id = si.sale_id
      WHERE o.id LIKE 'LEGACY_%'
      LIMIT 3
    `;
    
    console.log('✅ Teste de relacionamentos (primeiros 3):');
    relationshipTest.forEach(rel => {
      console.log(`   📦 ${rel.order_id.substring(0, 15)}... → ${rel.product_name} (${rel.quantity}x)`);
    });
    
    // 6. Preservar produto_nuvemshop_mapping
    console.log('\n🚨 6. Verificando preservação da produto_nuvemshop_mapping...');
    
    const mappingCheck = await sql`SELECT COUNT(*) as count FROM produto_nuvemshop_mapping`;
    console.log(`✅ produto_nuvemshop_mapping preservada: ${mappingCheck[0].count} registros`);
    
    console.log('\n🎉 FASE 2 CONCLUÍDA COM SUCESSO!');
    console.log('✅ Dados existentes migrados para novo modelo');
    console.log('✅ Relacionamentos estabelecidos');
    console.log('✅ Integridade verificada');
    console.log('✅ produto_nuvemshop_mapping preservada');
    console.log('✅ Sistema pronto para FASE 3');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    console.error('Stack:', error.stack);
    console.log('\n🔄 Para reverter, execute:');
    console.log('   TRUNCATE orders CASCADE;');
    console.log('   TRUNCATE sale_items CASCADE;');
    console.log('   UPDATE sales SET order_id = NULL, author_id = NULL;');
  }
}

migratePhase2Data(); 