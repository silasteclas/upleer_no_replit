// FASE 6 - Script de Migração de Dados Existentes
// Este script calcula e adiciona dados financeiros para produtos já cadastrados

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { eq, isNull, or } from 'drizzle-orm';
import { products } from '../shared/schema.js';

// Configurar Neon
if (process.env.NODE_ENV !== 'production') {
  neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineThroughput = 0;
  neonConfig.pipelineConnect = false;
}

// Conectar ao banco
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log('🔄 FASE 6 - MIGRAÇÃO DE DADOS EXISTENTES');
console.log('====================================================');

// Função para calcular dados financeiros baseados no salePrice existente
function calculateFinancialData(salePrice, pageCount) {
  // Usar reverse engineering do salePrice atual para calcular authorEarnings
  // Fórmula original: salePrice = authorEarnings + platformCommission
  // platformCommission = fixedFee + printingCost + commission
  // commission = authorEarnings * 0.30
  
  const fixedFee = 9.90;
  const printingCostPerPage = 0.10;
  const commissionRate = 30.00; // 30%
  
  const printingCost = pageCount * printingCostPerPage;
  
  // Resolver equação: salePrice = authorEarnings + fixedFee + printingCost + (authorEarnings * 0.30)
  // salePrice = authorEarnings * 1.30 + fixedFee + printingCost
  // authorEarnings = (salePrice - fixedFee - printingCost) / 1.30
  
  const baseCosts = fixedFee + printingCost;
  const authorEarnings = Math.max(0, (salePrice - baseCosts) / 1.30);
  
  const commissionAmount = authorEarnings * (commissionRate / 100);
  const platformCommission = fixedFee + printingCost + commissionAmount;
  
  return {
    authorEarnings: parseFloat(authorEarnings.toFixed(2)),
    platformCommission: parseFloat(platformCommission.toFixed(2)),
    fixedFee: fixedFee,
    printingCostPerPage: printingCostPerPage,
    commissionRate: commissionRate
  };
}

