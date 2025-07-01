require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkMappingTable() {
  try {
    // Verificar se a tabela existe e suas colunas
    const tableQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produto_nuvemshop_mapping'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(tableQuery);
    
    if (result.rows.length > 0) {
      console.log('📋 Estrutura da tabela produto_nuvemshop_mapping:');
      result.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}`);
      });
      
      // Tentar consulta simples
      const dataQuery = `SELECT * FROM produto_nuvemshop_mapping LIMIT 3`;
      const dataResult = await pool.query(dataQuery);
      
      console.log(`\n📊 Dados da tabela (${dataResult.rows.length} registros encontrados):`);
      dataResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}.`, row);
      });
      
    } else {
      console.log('❌ Tabela produto_nuvemshop_mapping não encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkMappingTable();