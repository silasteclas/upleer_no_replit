# Endpoints de Produtos e Vendas

## Visão Geral

Este documento detalha todos os endpoints relacionados ao gerenciamento de produtos e processamento de vendas no sistema Upleer, incluindo os webhooks para integração com N8N e sistemas externos.

## Índice

1. [Endpoints de Produtos](#endpoints-de-produtos)
2. [Endpoints de Vendas](#endpoints-de-vendas)
3. [Webhooks de Integração](#webhooks-de-integracao)
4. [Estruturas de Dados](#estruturas-de-dados)
5. [Exemplos de Uso](#exemplos-de-uso)
6. [Configuração N8N](#configuracao-n8n)

---

## Endpoints de Produtos

### POST /api/products
**Descrição**: Cria um novo produto (e-book) no sistema.

**Autenticação**: Requerida (autor logado)

**Content-Type**: `multipart/form-data`

**Parâmetros**:
```javascript
{
  title: string,           // Título do livro (obrigatório)
  description: string,     // Descrição do livro
  author: string,          // Nome do autor (obrigatório)
  isbn: string,           // ISBN (opcional)
  coAuthors: string,      // Co-autores (opcional)
  genre: string,          // Gênero/categoria (obrigatório)
  language: string,       // Idioma (padrão: "português")
  targetAudience: string, // Público-alvo (opcional)
  pageCount: number,      // Número de páginas
  baseCost: string,       // Custo base
  salePrice: string,      // Preço de venda (obrigatório)
  pdf: File,             // Arquivo PDF (upload)
  cover: File            // Imagem da capa (upload)
}
```

**Resposta de Sucesso (201)**:
```json
{
  "id": 19,
  "title": "Comandos Elétricos Industrial",
  "author": "Samuel Reis",
  "authorId": "user_1750970151254_5uo1e69u5",
  "pdfUrl": "https://supabase.co/storage/v1/object/public/...",
  "coverImageUrl": "https://supabase.co/storage/v1/object/public/...",
  "status": "pending",
  "salePrice": "89.90",
  "createdAt": "2025-01-14T10:00:00Z"
}
```

**Características Especiais**:
- Upload automático para Supabase Storage
- URLs públicas geradas automaticamente
- Webhook automático enviado para N8N após criação
- Status inicial sempre "pending"

### GET /api/products
**Descrição**: Lista todos os produtos do autor autenticado.

**Autenticação**: Requerida

**Resposta**:
```json
[
  {
    "id": 19,
    "title": "Comandos Elétricos Industrial",
    "author": "Samuel Reis",
    "authorId": "user_1750970151254_5uo1e69u5",
    "pdfUrl": "https://supabase.co/storage/v1/object/public/...",
    "coverImageUrl": "https://supabase.co/storage/v1/object/public/...",
    "status": "published",
    "salePrice": "89.90",
    "accessUrls": {
      "pdfDirect": "https://...",
      "pdfDownload": "https://...",
      "coverDirect": "https://...",
      "productDetails": "https://..."
    }
  }
]
```

### GET /api/products/:id
**Descrição**: Obtém detalhes de um produto específico.

**Autenticação**: Requerida (apenas produtos do próprio autor)

### PATCH /api/products/:id
**Descrição**: Atualiza um produto existente.

**Autenticação**: Requerida (apenas produtos do próprio autor)

### GET /api/products/:id/urls
**Descrição**: Obtém URLs de acesso público de um produto (endpoint público).

**Autenticação**: Não requerida

---

## Endpoints de Vendas

### POST /api/webhook/sales
**Descrição**: Registra uma venda individual via webhook.

**Autenticação**: Não requerida (webhook público)

**Content-Type**: `application/json`

**Parâmetros**:
```json
{
  "productId": 19,
  "buyerName": "João Silva",
  "buyerEmail": "joao@email.com",
  "buyerPhone": "+5511999999999",
  "buyerCpf": "123.456.789-00",
  "buyerAddress": "Rua das Flores, 123",
  "buyerCity": "São Paulo",
  "buyerState": "SP",
  "buyerZipCode": "01234-567",
  "salePrice": "89.90",
  "orderDate": "2025-01-14T15:30:00Z",
  "paymentStatus": "aprovado",
  "paymentMethod": "cartao_credito",
  "installments": 1,
  "discountCoupon": "DESCONTO10",
  "discountAmount": "8.99",
  "shippingCost": "0.00",
  "shippingCarrier": "",
  "deliveryDays": 0
}
```

**Resposta de Sucesso (200)**:
```json
{
  "message": "Venda registrada com sucesso",
  "sale": {
    "id": 7,
    "productId": 19,
    "productTitle": "Comandos Elétricos Industrial",
    "authorId": "user_1750970151254_5uo1e69u5",
    "authorName": "Samuel Reis",
    "buyerName": "João Silva",
    "buyerEmail": "joao@email.com",
    "salePrice": "89.90",
    "commission": "13.49",
    "authorEarnings": "76.42",
    "orderDate": "2025-01-14T15:30:00Z",
    "paymentStatus": "aprovado"
  }
}
```

### POST /api/webhook/sales/batch
**Descrição**: Processa múltiplas vendas de um mesmo pedido (multi-autor).

**Autenticação**: Não requerida (webhook público)

**Content-Type**: `application/json`

**Parâmetros**:
```json
[
  {
    "order_id": 1739350610,
    "id_autor": "user_1750970151254_5uo1e69u5",
    "produtos": [
      {
        "id_produto_interno": "19",
        "nome": "Comandos Elétricos Industrial",
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
        "nome": "Ar Condicionado Split",
        "preco": 86.67,
        "quantidade": 1
      }
    ],
    "valor_total": "86.67",
    "cliente_nome": "Silas Silva",
    "cliente_email": "silasteclas@gmail.com"
  }
]
```

**Resposta de Sucesso (200)**:
```json
{
  "message": "Processamento concluído: 2 vendas criadas",
  "orderId": 1739350610,
  "totalSales": 2,
  "totalErrors": 0,
  "sales": [
    {
      "saleId": 7,
      "orderId": 1739350610,
      "authorId": "user_1750970151254_5uo1e69u5",
      "productId": 19,
      "productTitle": "Comandos Elétricos Industrial",
      "authorName": "Samuel Reis",
      "quantity": 1,
      "unitPrice": "73.37",
      "totalPrice": "73.37",
      "commission": "11.01",
      "authorEarnings": "62.36",
      "buyerName": "Silas Silva",
      "buyerEmail": "silasteclas@gmail.com"
    },
    {
      "saleId": 8,
      "orderId": 1739350610,
      "authorId": "user_1751330180522_x4shzkcl7",
      "productId": 20,
      "productTitle": "Ar Condicionado Split",
      "authorName": "Maria Ferreira",
      "quantity": 1,
      "unitPrice": "86.67",
      "totalPrice": "86.67",
      "commission": "13.00",
      "authorEarnings": "73.67",
      "buyerName": "Silas Silva",
      "buyerEmail": "silasteclas@gmail.com"
    }
  ]
}
```

**Características Especiais**:
- Processa múltiplas vendas atomicamente
- Calcula comissões automaticamente (15% padrão)
- Armazena Order ID para rastreamento
- Suporta diferentes formatos de payload do N8N

### GET /api/sales
**Descrição**: Lista vendas do autor autenticado.

**Autenticação**: Requerida

**Resposta**:
```json
[
  {
    "id": 7,
    "productId": 19,
    "buyerName": "João Silva",
    "buyerEmail": "joao@email.com",
    "salePrice": "89.90",
    "commission": "13.49",
    "authorEarnings": "76.42",
    "paymentStatus": "aprovado",
    "createdAt": "2025-01-14T15:30:00Z",
    "product": {
      "title": "Comandos Elétricos Industrial",
      "author": "Samuel Reis"
    }
  }
]
```

---

## Webhooks de Integração

### PATCH /api/webhook/products/:id/status
**Descrição**: Atualiza status de um produto via webhook (usado pelo N8N).

**Autenticação**: Não requerida (webhook público)

**Parâmetros**:
```json
{
  "status": "published",
  "publicUrl": "https://loja.com/produto/123"
}
```

**Status Válidos**:
- `pending`: Aguardando aprovação
- `published`: Publicado na loja
- `rejected`: Rejeitado
- `archived`: Arquivado

**Resposta**:
```json
{
  "message": "Status do produto atualizado com sucesso",
  "product": {
    "id": 19,
    "status": "published",
    "publicUrl": "https://loja.com/produto/123",
    "title": "Comandos Elétricos Industrial",
    "author": "Samuel Reis"
  }
}
```

---

## Estruturas de Dados

### Produto
```typescript
interface Product {
  id: number;
  authorId: string;
  title: string;
  description: string;
  isbn?: string;
  author: string;
  coAuthors?: string;
  genre: string;
  language: string;
  targetAudience?: string;
  pdfUrl: string;
  coverImageUrl?: string;
  pageCount: number;
  baseCost: string;
  salePrice: string;
  marginPercent: number;
  status: 'pending' | 'published' | 'rejected' | 'archived';
  publicUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Venda
```typescript
interface Sale {
  id: number;
  productId: number;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string;
  buyerCpf?: string;
  buyerAddress?: string;
  buyerCity?: string;
  buyerState?: string;
  buyerZipCode?: string;
  salePrice: string;
  commission: string;
  authorEarnings: string;
  orderDate?: Date;
  paymentStatus: string;
  paymentMethod?: string;
  installments: number;
  discountCoupon?: string;
  discountAmount: string;
  shippingCost: string;
  shippingCarrier?: string;
  deliveryDays: number;
  createdAt: Date;
}
```

---

## Exemplos de Uso

### 1. Criar Produto com Upload
```javascript
const formData = new FormData();
formData.append('title', 'Meu E-book');
formData.append('author', 'João Autor');
formData.append('genre', 'Técnico');
formData.append('salePrice', '49.90');
formData.append('pdf', pdfFile);
formData.append('cover', imageFile);

const response = await fetch('/api/products', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

### 2. Registrar Venda Individual
```javascript
const saleData = {
  productId: 19,
  buyerName: "Maria Silva",
  buyerEmail: "maria@email.com",
  salePrice: "89.90",
  paymentStatus: "aprovado"
};

const response = await fetch('/api/webhook/sales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(saleData)
});
```

### 3. Processar Vendas em Lote
```javascript
const batchSales = [
  {
    order_id: 1739350610,
    id_autor: "user_123",
    produtos: [{ id_produto_interno: "19", preco: 89.90, quantidade: 1 }],
    cliente_nome: "Cliente Teste",
    cliente_email: "teste@email.com"
  }
];

const response = await fetch('/api/webhook/sales/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(batchSales)
});
```

---

## Configuração N8N

### Webhook de Produtos
**URL**: `https://seu-dominio.com/webhook/novo_produto`
**Método**: POST
**Payload**: Produto criado automaticamente

### Webhook de Status
**URL**: `https://seu-dominio.com/api/webhook/products/{ID}/status`
**Método**: PATCH
**Payload**: `{ "status": "published", "publicUrl": "..." }`

### Webhook de Vendas Batch
**URL**: `https://seu-dominio.com/api/webhook/sales/batch`
**Método**: POST
**Body N8N**: `{{ $input.first().json.data }}`

### Configuração Completa N8N
```json
{
  "method": "POST",
  "url": "https://seu-ngrok-url.ngrok-free.app/api/webhook/sales/batch",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{{ $input.first().json.data }}"
}
```

---

## Cálculos Automáticos

### Comissões
- **Taxa padrão**: 15% sobre o valor da venda
- **Ganho do autor**: 85% do valor da venda
- **Cálculo automático**: Aplicado em todos os endpoints de venda

### Exemplo:
```
Venda: R$ 100,00
Comissão (15%): R$ 15,00
Ganho Autor (85%): R$ 85,00
```

---

## Tratamento de Erros

### Códigos de Status Comuns
- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Dados inválidos
- **401**: Não autenticado
- **403**: Acesso negado
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

### Exemplo de Erro
```json
{
  "message": "productId é obrigatório",
  "error": "Validation failed"
}
```

---

## Logs e Monitoramento

### Logs de Webhook
```
[WEBHOOK] New sale created: ID 7 for product 19 (author: user_123)
[WEBHOOK-BATCH] Processing 2 sales for order 1739350610
[WEBHOOK-BATCH] Sale created: ID 7 for product 19 (author: user_123)
```

### Logs de Upload
```
[PRODUCTS] PDF uploaded to Supabase: https://...
[PRODUCTS] Cover uploaded to Supabase: https://...
[PRODUCTS] Product created successfully: 19
```

---

## Segurança

### Endpoints Protegidos
- Todos os endpoints `/api/products/*` (exceto `/api/products/:id/urls`)
- Todos os endpoints `/api/sales` (exceto webhooks)

### Endpoints Públicos (Webhooks)
- `/api/webhook/sales`
- `/api/webhook/sales/batch`
- `/api/webhook/products/:id/status`
- `/api/products/:id/urls`

### Validações
- Verificação de propriedade (autor só acessa seus produtos)
- Validação de dados obrigatórios
- Sanitização de uploads
- Verificação de tipos de arquivo (PDF, imagens) 