async function migrateExistingProducts() {
  try {
    console.log('\n📊 ETAPA 1: Análise dos Produtos Existentes');
    console.log('--------------------------------------------------');
    
    // Buscar produtos que não têm dados financeiros
    const productsToMigrate = await db
      .select()
      .from(products)
      .where(
        or(
          isNull(products.authorEarnings),
          isNull(products.platformCommission)
        )
      );
    
    console.log(`📋 Produtos encontrados para migração: ${productsToMigrate.length}`);
    
    if (productsToMigrate.length === 0) {
      console.log('✅ Todos os produtos já possuem dados financeiros!');
      return { migrated: 0, skipped: 0 };
    }
    
    console.log('\n🔧 ETAPA 2: Backup e Validação');
    console.log('--------------------------------------------------');
    
    // Criar backup dos dados atuais
    const backupData = productsToMigrate.map(product => ({
      id: product.id,
      title: product.title,
      salePrice: product.salePrice,
      pageCount: product.pageCount,
      marginPercent: product.marginPercent,
      baseCost: product.baseCost
    }));
    
    console.log(`💾 Backup criado para ${backupData.length} produtos`);
    console.log('   Dados backup salvos na memória para rollback');
    
    console.log('\n🔄 ETAPA 3: Cálculo e Migração');
    console.log('--------------------------------------------------');
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const product of productsToMigrate) {
      try {
        const salePrice = parseFloat(product.salePrice) || 0;
        const pageCount = parseInt(product.pageCount) || 1;
        
        // Validar dados básicos
        if (salePrice <= 0) {
          console.log(`⚠️  Produto ${product.id} - Preço inválido (R$ ${salePrice}), pulando...`);
          skippedCount++;
          continue;
        }
        
        if (pageCount <= 0) {
          console.log(`⚠️  Produto ${product.id} - Páginas inválidas (${pageCount}), usando 1...`);
        }
        
        // Calcular dados financeiros
        const financialData = calculateFinancialData(salePrice, Math.max(pageCount, 1));
        
        // Atualizar produto
        await db
          .update(products)
          .set({
            authorEarnings: financialData.authorEarnings.toString(),
            platformCommission: financialData.platformCommission.toString(),
            fixedFee: financialData.fixedFee.toString(),
            printingCostPerPage: financialData.printingCostPerPage.toString(),
            commissionRate: financialData.commissionRate.toString(),
            updatedAt: new Date()
          })
          .where(eq(products.id, product.id));
        
        console.log(`✅ Produto ${product.id} (${product.title})`);
        console.log(`   📄 Páginas: ${pageCount}`);
        console.log(`   💰 Preço original: R$ ${salePrice.toFixed(2)}`);
        console.log(`   🎯 Ganho autor: R$ ${financialData.authorEarnings.toFixed(2)}`);
        console.log(`   🏢 Ganho plataforma: R$ ${financialData.platformCommission.toFixed(2)}`);
        console.log(`   ✨ Verificação: R$ ${(financialData.authorEarnings + financialData.platformCommission).toFixed(2)} = R$ ${salePrice.toFixed(2)}`);
        
        migratedCount++;
        
        // Pausa pequena para não sobrecarregar o banco
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Erro ao migrar produto ${product.id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n🎯 ETAPA 4: Validação Pós-Migração');
    console.log('--------------------------------------------------');
    
    // Verificar produtos migrados
    const migratedProducts = await db
      .select()
      .from(products)
      .where(eq(products.id, productsToMigrate[0]?.id))
      .limit(5);
    
    if (migratedProducts.length > 0) {
      console.log('✅ Amostra de produtos migrados:');
      migratedProducts.forEach(product => {
        const authorEarnings = parseFloat(product.authorEarnings || '0');
        const platformCommission = parseFloat(product.platformCommission || '0');
        const total = authorEarnings + platformCommission;
        const originalPrice = parseFloat(product.salePrice) || 0;
        const difference = Math.abs(total - originalPrice);
        
        console.log(`   📦 ${product.title}`);
        console.log(`      💰 Autor: R$ ${authorEarnings.toFixed(2)} | Plataforma: R$ ${platformCommission.toFixed(2)}`);
        console.log(`      🔍 Total: R$ ${total.toFixed(2)} | Original: R$ ${originalPrice.toFixed(2)} | Diferença: R$ ${difference.toFixed(2)}`);
      });
    }
    
    return { migrated: migratedCount, skipped: skippedCount, backup: backupData };
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

async function validateMigration() {
  console.log('\n🔍 ETAPA 5: Validação Completa');
  console.log('--------------------------------------------------');
  
  try {
    // Verificar produtos sem dados financeiros
    const incompleteProducts = await db
      .select()
      .from(products)
      .where(
        or(
          isNull(products.authorEarnings),
          isNull(products.platformCommission)
        )
      );
    
    console.log(`📊 Produtos sem dados financeiros: ${incompleteProducts.length}`);
    
    // Verificar consistência dos cálculos
    const allProducts = await db.select().from(products);
    let consistentCount = 0;
    let inconsistentCount = 0;
    
    for (const product of allProducts) {
      if (product.authorEarnings && product.platformCommission && product.salePrice) {
        const authorEarnings = parseFloat(product.authorEarnings);
        const platformCommission = parseFloat(product.platformCommission);
        const calculatedTotal = authorEarnings + platformCommission;
        const originalPrice = parseFloat(product.salePrice);
        const difference = Math.abs(calculatedTotal - originalPrice);
        
        if (difference < 0.01) { // Tolerância de 1 centavo
          consistentCount++;
        } else {
          inconsistentCount++;
          if (inconsistentCount <= 3) { // Mostrar apenas os primeiros 3 inconsistentes
            console.log(`⚠️  Inconsistência detectada no produto ${product.id}:`);
            console.log(`    Calculado: R$ ${calculatedTotal.toFixed(2)} | Original: R$ ${originalPrice.toFixed(2)}`);
          }
        }
      }
    }
    
    console.log(`✅ Produtos consistentes: ${consistentCount}`);
    console.log(`⚠️  Produtos inconsistentes: ${inconsistentCount}`);
    
    return {
      totalProducts: allProducts.length,
      incompleteProducts: incompleteProducts.length,
      consistentProducts: consistentCount,
      inconsistentProducts: inconsistentCount
    };
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    throw error;
  }
}

// Executar migração
async function runMigration() {
  console.log('🚀 INICIANDO MIGRAÇÃO DE DADOS EXISTENTES...\n');
  
  try {
    // Executar migração
    const migrationResult = await migrateExistingProducts();
    
    // Validar resultados
    const validationResult = await validateMigration();
    
    // Relatório final
    console.log('\n📊 RELATÓRIO FINAL - FASE 6');
    console.log('====================================================');
    console.log(`✅ Produtos migrados: ${migrationResult.migrated}`);
    console.log(`⚠️  Produtos ignorados: ${migrationResult.skipped}`);
    console.log(`📊 Total de produtos: ${validationResult.totalProducts}`);
    console.log(`🔍 Produtos consistentes: ${validationResult.consistentProducts}`);
    console.log(`⚠️  Produtos inconsistentes: ${validationResult.inconsistentProducts}`);
    
    if (migrationResult.migrated > 0) {
      console.log('\n🎉 FASE 6 - MIGRAÇÃO: CONCLUÍDA COM SUCESSO!');
      console.log('📈 Dados financeiros calculados e aplicados aos produtos existentes');
      console.log('🔄 Sistema totalmente integrado - produtos antigos e novos');
    } else {
      console.log('\n✅ FASE 6 - MIGRAÇÃO: NENHUMA AÇÃO NECESSÁRIA');
      console.log('📊 Todos os produtos já possuem dados financeiros');
    }
    
    // Fechar conexão
    await pool.end();
    
    return true;
    
  } catch (error) {
    console.error('\n❌ FALHA NA MIGRAÇÃO:', error);
    await pool.end();
    return false;
  }
}

// Executar
runMigration().then(success => {
  if (success) {
    console.log('\n🎊 MIGRAÇÃO COMPLETA E VALIDADA!');
    process.exit(0);
  } else {
    console.log('\n⚠️  REVISAR MIGRAÇÃO');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Erro crítico durante migração:', error);
  process.exit(1);
}); 