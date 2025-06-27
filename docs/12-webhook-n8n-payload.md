# Webhook N8N - Payload de Novos Produtos

## Visão Geral

Quando um produto é cadastrado no Upleer, um webhook é automaticamente enviado para o N8N na URL de produção para processar e integrar o produto nos sistemas externos.

## URL do Webhook

**Produção**: `https://auton8n.upleer.com.br/webhook/novo_produto`

## Headers Enviados

```http
Content-Type: application/json
User-Agent: Upleer-Webhook/1.0
X-Webhook-Source: upleer-local
X-Product-ID: {product.id}
```

## Payload Completo

O webhook envia um payload JSON com todas as informações do produto:

```json
{
  "id": 4,
  "title": "Nome do Produto",
  "description": "Descrição detalhada do produto",
  "author": "Nome do Autor",
  "isbn": "978-0000000000",
  "coAuthors": "Co-autores do livro",
  "genre": "profissionalizante",
  "language": "português",
  "targetAudience": "Público-alvo",
  "pageCount": 143,
  "baseCost": "21.45",
  "salePrice": "56.70",
  "marginPercent": 150,
  "status": "pending",
  "authorId": "user_1750970151254_5uo1e69u5",
  "pdfUrl": "/uploads/760d2369032fc23ca6889633507ab949",
  "coverImageUrl": "/uploads/cc559d19bc8b675060b9db4cf3dcd562",
  "publicUrl": null,
  "createdAt": "2025-06-26T20:55:23.727Z",
  "updatedAt": "2025-06-26T20:55:23.727Z",
  "downloadUrls": {
    "productDetails": "http://localhost:3000/api/products/4",
    "pdfDownload": "http://localhost:3000/api/pdf/760d2369032fc23ca6889633507ab949",
    "pdfDirect": "http://localhost:3000/uploads/760d2369032fc23ca6889633507ab949",
    "coverDownload": "http://localhost:3000/api/download/cover/cc559d19bc8b675060b9db4cf3dcd562"
  },
  "metadata": {
    "source": "upleer_local",
    "environment": "development",
    "timestamp": "2025-06-26T20:55:23.727Z",
    "fileInfo": {
      "pdfSize": "unknown",
      "coverSize": "unknown",
      "pdfFilename": "760d2369032fc23ca6889633507ab949",
      "coverFilename": "cc559d19bc8b675060b9db4cf3dcd562"
    }
  }
}
```

## Campos Principais

### Informações do Produto
- **id**: ID único do produto no banco de dados
- **title**: Título do produto
- **description**: Descrição detalhada
- **author**: Nome do autor principal
- **isbn**: Código ISBN (opcional)
- **coAuthors**: Co-autores (opcional)
- **genre**: Gênero/categoria do livro
- **language**: Idioma (padrão: português)
- **targetAudience**: Público-alvo

### Detalhes Técnicos
- **pageCount**: Número de páginas
- **baseCost**: Custo base do produto
- **salePrice**: Preço de venda
- **marginPercent**: Porcentagem de margem
- **status**: Status atual (pending, published, etc.)

### Arquivos e URLs
- **pdfUrl**: Caminho relativo do arquivo PDF
- **coverImageUrl**: Caminho relativo da capa
- **downloadUrls**: URLs completas para download
  - **productDetails**: Endpoint para detalhes do produto
  - **pdfDownload**: URL para download do PDF
  - **pdfDirect**: URL direta para o arquivo PDF
  - **coverDownload**: URL para download da capa

### Metadata
- **source**: Origem do webhook (upleer_local)
- **environment**: Ambiente (development/production)
- **timestamp**: Timestamp do envio
- **fileInfo**: Informações dos arquivos uploadados

## Configurações de Segurança

### Timeout
- **Tempo limite**: 10 segundos
- **Comportamento**: Se o webhook falhar, o produto ainda é salvo no banco

### Headers de Identificação
- **X-Webhook-Source**: Identifica origem como Upleer
- **X-Product-ID**: ID do produto para correlação

## Tratamento de Respostas

### Sucesso (2xx)
```json
{
  "status": "received",
  "productId": 4,
  "message": "Product processed successfully"
}
```

### Erro (4xx/5xx)
- O erro é logado mas não impede o salvamento do produto
- Produto fica disponível para reprocessamento

## Logs de Debug

O sistema registra logs detalhados:

```
[WEBHOOK] Sending product 4 to N8N webhook...
[WEBHOOK] Sending to: https://auton8n.upleer.com.br/webhook/novo_produto
[WEBHOOK] Product data summary: { id: 4, title: "...", author: "...", hasFiles: {...} }
[WEBHOOK] Response status: 200
[WEBHOOK] ✅ Product 4 sent successfully to N8N
```

## Exemplo de Configuração N8N

O N8N deve estar configurado para:

1. **Receber o webhook** na URL `/webhook/novo_produto`
2. **Processar o payload** JSON completo
3. **Retornar confirmação** com status 200
4. **Baixar arquivos** usando as URLs fornecidas
5. **Atualizar sistemas externos** conforme necessário

## URLs de Ambiente

### Desenvolvimento
- Base URL: `http://localhost:3000`
- Arquivos: `http://localhost:3000/uploads/{filename}`

### Produção (quando configurado)
- Base URL: Configurada via `process.env.BASE_URL`
- Arquivos: `{BASE_URL}/uploads/{filename}`

## Configuração de Ambiente

Para produção, configurar no `.env`:

```env
BASE_URL=https://sua-url-de-producao.com
NODE_ENV=production
```

Para desenvolvimento (padrão):
```env
NODE_ENV=development
PORT=3000
```

## Troubleshooting

### Webhook Não Recebido
1. Verificar se N8N está ativo
2. Confirmar URL do webhook
3. Verificar logs no console do servidor

### Timeout
- Webhook tem 10s de timeout
- Se falhar, produto ainda é salvo
- Verificar conectividade com N8N

### Arquivos Não Acessíveis
- Verificar se servidor está servindo `/uploads`
- Confirmar permissões de arquivo
- Validar URLs geradas 