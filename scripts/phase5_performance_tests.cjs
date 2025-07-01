require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function phase5PerformanceTests() {
  console.log('🧪 FASE 5.3 - TESTES DE PERFORMANCE');
  console.log('===================================');
  
  try {
    // 5.3.1 TESTAR PERFORMANCE DAS QUERIES PRINCIPAIS
    console.log('\n⚡ 5.3.1 TESTANDO PERFORMANCE DAS QUERIES...');
    
    const authorId = 'user_1750970151254_5uo1e69u5';
    
    // Query principal do frontend (getSalesByAuthor)
    console.log(`   📊 Testando query getSalesByAuthor...`);
    const start1 = Date.now();
    
    const salesQuery = `
      SELECT 
        s.id,
        s.order_id,
        s.author_id,
        s.product_id,
        s.sale_price,
        s.commission,
        s.author_earnings,
        s.quantity,
        s.created_at,
        p.title as product_title,
        p.author as product_author,
        o.cliente_nome,
        o.cliente_email,
        o.valor_total
      FROM sales s
      INNER JOIN products p ON s.product_id = p.id
      INNER JOIN orders o ON s.order_id = o.id
      WHERE s.author_id = $1
      ORDER BY s.created_at DESC
    `;
    
    const salesResult = await pool.query(salesQuery, [authorId]);
    const time1 = Date.now() - start1;
    
    console.log(`      ✅ Query executada em ${time1}ms`);
    console.log(`      📊 Resultados: ${salesResult.rows.length} vendas`);
    
    // Query de sale_items para cada venda
    console.log(`   📦 Testando queries de sale_items...`);
    const start2 = Date.now();
    
    let totalItems = 0;
    for (const sale of salesResult.rows) {
      const itemsQuery = `
        SELECT product_name, quantity, price
        FROM sale_items
        WHERE sale_id = $1
      `;
      const itemsResult = await pool.query(itemsQuery, [sale.id]);
      totalItems += itemsResult.rows.length;
    }
    
    const time2 = Date.now() - start2;
    console.log(`      ✅ ${salesResult.rows.length} queries de items executadas em ${time2}ms`);
    console.log(`      📊 Total de items: ${totalItems}`);
    
    // Query de estatísticas (getAuthorStats)
    console.log(`   📈 Testando query de estatísticas...`);
    const start3 = Date.now();
    
    const statsQuery = `
      SELECT 
        COUNT(s.id) as total_sales,
        SUM(s.sale_price) as total_revenue,
        (SELECT COUNT(*) FROM products WHERE author_id = $1 AND status = 'approved') as active_products,
        (SELECT COUNT(*) FROM products WHERE author_id = $1 AND status = 'pending') as pending_products
      FROM sales s
      WHERE s.author_id = $1
    `;
    
    const statsResult = await pool.query(statsQuery, [authorId]);
    const time3 = Date.now() - start3;
    
    console.log(`      ✅ Query de stats executada em ${time3}ms`);
    console.log(`      📊 Stats: ${statsResult.rows[0].total_sales} vendas, R$ ${statsResult.rows[0].total_revenue}`);
    
    // 5.3.2 TESTAR COM VOLUME SIMULADO
    console.log('\n📈 5.3.2 TESTANDO COM VOLUME SIMULADO...');
    
    // Simular múltiplas consultas simultâneas
    console.log(`   🔄 Simulando 10 consultas simultâneas...`);
    const start4 = Date.now();
    
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(pool.query(salesQuery, [authorId]));
    }
    
    const results = await Promise.all(promises);
    const time4 = Date.now() - start4;
    
    console.log(`      ✅ 10 consultas simultâneas executadas em ${time4}ms`);
    console.log(`      📊 Média por consulta: ${(time4/10).toFixed(1)}ms`);
    
    // 5.3.3 VERIFICAR ÍNDICES
    console.log('\n🔍 5.3.3 VERIFICANDO ÍNDICES...');
    
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('sales', 'orders', 'sale_items', 'products')
      ORDER BY tablename, indexname
    `;
    
    const indexResult = await pool.query(indexQuery);
    
    console.log(`   📋 Índices encontrados: ${indexResult.rows.length}`);
    
    const tableIndexes = {};
    indexResult.rows.forEach(idx => {
      if (!tableIndexes[idx.tablename]) {
        tableIndexes[idx.tablename] = [];
      }
      tableIndexes[idx.tablename].push(idx.indexname);
    });
    
    Object.keys(tableIndexes).forEach(table => {
      console.log(`      ${table}: ${tableIndexes[table].length} índices`);
    });
    
    // 5.3.4 ANÁLISE DE PERFORMANCE DE WEBHOOK
    console.log('\n🚀 5.3.4 TESTANDO PERFORMANCE DO WEBHOOK...');
    
    const webhookPayload = [
      {
        "order_id": `PERF_TEST_${Date.now()}`,
        "cliente_nome": "Cliente Performance Test",
        "cliente_email": "perf@teste.com",
        "id_autor": "user_1750970151254_5uo1e69u5",
        "produtos": [
          {
            "id_produto_interno": "19",
            "nome": "Produto Performance",
            "preco": 100.00,
            "quantidade": 1
          }
        ]
      }
    ];
    
    console.log(`   📤 Testando webhook com payload simples...`);
    const start5 = Date.now();
    
    const webhookResponse = await fetch(`http://localhost:5000/api/webhook/sales/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    
    const time5 = Date.now() - start5;
    
    if (webhookResponse.ok) {
      console.log(`      ✅ Webhook executado em ${time5}ms`);
    } else {
      console.log(`      ❌ Webhook falhou em ${time5}ms`);
    }
    
    // 5.3.5 RECOMENDAÇÕES DE OTIMIZAÇÃO
    console.log('\n🎯 5.3.5 ANÁLISE E RECOMENDAÇÕES...');
    
    const totalTime = time1 + time2 + time3;
    console.log(`   📊 Tempo total das queries principais: ${totalTime}ms`);
    
    if (totalTime < 100) {
      console.log(`      ✅ Performance EXCELENTE (< 100ms)`);
    } else if (totalTime < 500) {
      console.log(`      ✅ Performance BOA (< 500ms)`);
    } else if (totalTime < 1000) {
      console.log(`      ⚠️ Performance ACEITÁVEL (< 1s)`);
    } else {
      console.log(`      ❌ Performance RUIM (> 1s) - Necessita otimização`);
    }
    
    // Sugestões de índices
    console.log(`   💡 Sugestões de otimização:`);
    console.log(`      - Índice em sales.author_id (para isolamento)`);
    console.log(`      - Índice em sales.order_id (para relacionamentos)`);
    console.log(`      - Índice em sale_items.sale_id (para items)`);
    console.log(`      - Índice composto em sales(author_id, created_at) para ordenação`);
    
    console.log('\n🎉 TESTES DE PERFORMANCE FASE 5.3 CONCLUÍDOS!');
    console.log('✅ Queries principais testadas');
    console.log('✅ Performance com volume simulado');
    console.log('✅ Índices verificados');
    console.log('✅ Webhook testado');
    console.log('✅ Recomendações de otimização geradas');
    
  } catch (error) {
    console.error('❌ ERRO nos testes de performance:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

phase5PerformanceTests(); 