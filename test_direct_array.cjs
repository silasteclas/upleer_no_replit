const axios = require('axios');

// Teste com array direto (sem wrapper)
const testPayload = [
  {
    "order_id": 1739350610,
    "id_autor": "user_1750970151254_5uo1e69u5",
    "produtos": [
      {
        "id_produto_interno": "19",
        "nome": "Comandos Elétricos industrial e residencial",
        "preco": 73.37,
        "quantidade": 1
      }
    ],
    "valor_total": "73.37",
    "cliente_nome": "Silas Silva",
    "cliente_email": "silasteclas@gmail.com"
  },
  {
    "order_id": 1739350610,
    "id_autor": "user_1751330180522_x4shzkcl7",
    "produtos": [
      {
        "id_produto_interno": "20",
        "nome": "Ar condicionado Split",
        "preco": 86.67,
        "quantidade": 1
      }
    ],
    "valor_total": "86.67",
    "cliente_nome": "Silas Silva",
    "cliente_email": "silasteclas@gmail.com"
  }
];

async function testDirectArray() {
  try {
    console.log('🚀 Testando array direto...');
    
    const response = await axios.post('http://localhost:5000/api/webhook/sales/batch', testPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Sucesso!');
    console.log('📄 Resposta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testDirectArray(); 