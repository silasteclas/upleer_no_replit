# Acesso aos PDFs dos Produtos

## Visão Geral

Quando um usuário cadastra um produto no Upleer, o sistema gera automaticamente várias URLs para acessar o PDF e outros arquivos. Este documento explica todas as formas de acessar os PDFs cadastrados.

## 🔗 **URLs de Acesso Disponíveis**

### 1. **URL Direta do PDF**
```
GET /uploads/{filename}
```
**Exemplo**: `http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146`

- ✅ **Acesso público** (sem autenticação)
- ✅ **Download automático** do arquivo
- ✅ **Tipo MIME correto** (application/pdf)
- ✅ **Compatível com qualquer cliente** (browser, N8N, etc.)

### 2. **URL via API PDF**
```
GET /api/pdf/{filename}
```
**Exemplo**: `http://localhost:3000/api/pdf/3ce700ed5a743bcdf76ab9750ce99146`

- ✅ **Validação de PDF** (verifica se é arquivo PDF válido)
- ✅ **Headers otimizados** para visualização
- ✅ **Logs detalhados** para debug
- ✅ **Visualização inline** no navegador

### 3. **URL de Download Estruturado**
```
GET /api/download/pdf/{filename}
```
**Exemplo**: `http://localhost:3000/api/download/pdf/3ce700ed5a743bcdf76ab9750ce99146`

- ✅ **Headers de identificação** do tipo de arquivo
- ✅ **Controle de cache** configurado
- ✅ **Nome de arquivo** padronizado

## 📋 **Obtendo URLs de um Produto**

### Método 1: Listar Produtos com URLs
```bash
GET /api/products
Authorization: Requerida
```

**Resposta**:
```json
[
  {
    "id": 8,
    "title": "Nome do Produto",
    "author": "Autor",
    "pdfUrl": "/uploads/3ce700ed5a743bcdf76ab9750ce99146",
    "accessUrls": {
      "pdfDirect": "http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146",
      "pdfDownload": "http://localhost:3000/api/pdf/3ce700ed5a743bcdf76ab9750ce99146",
      "coverDirect": "http://localhost:3000/uploads/3aecfdba66fc08fc61591406eed3a95c",
      "coverDownload": "http://localhost:3000/api/download/cover/3aecfdba66fc08fc61591406eed3a95c",
      "productDetails": "http://localhost:3000/api/products/8"
    }
  }
]
```

### Método 2: Obter Produto Específico
```bash
GET /api/products/{id}
Authorization: Requerida
```

### Método 3: Endpoint Público de URLs
```bash
GET /api/products/{id}/urls
Authorization: NÃO requerida
```

**Resposta**:
```json
{
  "productId": 8,
  "title": "Nome do Produto",
  "author": "Autor",
  "status": "pending",
  "urls": {
    "pdfDirect": "http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146",
    "pdfDownload": "http://localhost:3000/api/pdf/3ce700ed5a743bcdf76ab9750ce99146",
    "coverDirect": "http://localhost:3000/uploads/3aecfdba66fc08fc61591406eed3a95c",
    "coverDownload": "http://localhost:3000/api/download/cover/3aecfdba66fc08fc61591406eed3a95c",
    "productDetails": "http://localhost:3000/api/products/8"
  },
  "metadata": {
    "pdfFilename": "3ce700ed5a743bcdf76ab9750ce99146",
    "coverFilename": "3aecfdba66fc08fc61591406eed3a95c",
    "baseUrl": "http://localhost:3000",
    "generatedAt": "2025-06-26T21:30:00.000Z"
  }
}
```

## 🔄 **Payload do Webhook N8N**

Quando um produto é cadastrado, o webhook enviado ao N8N inclui todas as URLs:

```json
{
  "id": 8,
  "title": "Nome do Produto",
  "downloadUrls": {
    "productDetails": "http://localhost:3000/api/products/8",
    "pdfDownload": "http://localhost:3000/api/pdf/3ce700ed5a743bcdf76ab9750ce99146",
    "pdfDirect": "http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146",
    "coverDownload": "http://localhost:3000/api/download/cover/3aecfdba66fc08fc61591406eed3a95c"
  }
}
```

