// Script para reenviar um produto específico para N8N
// 
// CONFIGURAÇÃO:
//   1. Altere 'current' na seção WEBHOOK_CONFIG para 'test' ou 'production'
//   2. Execute: node scripts/resend_single_product.cjs [ID_DO_PRODUTO]
//
// EXEMPLOS:
//   node scripts/resend_single_product.cjs 5
//   node scripts/resend_single_product.cjs 16
//
// ALTERNATIVA (URL no comando):
//   node scripts/resend_single_product.cjs 5 https://auton8n.upleer.com.br/webhook-test/novo_produto

const { neon } = require('@neondatabase/serverless');
require('dotenv/config');

const sql = neon(process.env.DATABASE_URL);

// 🔧 CONFIGURAÇÃO DO WEBHOOK - ALTERE AQUI A URL DE DESTINO
const WEBHOOK_CONFIG = {
  // URL de TESTE
  test: 'https://auton8n.upleer.com.br/webhook-test/novo_produto',
  
  // URL de PRODUÇÃO
  production: 'https://auton8n.upleer.com.br/webhook/novo_produto',
  
  // 👇 ALTERE AQUI: 'test' ou 'production'
  current: 'test'  // ← Mude aqui para alternar entre teste e produção
};

async function getProductById(productId) {
  try {
    const products = await sql`
      SELECT * FROM products 
      WHERE id = ${productId}
      LIMIT 1
    `;
    return products[0] || null;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return null;
  }
}

async function sendToN8N(product, customWebhookUrl = null) {
  const webhookUrl = customWebhookUrl || WEBHOOK_CONFIG[WEBHOOK_CONFIG.current];
  
  // Verificar se é URL do Supabase ou local
  const isSupabaseCover = product.cover_image_url && product.cover_image_url.includes('supabase.co');
  const isSupabasePdf = product.pdf_url && product.pdf_url.includes('supabase.co');
  
  const pdfFilename = product.pdf_url && !isSupabasePdf ? product.pdf_url.split('/').pop() : null;
  const coverFilename = product.cover_image_url && !isSupabaseCover ? product.cover_image_url.split('/').pop() : null;
  
  // Usar URL do Supabase diretamente se disponível, senão usar localhost
  const coverUrl = isSupabaseCover 
    ? product.cover_image_url 
    : (coverFilename ? `http://localhost:5000/uploads/${coverFilename}` : product.cover_image_url);
    
  const pdfUrl = isSupabasePdf 
    ? product.pdf_url 
    : product.pdf_url;
  
  // Limpar e formatar descrição
  const cleanDescription = product.description 
    ? product.description
        .replace(/\\n/g, ' ')           // Remover \n literais
        .replace(/\n/g, ' ')            // Remover quebras de linha reais
        .replace(/\r/g, ' ')            // Remover retornos de carro
        .replace(/\s+/g, ' ')           // Múltiplos espaços vira um só
        .trim()                         // Remove espaços no início/fim
    : '';
  
  const data = {
    id: product.id,
    title: product.title,
    description: cleanDescription,
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
    pdfUrl: pdfUrl,
    coverImageUrl: coverUrl,
    publicUrl: product.public_url,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    downloadUrls: {
      productDetails: `http://localhost:5000/api/products/${product.id}`,
      pdfDownload: pdfFilename ? `http://localhost:5000/api/pdf/${pdfFilename}` : null,
      pdfDirect: isSupabasePdf ? pdfUrl : (pdfFilename ? `http://localhost:5000/uploads/${pdfFilename}` : null),
      coverDownload: isSupabaseCover ? coverUrl : (coverFilename ? `http://localhost:5000/api/download/cover/${coverFilename}` : null)
    },
    metadata: {
      source: 'manual_single_resend',
      timestamp: new Date().toISOString(),
      resent: true,
      storageType: {
        cover: isSupabaseCover ? 'supabase' : 'local',
        pdf: isSupabasePdf ? 'supabase' : 'local'
      }
    }
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'manual-single',
      'X-Product-ID': product.id.toString()
    },
    body: JSON.stringify(data)
  });

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text()
  };
}

async function main() {
  const productId = process.argv[2];
  const customWebhookUrl = process.argv[3];
  
  if (!productId) {
    console.log('❌ Uso: node resend_single_product.cjs [ID_DO_PRODUTO] [URL_WEBHOOK]');
    console.log('   Exemplo: node resend_single_product.cjs 5');
    console.log('   Exemplo com URL personalizada: node resend_single_product.cjs 5 https://auton8n.upleer.com.br/webhook-test/novo_produto');
    return;
  }

  const webhookUrl = customWebhookUrl || WEBHOOK_CONFIG[WEBHOOK_CONFIG.current];

  console.log(`🎯 REENVIANDO PRODUTO ${productId} PARA N8N`);
  console.log('======================================');
  console.log(`🔗 Modo: ${WEBHOOK_CONFIG.current.toUpperCase()}`);
  console.log(`🔗 URL do Webhook: ${webhookUrl}`);
  console.log('');

  console.log('📋 Buscando produto no banco...');
  const product = await getProductById(parseInt(productId));
  
  if (!product) {
    console.log(`❌ Produto ${productId} não encontrado`);
    return;
  }

  console.log('✅ Produto encontrado:');
  console.log(`   📦 Título: ${product.title}`);
  console.log(`   👤 Autor: ${product.author}`);
  console.log(`   📊 Status: ${product.status}`);
  console.log(`   💰 Preço: R$ ${product.sale_price}`);
  
  const isSupabaseCover = product.cover_image_url && product.cover_image_url.includes('supabase.co');
  const isSupabasePdf = product.pdf_url && product.pdf_url.includes('supabase.co');
  
  console.log(`   🖼️ Capa: ${product.cover_image_url ? 'Sim' : 'Não'} (${isSupabaseCover ? '🌐 Supabase' : '📁 Local'})`);
  console.log(`   📄 PDF: ${product.pdf_url ? 'Sim' : 'Não'} (${isSupabasePdf ? '🌐 Supabase' : '📁 Local'})`);
  
  if (product.cover_image_url) {
    console.log(`   🔗 URL Capa: ${product.cover_image_url.substring(0, 60)}...`);
  }
  
  console.log('');

  console.log('📤 Enviando para N8N...');
  
  try {
    const result = await sendToN8N(product, customWebhookUrl);
    
    if (result.ok) {
      console.log('✅ SUCESSO!');
      console.log(`   Status: ${result.status}`);
      console.log(`   Resposta: ${result.text}`);
    } else {
      console.log('❌ ERRO!');
      console.log(`   Status: ${result.status}`);
      console.log(`   Resposta: ${result.text}`);
    }
    
  } catch (error) {
    console.log('❌ ERRO DE REDE!');
    console.log(`   ${error.message}`);
  }

  console.log('');
  console.log('🎯 Concluído! Verifique o N8N.');
}

main().catch(console.error); 