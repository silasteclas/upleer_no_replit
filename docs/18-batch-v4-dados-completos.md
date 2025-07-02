# Endpoint Batch V4 - Dados Completos do N8N

## Resumo da Implementação

O endpoint `/api/webhook/sales/batch` foi expandido para capturar e armazenar **todos os novos campos** enviados pelo N8N, incluindo informações completas do cliente, endereço, pagamento e fotos dos produtos.

## Novos Campos Implementados

### 📋 Campos do Cliente
- `cliente_cpf`: CPF do cliente
- `cliente_telefone`: Telefone com código do país

### 🏠 Campos de Endereço
- `endereco.rua`: Nome da rua
- `endereco.numero`: Número do endereço
- `endereco.bairro`: Bairro
- `endereco.cidade`: Cidade
- `endereco.estado`: Estado
- `endereco.cep`: CEP
- `endereco.complemento`: Complemento (opcional)

### 💳 Campos de Pagamento/Envio
- `forma_pagamento`: Forma de pagamento (pix, cartao_credito, boleto)
- `bandeira_cartao`: Bandeira do cartão (visa, mastercard, etc.)
- `parcelas`: Número de parcelas
- `status_pagamento`: Status do pagamento (pending, approved, etc.)
- `status_envio`: Status do envio (unpacked, processing, shipped, etc.)

### 📸 Campos dos Produtos
- `foto_produto`: URL da imagem do produto

## Estrutura do Payload N8N

```json
{
  "data": [
    {
      "order_id": "1739993213",
      "id_autor": "user_xxx",
      "produtos": [
        {
          "id_produto_interno": "19",
          "nome": "Produto X",
          "preco": 73.37,
          "quantidade": 3,
          "foto_produto": "https://url-da-imagem.png"
        }
      ],
      "valor_total": "220.11",
      
      // NOVOS CAMPOS DO CLIENTE
      "cliente_nome": "Silas Silva",
      "cliente_email": "silasteclas@gmail.com", 
      "cliente_cpf": "05729473303",
      "cliente_telefone": "+5598984835979",
      
      // NOVOS CAMPOS DE ENDEREÇO
      "endereco": {
        "rua": "Rua X", 
        "numero": "262", 
        "bairro": "Y",
        "cidade": "Rio de Janeiro", 
        "estado": "Rio de Janeiro", 
        "cep": "21240120", 
        "complemento": ""
      },
      
      // NOVOS CAMPOS DE PAGAMENTO/ENVIO
      "forma_pagamento": "pix",
      "bandeira_cartao": "pix", 
      "parcelas": "1",
      "status_pagamento": "pending",
      "status_envio": "unpacked"
    }
  ]
}
```

## Mudanças no Banco de Dados

### Tabela `orders` - Novos Campos
```sql
ALTER TABLE "orders" ADD COLUMN "cliente_cpf" varchar;
ALTER TABLE "orders" ADD COLUMN "cliente_telefone" varchar;
ALTER TABLE "orders" ADD COLUMN "endereco_rua" varchar;
ALTER TABLE "orders" ADD COLUMN "endereco_numero" varchar;
ALTER TABLE "orders" ADD COLUMN "endereco_bairro" varchar;
ALTER TABLE "orders" ADD COLUMN "endereco_cidade" varchar;
ALTER TABLE "orders" ADD COLUMN "endereco_estado" varchar;
ALTER TABLE "orders" ADD COLUMN "endereco_cep" varchar;
ALTER TABLE "orders" ADD COLUMN "endereco_complemento" varchar;
ALTER TABLE "orders" ADD COLUMN "forma_pagamento" varchar;
ALTER TABLE "orders" ADD COLUMN "bandeira_cartao" varchar;
ALTER TABLE "orders" ADD COLUMN "parcelas" varchar;
ALTER TABLE "orders" ADD COLUMN "status_pagamento" varchar;
ALTER TABLE "orders" ADD COLUMN "status_envio" varchar;
```

### Tabela `sale_items` - Novo Campo
```sql
ALTER TABLE "sale_items" ADD COLUMN "foto_produto" varchar;
```

## Implementação no Endpoint

### 1. Extração dos Novos Campos
```javascript
// NOVOS CAMPOS DO CLIENTE
const clienteCpf = firstItem.cliente_cpf || '';
const clienteTelefone = firstItem.cliente_telefone || '';

// NOVOS CAMPOS DE ENDEREÇO
const endereco = firstItem.endereco || {};
const enderecoRua = endereco.rua || '';
const enderecoNumero = endereco.numero || '';
// ... demais campos de endereço

// NOVOS CAMPOS DE PAGAMENTO/ENVIO
const formaPagamento = firstItem.forma_pagamento || '';
const bandeiraCartao = firstItem.bandeira_cartao || '';
const parcelas = firstItem.parcelas || '1';
const statusPagamento = firstItem.status_pagamento || 'pending';
const statusEnvio = firstItem.status_envio || 'unpacked';
```

### 2. Criação do Order com Dados Completos
```javascript
await storage.createOrder({
  id: orderId.toString(),
  clienteNome: clienteNome,
  clienteEmail: clienteEmail,
  // NOVOS CAMPOS DO CLIENTE
  clienteCpf: clienteCpf,
  clienteTelefone: clienteTelefone,
  // CAMPOS DE ENDEREÇO
  enderecoRua: enderecoRua,
  enderecoNumero: enderecoNumero,
  enderecoCidade: enderecoCidade,
  enderecoEstado: enderecoEstado,
  enderecoCep: enderecoCep,
  // NOVOS CAMPOS DE PAGAMENTO/ENVIO
  formaPagamento: formaPagamento,
  bandeiraCartao: bandeiraCartao,
  parcelas: parcelas,
  statusPagamento: statusPagamento,
  statusEnvio: statusEnvio,
  // ... demais campos
});
```