## 🧪 **Testando o Acesso**

### Via cURL
```bash
# Testar URL direta
curl -I http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146

# Baixar PDF
curl -o produto.pdf http://localhost:3000/uploads/3ce700ed5a743bcdf76ab9750ce99146

# Obter URLs do produto
curl http://localhost:3000/api/products/8/urls
```

### Via Navegador
- **URL Direta**: `http://localhost:3000/uploads/{filename}`
- **API PDF**: `http://localhost:3000/api/pdf/{filename}`
- **URLs do Produto**: `http://localhost:3000/api/products/{id}/urls`

### Via N8N
1. **HTTP Request Node** com URL do webhook
2. **Extrair `downloadUrls.pdfDirect`** do payload
3. **Novo HTTP Request** para baixar o PDF
4. **Processar o arquivo** conforme necessário

## 🌍 **URLs para Produção**

Quando configurado para produção, todas as URLs usarão o domínio real:

```env
BASE_URL=https://sua-url-de-producao.com
NODE_ENV=production
```

As URLs geradas serão:
```
https://sua-url-de-producao.com/uploads/{filename}
https://sua-url-de-producao.com/api/pdf/{filename}
```

## 📊 **Logs de Debug**

O sistema registra logs detalhados para cada acesso:

```
[PDF] Request for PDF: 3ce700ed5a743bcdf76ab9750ce99146
[PDF] File path: uploads/3ce700ed5a743bcdf76ab9750ce99146
[PDF] File exists: true
[PDF] Serving PDF file: 3ce700ed5a743bcdf76ab9750ce99146 (32357579 bytes)
```

## 🔐 **Segurança e Acesso**

### Endpoints Públicos (sem autenticação)
- `/uploads/{filename}` - Acesso direto aos arquivos
- `/api/pdf/{filename}` - API de PDF
- `/api/download/{type}/{filename}` - Download estruturado
- `/api/products/{id}/urls` - URLs do produto

### Endpoints Protegidos (com autenticação)
- `/api/products` - Listar produtos do usuário
- `/api/products/{id}` - Detalhes do produto (apenas do autor)

## 🎯 **Casos de Uso Práticos**

### 1. **N8N Processing**
```javascript
// No N8N, usar o payload do webhook:
const pdfUrl = $json.downloadUrls.pdfDirect;
const httpRequestNode = {
  url: pdfUrl,
  method: 'GET'
};
```

### 2. **Download Programático**
```javascript
// JavaScript/Node.js
const productId = 8;
const response = await fetch(`http://localhost:3000/api/products/${productId}/urls`);
const data = await response.json();
const pdfUrl = data.urls.pdfDirect;

// Baixar o PDF
const pdfResponse = await fetch(pdfUrl);
const pdfBuffer = await pdfResponse.buffer();
```

### 3. **Integração Frontend**
```javascript
// React/Frontend
const downloadPdf = async (productId) => {
  const response = await fetch(`/api/products/${productId}/urls`);
  const data = await response.json();
  
  // Abrir PDF em nova aba
  window.open(data.urls.pdfDirect, '_blank');
};
```

## ⚠️ **Troubleshooting**

### PDF Não Encontrado (404)
- Verificar se arquivo existe na pasta `uploads/`
- Confirmar filename correto no banco de dados
- Verificar permissões de leitura da pasta

### Erro de Tipo MIME
- PDF corrompido ou arquivo inválido
- Usar endpoint `/api/pdf/{filename}` para validação

### URLs Incorretas
- Verificar variável `BASE_URL` no ambiente
- Confirmar porta e protocolo corretos
- Testar endpoint `/api/products/{id}/urls`

## 📈 **Monitoramento**

Para monitorar acessos aos PDFs:

1. **Logs do servidor** registram cada request
2. **Status codes** indicam sucesso/erro
3. **Tamanho dos arquivos** nos logs de debug
4. **Tempo de resposta** para grandes arquivos 