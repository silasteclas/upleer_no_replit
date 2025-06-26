# Arquitetura do Sistema

## Visão Geral da Arquitetura

O Upleer segue uma arquitetura de três camadas (3-tier) com separação clara entre frontend, backend e banco de dados.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Páginas   │  │ Componentes  │  │  Hooks & Utils   │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP/API
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Routes    │  │     Auth     │  │    Storage       │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Users    │  │   Products   │  │     Sales        │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Camada Frontend

### Estrutura de Componentes

```
client/src/
├── pages/              # Componentes de página (rotas)
├── components/         # Componentes reutilizáveis
│   ├── ui/            # Componentes UI base
│   ├── layout/        # Componentes de layout
│   ├── dashboard/     # Componentes específicos do dashboard
│   └── upload/        # Componentes de upload
├── hooks/             # React hooks customizados
└── lib/               # Utilitários e configurações
```

### Padrões Utilizados

1. **Component Pattern**: Componentes reutilizáveis e composáveis
2. **Custom Hooks**: Lógica de negócio encapsulada em hooks
3. **Compound Components**: Componentes complexos divididos em sub-componentes
4. **Controlled Components**: Estado gerenciado pelo React

## Camada Backend

### Estrutura de Módulos

```
server/
├── index.ts           # Entry point e configuração
├── routes.ts          # Definição de todas as rotas
├── auth.ts           # Sistema de autenticação
├── storage.ts        # Camada de acesso a dados
├── db.ts             # Conexão com banco de dados
└── vite.ts           # Integração com Vite (dev)
```

### Padrões Utilizados

1. **Repository Pattern**: `storage.ts` abstrai acesso ao banco
2. **Middleware Pattern**: Autenticação, upload, validação
3. **Service Layer**: Lógica de negócio separada das rotas
4. **Dependency Injection**: Via imports modulares

## Camada de Dados

### Modelo de Dados

```sql
-- Principais entidades
users (autores e admins)
products (livros digitais)
sales (vendas realizadas)
api_integrations (integrações configuradas)
api_endpoints (endpoints das integrações)
api_logs (logs de execução)
sessions (sessões de usuário)
```

### Relações

- `users` 1:N `products` (um autor tem vários produtos)
- `products` 1:N `sales` (um produto tem várias vendas)
- `api_integrations` 1:N `api_endpoints` (uma integração tem vários endpoints)
- `api_integrations` 1:N `api_logs` (uma integração tem vários logs)

## Fluxo de Requisições

### Fluxo Típico de uma Requisição

1. **Frontend**: Componente faz chamada via `queryClient`
2. **API Client**: Adiciona headers de autenticação
3. **Express Router**: Recebe e roteia a requisição
4. **Middleware**: Valida autenticação e dados
5. **Route Handler**: Processa a lógica de negócio
6. **Storage Layer**: Acessa o banco de dados
7. **Response**: Retorna dados ao frontend

### Exemplo: Upload de Produto

```typescript
// Frontend
UploadModal → FormData → POST /api/products

// Backend
routes.ts → requireAuth → multer → storage.createProduct → DB

// Webhook
sendProductToWebhook → N8N
```

## Segurança

### Camadas de Segurança

1. **Autenticação**: Sessões baseadas em cookies HTTP-only
2. **Autorização**: Middleware `requireAuth` em rotas protegidas
3. **Validação**: Zod schemas para validação de dados
4. **Isolamento**: Dados filtrados por `authorId`
5. **Upload**: Validação de tipo e tamanho de arquivo

### Proteções Implementadas

- CSRF: Sessões com tokens seguros
- XSS: React escapa automaticamente
- SQL Injection: Queries parametrizadas via Drizzle
- File Upload: Validação de MIME types
- Rate Limiting: Via configuração de Express

## Escalabilidade

### Pontos de Escalabilidade

1. **Frontend**: Build estático via CDN
2. **Backend**: Stateless, permite múltiplas instâncias
3. **Database**: Pool de conexões configurável
4. **Files**: Pode migrar para S3/Cloud Storage
5. **Sessions**: Já em banco, permite múltiplos servidores

### Otimizações Implementadas

- Query caching via TanStack Query
- Lazy loading de componentes
- Compressão de assets
- Índices de banco otimizados
- Paginação em listagens

## Integrações Externas

### Webhooks

- **Entrada**: `/api/webhook/sales` para receber vendas
- **Saída**: Envio para N8N ao criar produtos
- **Formato**: JSON com validação de schema

### APIs Externas

Sistema flexível de integrações permite:
- Configurar múltiplas APIs
- Diferentes tipos de autenticação
- Mapeamento de dados customizado
- Logs detalhados de execução

## Monitoramento e Logs

### Logs Implementados

1. **Request Logs**: Todas as requisições API
2. **Error Logs**: Erros com stack trace
3. **Webhook Logs**: Arquivos em `/tmp/`
4. **API Integration Logs**: Salvos no banco

### Pontos de Observabilidade

- Health check endpoint: `/api/health`
- Métricas de performance via logs
- Status de conexão com banco
- Logs de webhooks para debug 