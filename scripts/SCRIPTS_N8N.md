# Scripts para Envio Manual de Produtos ao N8N

Este documento explica como usar os scripts para enviar produtos existentes do banco de dados para o N8N de forma manual, sem precisar alterar o sistema.

## 📋 Scripts Disponíveis

### 1. `list_products.cjs` - Listar Produtos
Lista todos os produtos cadastrados no banco de dados.

```bash
node list_products.cjs
```

**Saída:**
- Tabela com ID, título, autor, gênero, status, preço, se tem capa/PDF e data
- Instruções de como usar os outros scripts

### 2. `resend_single_product.cjs` - Reenviar Produto Específico
Envia um produto específico para o N8N usando o ID do produto.

```bash
node resend_single_product.cjs [ID_DO_PRODUTO]
```

**Exemplos:**
```bash
node resend_single_product.cjs 15
node resend_single_product.cjs 3
```

**Saída:**
- Detalhes do produto encontrado
- Status do envio para N8N
- Confirmação de sucesso ou erro

### 3. `resend_products.cjs` - Reenviar Múltiplos Produtos
Envia os últimos 10 produtos do banco para o N8N.

```bash
node resend_products.cjs
```

**Saída:**
- Lista dos produtos encontrados
- Status de envio de cada produto
- Relatório final com sucessos e falhas

## 🚀 Fluxo de Uso Recomendado

### Passo 1: Listar Produtos Disponíveis
```bash
node list_products.cjs
```

### Passo 2: Escolher e Enviar Produto
```bash
# Para um produto específico
node resend_single_product.cjs 15

# Para vários produtos
node resend_products.cjs
```

### Passo 3: Verificar N8N
- Acesse o N8N e verifique se os dados chegaram
- Os dados aparecerão com `source: "manual_resend"` ou `source: "manual_single_resend"`

## 📊 Exemplo de Uso Completo

```bash
# 1. Ver produtos disponíveis
C:\projeto> node list_products.cjs
📋 PRODUTOS CADASTRADOS NO BANCO
=================================
✅ Encontrados 15 produtos

ID  | Título                      | Autor     | Status    | Preço
15  | asfasf                      | fasfasf   | pending   | R$ 51.90
14  | asf                         | Silas     | pending   | R$ 57.40
...

# 2. Enviar produto específico
C:\projeto> node resend_single_product.cjs 15
🎯 REENVIANDO PRODUTO 15 PARA N8N
======================================
✅ Produto encontrado:
   📦 Título: asfasf
   👤 Autor: fasfasf
   📊 Status: pending
   💰 Preço: R$ 51.90
   🖼️ Capa: Sim
   📄 PDF: Sim

📤 Enviando para N8N...
✅ SUCESSO!
   Status: 200
   Resposta: {"message":"Workflow was started"}

🎯 Concluído! Verifique o N8N.
```

## 🔧 Dados Enviados

Os scripts enviam exatamente os mesmos dados que o sistema normal, incluindo:

- **Informações do produto**: ID, título, descrição, autor, etc.
- **URLs públicas**: `coverImageUrl` com URL completa (`http://localhost:5000/uploads/...`)
- **URLs de download**: Para PDF, capa e detalhes do produto
- **Metadata especial**: Marca que foi um reenvio manual

### Exemplo de Payload Enviado:
```json
{
  "id": 15,
  "title": "asfasf",
  "author": "fasfasf",
  "coverImageUrl": "http://localhost:5000/uploads/063c10432fac32ab2f5a790686ca0b4f",
  "downloadUrls": {
    "productDetails": "http://localhost:5000/api/products/15",
    "pdfDownload": "http://localhost:5000/api/pdf/filename",
    "coverDownload": "http://localhost:5000/api/download/cover/filename"
  },
  "metadata": {
    "source": "manual_single_resend",
    "timestamp": "2025-06-29T03:52:07.000Z",
    "resent": true
  }
}
```

## ⚡ Vantagens dos Scripts

### ✅ **Rapidez**
- Não precisa cadastrar novos produtos
- Usa dados reais já salvos no banco
- Envio direto sem interface

### ✅ **Flexibilidade**
- Enviar produto específico por ID
- Enviar múltiplos produtos de uma vez
- Ver lista completa antes de enviar

### ✅ **Segurança**
- Não altera dados no banco
- Apenas lê e reenvia
- Mesma estrutura do sistema original

### ✅ **Debug**
- Logs detalhados de cada envio
- Status de resposta do N8N
- Identificação de falhas

## 🛠️ Configuração

### Pré-requisitos:
- Node.js instalado
- Arquivo `.env` configurado
- Banco de dados acessível
- Servidor rodando (para URLs funcionarem)

### Dependências:
Os scripts usam as mesmas dependências do projeto:
- `@neondatabase/serverless`
- `dotenv`
- `fetch` (nativo do Node.js 18+)

## 🐛 Resolução de Problemas

### Erro: "Produto não encontrado"
- Verifique se o ID existe usando `list_products.cjs`
- Confirme conexão com banco de dados

### Erro: "fetch failed"
- Verifique se o webhook URL está correto
- Confirme conectividade com internet
- Teste o webhook manualmente

### Erro: "DATABASE_URL must be set"
- Verifique arquivo `.env`
- Confirme variável `DATABASE_URL`

### URLs não funcionam (404)
- Confirme se servidor está rodando (`npm run dev`)
- Verifique se está na porta correta (5000)
- Teste URL manualmente no browser

## 📝 Logs e Debugging

### Headers Especiais Enviados:
- `X-Webhook-Source: manual-single` ou `manual-resend`
- `X-Product-ID: [ID]`
- `Content-Type: application/json`

### Metadata de Identificação:
- `source: "manual_single_resend"` (produto único)
- `source: "manual_resend_script"` (múltiplos produtos)
- `resent: true`
- `timestamp`: Data/hora do reenvio

## 🎯 Casos de Uso

### Para Testes:
```bash
# Testar com produto específico
node resend_single_product.cjs 15
```

### Para Migração:
```bash
# Reenviar vários produtos
node resend_products.cjs
```

### Para Debug:
```bash
# Ver todos os produtos primeiro
node list_products.cjs
# Depois testar com um específico
node resend_single_product.cjs [ID]
```

---

**💡 Dica:** Use estes scripts sempre que precisar testar o N8N com dados reais sem precisar cadastrar novos produtos! 