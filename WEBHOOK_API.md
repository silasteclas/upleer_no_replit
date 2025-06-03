# API Webhook - Integração com N8N

## Endpoints Disponíveis

### 1. Listar Produtos Aprovados
**GET** `/api/webhook/products`

Retorna lista de produtos aprovados disponíveis para venda.

**Resposta:**
```json
[
  {
    "id": 8,
    "title": "Matemática Básica",
    "author": "João Silva",
    "salePrice": "89.90",
    "status": "approved"
  }
]
```

### 2. Criar Venda via Webhook
**POST** `/api/webhook/sales`

Cria uma nova venda no sistema com informações completas do cliente.

**Headers:**
```
Content-Type: application/json
```

**Body (obrigatório):**
```json
{
  "productId": 8,
  "buyerEmail": "cliente@email.com",
  "salePrice": "89.90"
}
```

**Body (completo com todas as informações):**
```json
{
  "productId": 8,
  "buyerName": "Maria Silva Santos",
  "buyerEmail": "maria@email.com",
  "buyerPhone": "(11) 99999-9999",
  "buyerCpf": "123.456.789-10",
  "buyerAddress": "Rua das Flores, 123 - Apto 45",
  "buyerCity": "São Paulo",
  "buyerState": "SP",
  "buyerZipCode": "01234-567",
  "salePrice": "89.90",
  "orderDate": "2025-06-03T15:30:00Z",
  "paymentStatus": "aprovado",
  "paymentMethod": "cartao_credito",
  "installments": 3,
  "discountCoupon": "DESCONTO10",
  "discountAmount": "8.99",
  "shippingCost": "15.00",
  "shippingCarrier": "Correios",
  "deliveryDays": 7
}
```

**Resposta de Sucesso (201):**
```json
{
  "message": "Venda criada com sucesso via webhook",
  "sale": {
    "id": 3,
    "productId": 8,
    "buyerEmail": "maria@email.com",
    "salePrice": "89.90",
    "source": "webhook"
  }
}
```

**Resposta de Erro (400):**
```json
{
  "message": "Campos obrigatórios: productId, buyerEmail, salePrice"
}
```

**Resposta de Erro (404):**
```json
{
  "message": "Produto não encontrado"
}
```

## Como Usar no N8N

### Passo 1: Obter Lista de Produtos
1. Crie um nó HTTP Request
2. Método: GET
3. URL: `https://seu-dominio.replit.app/api/webhook/products`
4. Headers: `Content-Type: application/json`

### Passo 2: Criar Venda
1. Crie um nó HTTP Request
2. Método: POST
3. URL: `https://seu-dominio.replit.app/api/webhook/sales`
4. Headers: `Content-Type: application/json`
5. Body: JSON com os dados da venda

### Exemplo de Fluxo N8N
```
Trigger (Webhook/Schedule) 
  → HTTP Request (GET produtos) 
  → Process Data 
  → HTTP Request (POST venda)
  → Success Response
```

## Cálculos Automáticos

O sistema calcula automaticamente:
- **Taxa da plataforma:** 30% do valor da venda
- **Ganhos do autor:** 70% do valor da venda

Exemplo com venda de R$ 89,90:
- Taxa da plataforma: R$ 26,97
- Ganhos do autor: R$ 62,93

## Campos Opcionais vs Obrigatórios

**Obrigatórios:**
- `productId`: ID do produto (número)
- `buyerEmail`: Email do comprador
- `salePrice`: Valor da venda (string com decimais)

**Opcionais:**
- `buyerName`: Nome completo
- `buyerPhone`: Telefone
- `buyerCpf`: CPF
- `buyerAddress`: Endereço
- `buyerCity`: Cidade
- `buyerState`: Estado
- `buyerZipCode`: CEP

## Logs e Monitoramento

Todas as vendas criadas via webhook ficam visíveis no dashboard do autor e podem ser acompanhadas em tempo real na seção "Vendas" do sistema.