### 3. Criação da Sale com Dados do Cliente
```javascript
const saleData = {
  // ... campos existentes
  buyerName: cliente_nome,
  buyerEmail: cliente_email,
  // NOVOS CAMPOS DO CLIENTE
  buyerPhone: clienteTelefone,
  buyerCpf: clienteCpf,
  buyerAddress: `${enderecoRua}, ${enderecoNumero}${enderecoComplemento ? ', ' + enderecoComplemento : ''}`,
  buyerCity: enderecoCidade,
  buyerState: enderecoEstado,
  buyerZipCode: enderecoCep,
  // NOVOS CAMPOS DE PAGAMENTO
  paymentStatus: statusPagamento === 'pending' ? 'pendente' : 
                statusPagamento === 'approved' ? 'aprovado' : 'pendente',
  paymentMethod: formaPagamento === 'pix' ? 'pix' :
                formaPagamento === 'cartao_credito' ? 'cartao_credito' :
                formaPagamento === 'boleto' ? 'boleto' : 'pix',
  installments: parseInt(parcelas) || 1,
  // ... demais campos
};
```

### 4. Criação dos Sale Items com Foto
```javascript
for (let i = 0; i < vendorProducts.length; i++) {
  const vendorProduct = vendorProducts[i];
  const originalProduct = produtos[i]; // Get original product data from N8N
  
  await storage.createSaleItem({
    saleId: newSale.id,
    productId: vendorProduct.id_produto_interno.toString(),
    productName: vendorProduct.product.title,
    price: vendorProduct.totalPrice.toFixed(2),
    quantity: vendorProduct.quantidade,
    // NOVO CAMPO: Foto do produto do N8N
    fotoProduto: originalProduct?.foto_produto || null
  });
}
```

## Resposta do Endpoint V4

```json
{
  "message": "🎉 MARKETPLACE V4: Processamento concluído com dados completos",
  "orderId": "1739993213",
  "clienteInfo": {
    "nome": "Silas Silva",
    "email": "silasteclas@gmail.com",
    "cpf": "05729473303",
    "telefone": "+5598984835979",
    "endereco": {
      "rua": "Rua X",
      "numero": "262",
      "bairro": "Y",
      "cidade": "Rio de Janeiro",
      "estado": "Rio de Janeiro",
      "cep": "21240120",
      "complemento": ""
    }
  },
  "pagamentoInfo": {
    "forma": "pix",
    "bandeira": "pix",
    "parcelas": "1",
    "status": "pending"
  },
  "envioInfo": {
    "status": "unpacked"
  },
  "totalVendors": 2,
  "totalProducts": 3,
  "totalQuantity": 5,
  "totalValue": "220.11",
  "totalErrors": 0,
  "vendors": [
    // ... dados dos vendedores
  ]
}
```

## Logs de Debug V4

O endpoint agora produz logs mais detalhados:

```
[WEBHOOK-BATCH-V4] 📦 Processing order 1739993213 with 2 vendors
[WEBHOOK-BATCH-V4] 📋 Cliente: Silas Silva (silasteclas@gmail.com)
[WEBHOOK-BATCH-V4] 💳 Pagamento: pix 1x
[WEBHOOK-BATCH-V4] 📍 Endereço: Rio de Janeiro/Rio de Janeiro
[WEBHOOK-BATCH-V4] ✅ Sale created: ID 44 for vendor user_xxx
[WEBHOOK-BATCH-V4] ✅ Sale item created: Produto X (3x)
[WEBHOOK-BATCH-V4] 📸 Product image: https://url-da-imagem.png
```

## Compatibilidade

✅ **Totalmente compatível** com payloads anteriores
✅ **Não quebra** funcionalidades existentes
✅ **Campos opcionais** - se não enviados, usa valores padrão
✅ **Preserva** tabela crítica `produto_nuvemshop_mapping`

## Teste de Validação

Arquivo: `test_batch_v4_complete.cjs`

```bash
node test_batch_v4_complete.cjs
```

### Resultado do Teste
- ✅ Pedido criado com dados completos
- ✅ Venda processada com informações do cliente
- ✅ Sale items criados com foto do produto
- ✅ Numeração sequencial por vendedor mantida
- ✅ Resposta estruturada com todas as informações

## Benefícios da Implementação V4

1. **📋 Dados Completos**: Captura todas as informações do cliente
2. **🏠 Endereço Estruturado**: Armazena endereço completo separadamente
3. **💳 Pagamento Detalhado**: Forma, bandeira, parcelas e status
4. **📸 Imagens dos Produtos**: URLs das fotos para exibição
5. **📊 Rastreabilidade**: Status completo de pagamento e envio
6. **🔄 Compatibilidade**: Funciona com payloads antigos e novos
7. **🚀 Performance**: Processamento otimizado para múltiplos vendedores

## Status da Implementação

✅ **Schema atualizado** com novos campos
✅ **Migration aplicada** no banco de dados  
✅ **Endpoint expandido** para capturar dados completos
✅ **Storage atualizado** para salvar novos campos
✅ **Testes validados** com payload completo
✅ **Logs melhorados** para debug
✅ **Documentação completa** criada

**🎉 MARKETPLACE V4 está pronto para produção!** 