// Script simples para reenviar produtos existentes para N8N
// Execute: node resend_products.cjs

const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
require('dotenv/config');

// Configurar conexão com banco
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function getProductsFromDB() {
  try {
    // Query SQL direta para buscar produtos
    const products = await sql`
      SELECT * FROM products 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    return products;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}

async function sendProductToN8N(product) {
  const webhookUrl = 'https://auton8n.upleer.com.br/webhook/novo_produto';
  
  // Preparar dados do produto
  const pdfFilename = product.pdf_url ? product.pdf_url.split('/').pop() : null;
  const coverFilename = product.cover_image_url ? product.cover_image_url.split('/').pop() : null;
  
  const webhookData = {
    id: product.id,
    title: product.title,
    description: product.description,
    author: product.author,
    isbn: product.isbn,
    coAuthors: product.co_authors,
    genre: product.genre,
    language: product.language,
    targetAudience: product.target_audience,
    pageCount: product.page_count,
    baseCost: product.base_cost,
    salePrice: product.sale_price,
    marginPercent: product.margin_percent,
    status: product.status,
    authorId: product.author_id,
    pdfUrl: product.pdf_url,
    // Converter para URL pública completa
    coverImageUrl: coverFilename ? `http://localhost:5000/uploads/${coverFilename}` : product.cover_image_url,
    publicUrl: product.public_url,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    downloadUrls: {
      productDetails: `http://localhost:5000/api/products/${product.id}`,
      pdfDownload: pdfFilename ? `http://localhost:5000/api/pdf/${pdfFilename}` : null,
      pdfDirect: pdfFilename ? `http://localhost:5000/uploads/${pdfFilename}` : null,
      coverDownload: coverFilename ? `http://localhost:5000/api/download/cover/${coverFilename}` : null
    },
    metadata: {
      source: 'manual_resend_script',
      environment: 'development',
      timestamp: new Date().toISOString(),
      resent: true
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Upleer-Resend-Script/1.0',
        'X-Webhook-Source': 'manual-resend',
        'X-Product-ID': product.id.toString()
      },
      body: JSON.stringify(webhookData)
    });

    const responseText = await response.text();
    
    return {
      success: response.ok,
      status: response.status,
      response: responseText,
      productId: product.id
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      productId: product.id
    };
  }
}

async function main() {
  console.log('🔄 REENVIANDO PRODUTOS EXISTENTES PARA N8N');
  console.log('===========================================');

  // Buscar produtos do banco
  console.log('📋 Buscando produtos no banco...');
  const products = await getProductsFromDB();
  
  if (products.length === 0) {
    console.log('❌ Nenhum produto encontrado');
    return;
  }

  console.log(`✅ Encontrados ${products.length} produtos`);
  console.log('');

  // Listar produtos
  console.log('📦 PRODUTOS ENCONTRADOS:');
  console.log('========================');
  products.forEach((product, index) => {
    console.log(`${index + 1}. ID: ${product.id} | ${product.title} | ${product.author} | ${product.status}`);
  });
  console.log('');

  // Enviar cada produto
  console.log('🚀 ENVIANDO PARA N8N...');
  console.log('=======================');
  
  const results = [];
  
  for (const product of products) {
    console.log(`📤 Enviando produto ${product.id}: ${product.title}`);
    
    const result = await sendProductToN8N(product);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ Sucesso! Status: ${result.status}`);
    } else {
      console.log(`   ❌ Erro! ${result.error || `Status: ${result.status}`}`);
    }
    
    // Pausa de 1 segundo entre envios
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Relatório final
  console.log('');
  console.log('📊 RELATÓRIO FINAL');
  console.log('==================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Enviados com sucesso: ${successful.length}`);
  console.log(`❌ Falharam: ${failed.length}`);
  console.log(`📋 Total: ${results.length}`);
  
  if (failed.length > 0) {
    console.log('');
    console.log('❌ FALHAS:');
    failed.forEach(f => {
      console.log(`   - Produto ${f.productId}: ${f.error || `Status ${f.status}`}`);
    });
  }

  console.log('');
  console.log('🎯 Concluído! Verifique o N8N para ver os dados.');
}

// Executar
main().catch(console.error); 