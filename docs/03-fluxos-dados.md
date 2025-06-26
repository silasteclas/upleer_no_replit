# Fluxos de Dados

## Visão Geral

Este documento detalha os principais fluxos de dados no sistema Upleer, desde a interação do usuário até o armazenamento no banco de dados.

## Fluxo de Autenticação

### Login de Usuário

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant A as API
    participant S as Session Store
    participant D as Database
    
    U->>F: Preenche email/senha
    F->>A: POST /api/auth/login
    A->>D: Busca usuário por email
    D-->>A: Dados do usuário
    A->>A: Valida senha (bcrypt)
    A->>S: Cria sessão
    S-->>A: Session ID
    A-->>F: Cookie + User Data
    F->>F: Armazena em contexto
    F-->>U: Redireciona ao dashboard
```

### Registro de Novo Usuário

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant A as API
    participant D as Database
    
    U->>F: Preenche formulário
    F->>F: Valida dados localmente
    F->>A: POST /api/auth/register
    A->>A: Hash da senha
    A->>D: Cria novo usuário
    D-->>A: User ID
    A->>A: Cria sessão
    A-->>F: Cookie + User Data
    F-->>U: Redireciona ao dashboard
```

## Fluxo de Upload de Produto

### Upload Completo

```mermaid
flowchart TD
    A[Usuário seleciona arquivos] --> B{Validação Local}
    B -->|Válido| C[Cria FormData]
    B -->|Inválido| D[Mostra erro]
    C --> E[POST /api/products]
    E --> F[Multer processa arquivos]
    F --> G[Salva em /uploads]
    G --> H[Cria registro no BD]
    H --> I[Envia webhook N8N]
    I --> J[Retorna produto criado]
    J --> K[Mostra tela de sucesso]
```

### Processamento de Arquivos

1. **PDF do Livro**:
   - Validação: Deve ser PDF
   - Limite: 100MB
   - Armazenamento: Hash MD5 como nome

2. **Imagem de Capa**:
   - Validação: JPEG, PNG, GIF
   - Limite: 10MB
   - Armazenamento: Hash MD5 como nome

3. **Metadados**:
   - Título, autor, ISBN
   - Preço e margem
   - Gênero e idioma

## Fluxo de Vendas

### Recebimento de Venda via Webhook

```mermaid
sequenceDiagram
    participant E as Sistema Externo
    participant W as Webhook Endpoint
    participant V as Validação
    participant D as Database
    participant C as Cálculo
    
    E->>W: POST /api/webhook/sales
    W->>V: Valida dados obrigatórios
    V->>D: Busca produto
    D-->>V: Dados do produto
    V->>C: Calcula comissão (15%)
    C->>D: Cria registro de venda
    D-->>W: Venda criada
    W-->>E: Confirmação JSON
```

### Dados Processados na Venda

```javascript
{
  // Entrada (Webhook)
  productId: 123,
  buyerEmail: "comprador@email.com",
  salePrice: "100.00",
  
  // Processamento
  commission: "15.00",        // 15% do valor
  authorEarnings: "85.00",    // Valor - comissão
  
  // Armazenamento
  authorId: "obtido do produto",
  createdAt: "timestamp"
}
```

## Fluxo de Integrações API

### Configuração de Integração

```mermaid
flowchart LR
    A[Criar Integração] --> B[Definir Auth]
    B --> C[Configurar Endpoints]
    C --> D[Mapear Dados]
    D --> E[Testar Endpoint]
    E --> F[Ativar Integração]
```

### Execução de Integração

```mermaid
sequenceDiagram
    participant U as Usuário
    participant S as Sistema
    participant I as Integração
    participant E as API Externa
    participant L as Logs
    
    U->>S: Aciona integração
    S->>I: Carrega config
    I->>I: Prepara headers/auth
    I->>E: Faz requisição
    E-->>I: Resposta
    I->>L: Registra log
    I->>S: Processa resposta
    S-->>U: Retorna resultado
```

## Fluxo de Dashboard

### Carregamento de Estatísticas

```mermaid
flowchart TD
    A[Dashboard Mount] --> B[useQuery Hook]
    B --> C[Parallel Requests]
    C --> D[/api/stats]
    C --> E[/api/products]
    C --> F[/api/sales/recent]
    D --> G[Aggregate Data]
    E --> G
    F --> G
    G --> H[Update UI]
```

### Dados Agregados

1. **Total de Vendas**: COUNT de sales
2. **Receita Total**: SUM de authorEarnings
3. **Produtos Ativos**: COUNT com status = 'approved'
4. **Produtos Pendentes**: COUNT com status = 'pending'

## Fluxo de Atualização de Status

### Via Webhook

```mermaid
sequenceDiagram
    participant E as Sistema Externo
    participant W as Webhook
    participant D as Database
    
    E->>W: PATCH /api/webhook/products/:id/status
    W->>D: Busca produto
    D-->>W: Produto existe?
    W->>D: Atualiza status
    W->>D: Atualiza publicUrl (opcional)
    D-->>W: Produto atualizado
    W-->>E: Confirmação
```

## Fluxo de Sessão

### Gerenciamento de Sessão

```mermaid
flowchart LR
    A[Login] --> B[Cria Sessão]
    B --> C[Cookie HTTP-Only]
    C --> D[Requisições Auth]
    D --> E{Sessão Válida?}
    E -->|Sim| F[Processa]
    E -->|Não| G[401 Unauthorized]
    H[Logout] --> I[Destroi Sessão]
```

### Armazenamento de Sessão

- Tabela `sessions` no PostgreSQL
- TTL: 7 dias
- Cookie seguro (HTTPS em produção)
- Renovação automática em atividade

## Fluxo de Arquivos

### Download de Arquivos

```mermaid
flowchart TD
    A[Requisição de Download] --> B{Tipo de Arquivo}
    B -->|PDF| C[/api/pdf/:filename]
    B -->|Imagem| D[/api/download/cover/:filename]
    C --> E[Verifica Existência]
    D --> E
    E -->|Existe| F[Detecta MIME Type]
    E -->|Não existe| G[404 Not Found]
    F --> H[Define Headers]
    H --> I[Stream do Arquivo]
```

## Otimizações de Performance

### Cache no Frontend

- TanStack Query com staleTime configurado
- Revalidação em foco de janela
- Cache de imagens via browser

### Otimizações no Backend

- Pool de conexões PostgreSQL
- Índices em campos de busca
- Queries otimizadas com Drizzle

### Otimizações de Rede

- Compressão gzip
- Headers de cache apropriados
- Lazy loading de componentes 