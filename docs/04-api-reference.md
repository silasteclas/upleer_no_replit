# API Reference

## Base URL

```
Development: http://localhost:5000/api
Production: https://seu-dominio.com/api
```

## Autenticação

A API usa autenticação baseada em sessões com cookies HTTP-only.

### Headers Requeridos

```http
Content-Type: application/json
Cookie: connect.sid=...
```

## Endpoints

### Autenticação

#### POST /auth/register
Registra um novo usuário.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "firstName": "João",
  "lastName": "Silva"
}
```

**Response:**
```json
{
  "message": "Cadastro realizado com sucesso",
  "user": {
    "id": "123",
    "email": "usuario@email.com",
    "firstName": "João",
    "lastName": "Silva"
  }
}
```

#### POST /auth/login
Autentica um usuário.

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": "123",
    "email": "usuario@email.com",
    "firstName": "João",
    "lastName": "Silva"
  }
}
```

#### GET /auth/user
Retorna o usuário autenticado atual.

**Response:**
```json
{
  "user": {
    "id": "123",
    "email": "usuario@email.com",
    "firstName": "João",
    "lastName": "Silva",
    "role": "author",
    "profileImageUrl": "/uploads/..."
  }
}
```

#### POST /auth/logout
Faz logout do usuário atual.

**Response:**
```json
{
  "message": "Logout realizado com sucesso"
}
```

### Produtos

#### POST /products
Cria um novo produto. **Requer autenticação.**

**Request:** `multipart/form-data`
```
pdf: arquivo PDF (obrigatório)
cover: imagem de capa (opcional)
title: string (obrigatório)
description: string
author: string (obrigatório)
isbn: string
coAuthors: string
genre: string (obrigatório)
language: string (default: "português")
targetAudience: string
pageCount: number
baseCost: number
salePrice: number (obrigatório)
```

**Response:**
```json
{
  "id": 1,
  "title": "Meu Livro",
  "author": "João Silva",
  "status": "pending",
  "pdfUrl": "/uploads/...",
  "coverImageUrl": "/uploads/...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### GET /products
Lista produtos do autor autenticado. **Requer autenticação.**

**Response:**
```json
[
  {
    "id": 1,
    "title": "Meu Livro",
    "author": "João Silva",
    "status": "pending",
    "salePrice": "29.90",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /products/:id
Retorna detalhes de um produto. **Requer autenticação e ser o autor.**

**Response:**
```json
{
  "id": 1,
  "title": "Meu Livro",
  "description": "Descrição completa...",
  "author": "João Silva",
  "isbn": "978-3-16-148410-0",
  "genre": "ficção",
  "language": "português",
  "pageCount": 200,
  "baseCost": "10.00",
  "salePrice": "29.90",
  "marginPercent": 150,
  "status": "pending",
  "pdfUrl": "/uploads/...",
  "coverImageUrl": "/uploads/...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### PATCH /products/:id
Atualiza um produto. **Requer autenticação e ser o autor.**

**Request Body:**
```json
{
  "title": "Novo Título",
  "description": "Nova descrição",
  "salePrice": "39.90"
}
```

### Vendas

#### GET /sales
Lista vendas do autor autenticado. **Requer autenticação.**

**Response:**
```json
[
  {
    "id": 1,
    "productId": 1,
    "product": {
      "title": "Meu Livro",
      "author": "João Silva"
    },
    "buyerName": "Maria Oliveira",
    "buyerEmail": "maria@email.com",
    "salePrice": "29.90",
    "commission": "4.49",
    "authorEarnings": "25.41",
    "paymentStatus": "aprovado",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /sales/:id
Retorna detalhes de uma venda. **Requer autenticação e ser o autor do produto.**

### Estatísticas

#### GET /stats
Retorna estatísticas do autor. **Requer autenticação.**

**Response:**
```json
{
  "totalSales": 42,
  "totalRevenue": 1067.22,
  "activeProducts": 5,
  "pendingProducts": 2
}
```

#### GET /sales/data
Retorna dados de vendas para gráficos. **Requer autenticação.**

**Query Parameters:**
- `months`: número de meses (default: 12)

**Response:**
```json
[
  {
    "month": "2024-01",
    "sales": 10,
    "revenue": 254.10
  }
]
```

### Webhooks (Públicos)

#### POST /webhook/sales
Recebe notificação de venda. **Não requer autenticação.**

**Request Body:**
```json
{
  "productId": 1,
  "buyerName": "Maria Oliveira",
  "buyerEmail": "maria@email.com",
  "buyerPhone": "11999999999",
  "buyerCpf": "12345678900",
  "buyerAddress": "Rua A, 123",
  "buyerCity": "São Paulo",
  "buyerState": "SP",
  "buyerZipCode": "01234-567",
  "salePrice": 29.90,
  "orderDate": "2024-01-01T00:00:00.000Z",
  "paymentStatus": "aprovado",
  "paymentMethod": "cartao_credito",
  "installments": 1
}
```

#### PATCH /webhook/products/:id/status
Atualiza status de um produto. **Não requer autenticação.**

**Request Body:**
```json
{
  "status": "published",
  "publicUrl": "https://loja.com/produto/123"
}
```

### Downloads (Públicos)

#### GET /uploads/:filename
Download direto de arquivo.

#### GET /api/pdf/:filename
Visualização de PDF.

#### GET /api/download/:type/:filename
Download com tipo específico.

**Parâmetros:**
- `type`: 'pdf', 'cover', ou 'image'
- `filename`: nome do arquivo

### Usuário

#### PATCH /user/profile
Atualiza perfil do usuário. **Requer autenticação.**

**Request Body:**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "phone": "11999999999"
}
```

#### POST /user/profile-image
Atualiza foto de perfil. **Requer autenticação.**

**Request:** `multipart/form-data`
```
profileImage: arquivo de imagem
```

## Códigos de Status

- `200 OK`: Sucesso
- `201 Created`: Recurso criado
- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Não autenticado
- `403 Forbidden`: Sem permissão
- `404 Not Found`: Recurso não encontrado
- `500 Internal Server Error`: Erro do servidor

## Tratamento de Erros

Todos os erros retornam no formato:

```json
{
  "message": "Descrição do erro"
}
```

## Limites de Rate

- Upload de arquivos: 100MB para PDFs, 2MB para imagens
- Requisições por minuto: Sem limite implementado atualmente

## CORS

Em desenvolvimento, CORS está habilitado para `localhost`.
Em produção, configurar domínios permitidos. 