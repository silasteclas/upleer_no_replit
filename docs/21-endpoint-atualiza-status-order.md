# Endpoint PATCH /api/orders/:id/status

## Objetivo

Permitir a atualização dos campos de status de um pedido (order) na tabela `orders`, de forma segura e controlada, atendendo integrações externas (ex: automações de pagamento, N8N) e necessidades administrativas.

## Descrição

Este endpoint permite atualizar, de forma parcial, os seguintes campos de um pedido:
- `status` (campo genérico de status do pedido)
- `status_pagamento` (status do pagamento: ex: pending, approved, rejected)
- `status_envio` (status do envio: ex: unpacked, processing, shipped)

A atualização é feita apenas nos campos enviados no payload. Os demais permanecem inalterados.

## Método e URL

```
PATCH /api/orders/:id/status
```

- `:id` — ID do pedido a ser atualizado (string ou número)

## Payload esperado (JSON)

Envie no body apenas os campos que deseja atualizar. Todos são opcionais, mas pelo menos um deve ser enviado.

```
{
  "status": "novo_status",              // opcional
  "status_pagamento": "novo_status_pagamento", // opcional
  "status_envio": "novo_status_envio"         // opcional
}
```

### Exemplos de payload

Atualizar apenas o status de pagamento:
```
{
  "status_pagamento": "approved"
}
```

Atualizar status de envio e status geral:
```
{
  "status": "processing",
  "status_envio": "shipped"
}
```

## Resposta (200 OK)

```
{
  "message": "Status do pedido atualizado com sucesso",
  "order": {
    // ...dados completos do pedido atualizado
  }
}
```

## Respostas de erro

- `400 Bad Request` — ID do pedido não informado, ou nenhum campo para atualizar enviado
- `404 Not Found` — Pedido não encontrado
- `500 Internal Server Error` — Erro inesperado no servidor

## Observações

- Apenas os campos enviados no body serão atualizados.
- O endpoint não exige autenticação por padrão, mas recomenda-se proteger conforme a política do projeto.
- Os valores aceitos para cada campo devem seguir o padrão já utilizado no sistema (ex: status_pagamento: pending, approved, rejected).

## Exemplo de requisição CURL

```
curl -X PATCH https://<host>/api/orders/123/status \
  -H "Content-Type: application/json" \
  -d '{ "status_pagamento": "approved" }'
```

---

**Este endpoint foi implementado conforme especificação do documento [18-batch-v4-dados-completos.md](18-batch-v4-dados-completos.md).** 

---

## Implementação da função `updateOrder` no storage

Para que o endpoint funcione corretamente, foi implementada a função abaixo no arquivo `server/storage.ts`:

```ts
// Atualiza campos parciais de um pedido (order)
async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
  const [updatedOrder] = await db
    .update(orders)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();
  return updatedOrder;
}
```

**Como funciona:**
- Recebe o `id` do pedido e um objeto `updates` contendo apenas os campos a serem atualizados.
- Atualiza os campos informados na tabela `orders` e define o campo `updatedAt` para a data/hora atual.
- Retorna o registro atualizado do pedido.

**Exemplo de uso interno pelo endpoint:**
```ts
const updatedOrder = await storage.updateOrder(orderId, updates);
```

Essa função segue o padrão das funções de update já existentes para outros recursos do sistema. 