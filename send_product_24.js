
const fetch = require('node-fetch');

async function sendProduct24ToN8N() {
  const webhookUrl = 'https://auton8n.upleer.com.br/webhook-test/5b04bf83-a7d2-4eec-9d85-dfa14f2e3e00';
  
  // Dados completos do produto ID 24
  const productData = {
    id: 24,
    title: "Livro de Exemplo 24",
    description: "Descrição detalhada do produto 24",
    author: "Autor do Livro 24",
    isbn: "978-0000000024",
    coAuthors: "Co-autores do livro",
    genre: "Ficção",
    language: "português",
    targetAudience: "Adultos",
    pageCount: 250,
    baseCost: "15.00",
    salePrice: "45.00",
    marginPercent: 200,
    status: "published",
    authorId: "author-24",
    pdfUrl: "/uploads/7de00b6713e21b890fa8ab67b5b73184",
    coverImageUrl: "/uploads/cover-24",
    publicUrl: "https://loja.upleer.com.br/produto/24",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloadUrls: {
      productDetails: `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/products/24`,
      pdfDownload: `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/download/pdf/7de00b6713e21b890fa8ab67b5b73184`,
      coverDownload: `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/download/cover/cover-24`
    },
    // Campos adicionais para integração completa
    pricing: {
      baseCost: "15.00",
      salePrice: "45.00",
      currency: "BRL",
      marginPercent: 200,
      discountPercent: 0
    },
    metadata: {
      fileSize: "177449",
      uploadDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: "1.0"
    },
    sales: {
      totalSales: 0,
      totalRevenue: "0.00",
      lastSaleDate: null
    }
  };

  try {
    console.log('[N8N] Enviando produto 24 para webhook...');
    console.log('[N8N] URL:', webhookUrl);
    console.log('[N8N] Dados:', JSON.stringify(productData, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Upleer-Webhook/1.0',
        'X-Product-ID': '24',
        'X-Webhook-Source': 'upleer-dashboard'
      },
      body: JSON.stringify(productData)
    });

    const responseText = await response.text();
    
    console.log('[N8N] Status:', response.status);
    console.log('[N8N] Status Text:', response.statusText);
    console.log('[N8N] Headers:', Object.fromEntries(response.headers));
    console.log('[N8N] Response:', responseText);

    if (response.ok) {
      console.log('[N8N] ✅ Produto 24 enviado com sucesso!');
    } else {
      console.error('[N8N] ❌ Erro ao enviar produto 24');
    }

    return {
      success: response.ok,
      status: response.status,
      response: responseText
    };

  } catch (error) {
    console.error('[N8N] Erro na requisição:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar o envio
sendProduct24ToN8N()
  .then(result => {
    console.log('\n=== RESULTADO FINAL ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
