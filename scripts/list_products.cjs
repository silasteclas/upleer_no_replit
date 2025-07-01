// Script para listar produtos do banco - Versão corrigida
// Execute: node scripts/list_products.cjs


const { neon } = require('@neondatabase/serverless');
require('dotenv/config');

const sql = neon(process.env.DATABASE_URL);

async function listProducts() {
  try {
    const products = await sql`
      SELECT 
        id, 
        title, 
        author, 
        genre, 
        status, 
        sale_price,
        cover_image_url,
        pdf_url,
        created_at
      FROM products 
      ORDER BY created_at DESC
    `;
    
    return products;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}

function formatTable(products) {
  console.log('\n📋 PRODUTOS CADASTRADOS NO BANCO');
  console.log('='.repeat(80));
  
  if (products.length === 0) {
    console.log('❌ Nenhum produto encontrado no banco');
    return;
  }

  console.log(`✅ Encontrados ${products.length} produtos\n`);

  // Formato mais simples e legível
  products.forEach((product, index) => {
    const isSupabase = product.cover_image_url && product.cover_image_url.includes('supabase.co');
    const storageType = isSupabase ? '🌐 Supabase' : '📁 Local';
    
    console.log(`${'-'.repeat(80)}`);
    console.log(`📦 Produto #${product.id} (${index + 1}/${products.length})`);
    console.log(`   Título: ${product.title}`);
    console.log(`   Autor: ${product.author}`);
    console.log(`   Gênero: ${product.genre}`);
    console.log(`   Status: ${product.status}`);
    console.log(`   Preço: R$ ${product.sale_price}`);
    console.log(`   Data: ${new Date(product.created_at).toLocaleDateString('pt-BR')}`);
    console.log(`   PDF: ${product.pdf_url ? '✅ Sim' : '❌ Não'}`);
    console.log(`   Capa: ${product.cover_image_url ? '✅ Sim' : '❌ Não'}`);
    console.log(`   Storage: ${storageType}`);
    
    if (product.cover_image_url && isSupabase) {
      console.log(`   🔗 URL Capa: ${product.cover_image_url.substring(0, 60)}...`);
    }
  });
  
  console.log(`${'-'.repeat(80)}`);
}

async function main() {
  try {
    const products = await listProducts();
    formatTable(products);
    
    console.log('\n💡 COMANDOS DISPONÍVEIS:');
    console.log('   📤 Reenviar produto específico: node scripts/resend_single_product.cjs [ID]');
    console.log('   📤 Reenviar todos os produtos: node scripts/resend_products.cjs');
    console.log('   📋 Listar produtos: node scripts/list_products_fixed.cjs');
    
    // Estatísticas
    const supabaseCount = products.filter(p => p.cover_image_url && p.cover_image_url.includes('supabase.co')).length;
    const localCount = products.length - supabaseCount;
    
    console.log('\n📊 ESTATÍSTICAS:');
    console.log(`   🌐 Produtos com Supabase: ${supabaseCount}`);
    console.log(`   📁 Produtos locais: ${localCount}`);
    console.log(`   📦 Total: ${products.length}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

main(); 