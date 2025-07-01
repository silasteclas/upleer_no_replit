npm r# 14. Testes de Integração N8N

Este documento detalha os procedimentos de teste da integração entre o Upleer e o N8N, incluindo envio de webhooks e validação de acesso aos PDFs.

## Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Teste Manual de Webhook](#teste-manual-de-webhook)
4. [Validação de Acesso aos PDFs](#validação-de-acesso-aos-pdfs)
5. [Script de Teste Automatizado](#script-de-teste-automatizado)
6. [Verificação no N8N](#verificação-no-n8n)
7. [Troubleshooting](#troubleshooting)
8. [Resultados Esperados](#resultados-esperados)

## Visão Geral

A integração N8N permite que produtos cadastrados no Upleer sejam automaticamente enviados para workflows do N8N, que pode então processar esses dados e acessar os PDFs cadastrados.

### Fluxo de Teste
```
1. Produto cadastrado no Upleer
   ↓
2. Webhook automático enviado para N8N
   ↓  
3. N8N recebe payload com URLs
   ↓
4. N8N pode acessar PDFs via URLs fornecidas
   ↓
5. Processamento no workflow N8N
```

## Pré-requisitos

### Sistema Local
- ✅ Upleer rodando em `http://localhost:3000`
- ✅ Banco de dados conectado (Neon PostgreSQL)
- ✅ Produtos existentes no banco
- ✅ Arquivos PDF disponíveis em `/uploads/`

### N8N
- ✅ N8N rodando em `https://auton8n.upleer.com.br`
- ✅ Webhook configurado: `https://auton8n.upleer.com.br/webhook/novo_produto`
- ✅ Workflow preparado para receber payloads

### Configuração
- ✅ Webhook URL configurada no `server/routes.ts`
- ✅ URLs de acesso configuradas corretamente

## Teste Manual de Webhook

### 1. Criação do Script de Teste

Crie um arquivo `test_webhook_n8n.cjs` para testar o envio manual:

```javascript
async function sendTestProductToN8N() {
  const webhookUrl = 'https://auton8n.upleer.com.br/webhook/novo_produto';
  
  // Dados de teste baseados em produto existente
  const testProduct = {
    id: 8,
    title: "TESTE - Apostila de Energia Solar",
    description: "Produto enviado para teste de integração N8N",
    author: "Autor Teste",
    isbn: "978-1234567890",
    coAuthors: "Co-autores teste",
    genre: "profissionalizante",
    language: "português",
    targetAudience: "Profissionais da área",
    pageCount: 250,
    baseCost: "15.00",
    salePrice: "52.00",
    marginPercent: 150,
    status: "pending",
    authorId: "user_test_123",
    pdfUrl: "/uploads/3ce700ed5a743bcdf76ab9750ce99146",
    coverImageUrl: "/uploads/3aecfdba66fc08fc61591406eed3a95c",
    publicUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // URLs de download que o N8N pode usar
    downloadUrls: {
      productDetails: "http://localhost:3000/api/products/8",
      pdfDownload: "http://localhost:3000/api/pdf/3ce700ed5a743bcdf76ab9750ce99146",
      pdfDirect: "http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146", 
      coverDownload: "http://localhost:3000/api/download/cover/3aecfdba66fc08fc61591406eed3a95c"
    },
    
    // Metadata adicional para N8N
    metadata: {
      source: 'upleer_test',
      environment: 'development',
      timestamp: new Date().toISOString(),
      testMode: true,
      fileInfo: {
        pdfSize: 'unknown',
        coverSize: 'unknown', 
        pdfFilename: '3ce700ed5a743bcdf76ab9750ce99146',
        coverFilename: '3aecfdba66fc08fc61591406eed3a95c'
      }
    }
  };

  try {
    console.log('🚀 Enviando produto de teste para N8N...');
    console.log('📡 URL:', webhookUrl);
    console.log('📄 PDF URL:', testProduct.downloadUrls.pdfDirect);
    console.log('📋 Dados do produto:');
    console.log(`   - ID: ${testProduct.id}`);
    console.log(`   - Título: ${testProduct.title}`);
    console.log(`   - Autor: ${testProduct.author}`);
    console.log(`   - Status: ${testProduct.status}`);
    console.log('');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Upleer-Test/1.0',
        'X-Webhook-Source': 'upleer-test',
        'X-Product-ID': testProduct.id.toString(),
        'X-Test-Mode': 'true'
      },
      body: JSON.stringify(testProduct, null, 2)
    });

    const responseText = await response.text();
    
    console.log('📨 RESPOSTA DO N8N:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers));
    
    if (response.ok) {
      console.log('✅ SUCESSO! Produto enviado para N8N');
      console.log(`   Resposta: ${responseText}`);
      
      console.log('');
      console.log('🔗 URLs para testar acesso ao PDF:');
      console.log(`   📄 URL Direta: ${testProduct.downloadUrls.pdfDirect}`);
      console.log(`   🔗 API PDF: ${testProduct.downloadUrls.pdfDownload}`);
      console.log(`   📋 URLs do Produto: http://localhost:3000/api/products/8/urls`);
      
    } else {
      console.log('❌ ERRO ao enviar para N8N');
      console.log(`   Resposta: ${responseText}`);
    }

  } catch (error) {
    console.error('💥 ERRO na requisição:', error.message);
    console.log('🔍 Possíveis causas:');
    console.log('   - N8N não está rodando');
    console.log('   - URL do webhook incorreta');
    console.log('   - Problemas de conectividade');
  }
  
  console.log('');
  console.log('🧪 PRÓXIMOS PASSOS PARA TESTAR:');
  console.log('1. Verificar se o payload chegou no N8N');
  console.log('2. Testar download do PDF via URLs fornecidas');
  console.log('3. Verificar logs do N8N para processamento');
  console.log('4. Acessar dashboard N8N para ver execuções');
}

// Executar o teste
sendTestProductToN8N().catch(console.error);
```

### 2. Execução do Teste

```bash
# Executar o script de teste
node test_webhook_n8n.cjs
```

### 3. Resultado Esperado

```
🚀 Enviando produto de teste para N8N...
📡 URL: https://auton8n.upleer.com.br/webhook/novo_produto
📄 PDF URL: http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146
📋 Dados do produto:
   - ID: 8
   - Título: TESTE - Apostila de Energia Solar
   - Autor: Autor Teste
   - Status: pending

📨 RESPOSTA DO N8N:
   Status: 200 OK
   Headers: {
  connection: 'keep-alive',
  'content-length': '34',
  'content-type': 'application/json; charset=utf-8',
  date: 'Thu, 26 Jun 2025 21:41:49 GMT',
  etag: 'W/"22-6OS7cK0FzqnV2NeDHdOSGS1bVUs"',
  server: 'nginx/1.18.0 (Ubuntu)',
  vary: 'Accept-Encoding'
}
✅ SUCESSO! Produto enviado para N8N
   Resposta: {"message":"Webhook received"}
```

## Validação de Acesso aos PDFs

### 1. Teste via cURL

```bash
# Testar acesso ao PDF via API
curl -I http://localhost:3000/api/pdf/3ce700ed5a743bcdf76ab9750ce99146

# Testar acesso direto ao upload
curl -I http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146
```

### 2. Teste via Browser

Acesse as URLs no navegador:
- `http://localhost:3000/api/pdf/3ce700ed5a743bcdf76ab9750ce99146`
- `http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146`

### 3. Teste de URLs do Produto

```bash
# Obter todas as URLs do produto
curl http://localhost:3000/api/products/8/urls
```

### 4. Logs do Servidor

Verifique os logs do servidor para confirmar o acesso:

```
[REQUEST] GET /api/pdf/3ce700ed5a743bcdf76ab9750ce99146 from localhost
[PDF] Request for PDF: 3ce700ed5a743bcdf76ab9750ce99146
[PDF] File path: uploads\3ce700ed5a743bcdf76ab9750ce99146
[PDF] File exists: true
[PDF] Serving PDF file: 3ce700ed5a743bcdf76ab9750ce99146 (32357579 bytes)
6:42:39 PM [express] GET /api/pdf/3ce700ed5a743bcdf76ab9750ce99146 200 in 255ms
```

## Script de Teste Automatizado

### Criação de Script Completo

Para automatizar todos os testes, crie um script `test_complete_integration.cjs`:

```javascript
const https = require('https');
const http = require('http');

async function testCompleteIntegration() {
  console.log('🧪 INICIANDO TESTE COMPLETO DE INTEGRAÇÃO N8N\n');
  
  // 1. Testar webhook
  console.log('1️⃣ Testando envio de webhook...');
  await testWebhook();
  
  // 2. Testar acesso ao PDF
  console.log('\n2️⃣ Testando acesso ao PDF...');
  await testPdfAccess();
  
  // 3. Testar URLs do produto
  console.log('\n3️⃣ Testando URLs do produto...');
  await testProductUrls();
  
  console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
}

async function testWebhook() {
  // Implementação do teste de webhook
}

async function testPdfAccess() {
  // Implementação do teste de PDF
}

async function testProductUrls() {
  // Implementação do teste de URLs
}

testCompleteIntegration().catch(console.error);
```

## Verificação no N8N

### 1. Dashboard N8N

1. Acesse `https://auton8n.upleer.com.br`
2. Navegue para **Executions** 
3. Verifique execuções recentes do workflow
4. Confirme se o payload foi recebido

### 2. Workflow Logs

1. Abra o workflow configurado
2. Verifique os logs de execução
3. Confirme se os dados chegaram corretamente
4. Teste download de PDF dentro do workflow

### 3. Cache e Atualização

⚠️ **IMPORTANTE**: O N8N pode ter cache. Se não ver execuções:
1. Pressione `F5` para atualizar a página
2. Verifique filtros de data
3. Confirme se está no workflow correto

## Troubleshooting

### Problemas Comuns

#### Webhook não chegando no N8N
```
❌ Status: 404 ou 500
🔍 Verificar:
- URL do webhook está correta
- N8N está rodando
- Workflow está ativo
- Connectivity entre sistemas
```

#### PDF não acessível
```
❌ Status: 404 File not found
🔍 Verificar:
- Arquivo existe em /uploads/
- Permissões de arquivo
- Servidor Upleer rodando
- URL correta
```

#### Timeout de conexão
```
❌ ECONNREFUSED ou timeout
🔍 Verificar:
- Firewall/antivírus
- URLs corretas (localhost vs IP)
- Portas abertas
- Conectividade de rede
```

### Comandos de Diagnóstico

```bash
# Verificar se servidor está rodando
curl -I http://localhost:3000/

# Listar arquivos em uploads
ls uploads/

# Testar conectividade N8N
curl -I https://auton8n.upleer.com.br/

# Verificar logs do servidor
tail -f server_logs.txt
```

## Resultados Esperados

### ✅ Teste Bem-sucedido

#### Webhook
- Status: `200 OK`
- Response: `{"message":"Webhook received"}`
- Headers: Corretos (nginx, content-type, etc.)

#### PDF Access
- Status: `200 OK` 
- Content-Type: `application/pdf`
- Content-Length: Tamanho correto do arquivo
- Download iniciado automaticamente

#### Logs do Servidor
```
[REQUEST] GET /api/pdf/[filename] from localhost
[PDF] Request for PDF: [filename]
[PDF] File path: uploads\[filename]
[PDF] File exists: true
[PDF] Serving PDF file: [filename] (X bytes)
[timestamp] [express] GET /api/pdf/[filename] 200 in Xms
```

### ✅ Integração Completa

1. **Webhook Funcionando**: N8N recebe payloads automaticamente
2. **PDFs Acessíveis**: N8N pode baixar arquivos via URLs
3. **URLs Corretas**: Todas as URLs retornam dados válidos
4. **Logs Limpos**: Sem erros nos logs do servidor
5. **Workflow N8N**: Execuções aparecem no dashboard

## Próximos Passos

Após teste bem-sucedido:

1. **Remover arquivos de teste**:
   ```bash
   rm test_webhook_n8n.cjs
   rm test_complete_integration.cjs
   ```

2. **Configurar monitoramento** de webhooks em produção

3. **Documentar workflows N8N** específicos

4. **Configurar alertas** para falhas de integração

5. **Testar em ambiente de produção** quando disponível

---

## Referências

- [12. Webhook N8N Payload](./12-webhook-n8n-payload.md)
- [13. Acesso aos PDFs](./13-acesso-pdfs.md)
- [08. Integrações e Webhooks](./08-integracoes-webhooks.md)
- [04. API Reference](./04-api-reference.md)

---

**Data da última atualização**: 26 de junho de 2025  
**Status**: Testado e funcionando ✅ 