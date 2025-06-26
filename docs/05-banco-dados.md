# Banco de Dados

## Visão Geral

O Upleer utiliza PostgreSQL como banco de dados principal, com Drizzle ORM para gerenciamento de schema e queries.

## Configuração

### Conexão

```typescript
// Variável de ambiente
DATABASE_URL=postgresql://user:pass@host/database

// SSL em produção
?sslmode=require
```

### Drizzle Config

```typescript
export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
}
```

## Schema das Tabelas

### users
Armazena informações dos usuários (autores e administradores).

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | varchar | ID único do usuário | PRIMARY KEY |
| email | varchar | Email do usuário | UNIQUE, NOT NULL |
| password | varchar | Senha hasheada | NULL (oauth) |
| firstName | varchar | Primeiro nome | NULL |
| lastName | varchar | Sobrenome | NULL |
| phone | varchar | Telefone | NULL |
| profileImageUrl | varchar | URL da foto de perfil | NULL |
| role | varchar | Papel do usuário | DEFAULT 'author' |
| createdAt | timestamp | Data de criação | DEFAULT NOW() |
| updatedAt | timestamp | Data de atualização | DEFAULT NOW() |

### products
Armazena os livros/produtos dos autores.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | serial | ID único | PRIMARY KEY |
| authorId | varchar | ID do autor | FOREIGN KEY → users.id |
| title | varchar | Título do livro | NOT NULL |
| description | text | Descrição | NULL |
| isbn | varchar | ISBN | NULL |
| author | varchar | Nome do autor | NOT NULL |
| coAuthors | varchar | Co-autores | NULL |
| genre | varchar | Gênero | NOT NULL |
| language | varchar | Idioma | DEFAULT 'português' |
| targetAudience | varchar | Público-alvo | NULL |
| pdfUrl | varchar | URL do PDF | NOT NULL |
| coverImageUrl | varchar | URL da capa | NULL |
| pageCount | integer | Número de páginas | NOT NULL |
| baseCost | decimal(10,2) | Custo base | NOT NULL |
| salePrice | decimal(10,2) | Preço de venda | NOT NULL |
| marginPercent | integer | Percentual de margem | DEFAULT 150 |
| status | varchar | Status do produto | DEFAULT 'pending' |
| publicUrl | varchar | URL na loja pública | NULL |
| createdAt | timestamp | Data de criação | DEFAULT NOW() |
| updatedAt | timestamp | Data de atualização | DEFAULT NOW() |

**Status possíveis:** pending, approved, rejected, published, archived

### sales
Registra todas as vendas realizadas.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | serial | ID único | PRIMARY KEY |
| productId | integer | ID do produto | FOREIGN KEY → products.id |
| buyerEmail | varchar | Email do comprador | NULL |
| buyerName | varchar | Nome do comprador | NULL |
| buyerPhone | varchar | Telefone | NULL |
| buyerCpf | varchar | CPF | NULL |
| buyerAddress | varchar | Endereço | NULL |
| buyerCity | varchar | Cidade | NULL |
| buyerState | varchar | Estado | NULL |
| buyerZipCode | varchar | CEP | NULL |
| salePrice | decimal(10,2) | Valor da venda | NOT NULL |
| commission | decimal(10,2) | Comissão (15%) | NOT NULL |
| authorEarnings | decimal(10,2) | Ganhos do autor | NOT NULL |
| orderDate | timestamp | Data do pedido | NULL |
| paymentStatus | varchar | Status do pagamento | DEFAULT 'pendente' |
| paymentMethod | varchar | Método de pagamento | NULL |
| installments | integer | Parcelas | DEFAULT 1 |
| discountCoupon | varchar | Cupom de desconto | NULL |
| discountAmount | decimal(10,2) | Valor do desconto | DEFAULT 0.00 |
| shippingCost | decimal(10,2) | Custo de envio | DEFAULT 0.00 |
| shippingCarrier | varchar | Transportadora | NULL |
| deliveryDays | integer | Dias para entrega | NULL |
| createdAt | timestamp | Data de criação | DEFAULT NOW() |

### api_integrations
Configurações de integrações com APIs externas.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | serial | ID único | PRIMARY KEY |
| name | varchar | Nome da integração | NOT NULL |
| description | text | Descrição | NULL |
| baseUrl | varchar | URL base da API | NOT NULL |
| authType | varchar | Tipo de autenticação | NOT NULL |
| authConfig | jsonb | Configuração de auth | NOT NULL |
| headers | jsonb | Headers padrão | NULL |
| isActive | boolean | Se está ativa | DEFAULT true |
| createdAt | timestamp | Data de criação | DEFAULT NOW() |
| updatedAt | timestamp | Data de atualização | DEFAULT NOW() |

**authType valores:** api_key, oauth, bearer, basic

### api_endpoints
Endpoints configurados para cada integração.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | serial | ID único | PRIMARY KEY |
| integrationId | integer | ID da integração | FOREIGN KEY → api_integrations.id |
| name | varchar | Nome do endpoint | NOT NULL |
| endpoint | varchar | Path do endpoint | NOT NULL |
| method | varchar | Método HTTP | NOT NULL |
| requestBody | jsonb | Template do body | NULL |
| responseMapping | jsonb | Mapeamento da resposta | NULL |
| isActive | boolean | Se está ativo | DEFAULT true |
| createdAt | timestamp | Data de criação | DEFAULT NOW() |
| updatedAt | timestamp | Data de atualização | DEFAULT NOW() |

### api_logs
Logs de execução das integrações.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | serial | ID único | PRIMARY KEY |
| integrationId | integer | ID da integração | FOREIGN KEY → api_integrations.id |
| endpointId | integer | ID do endpoint | FOREIGN KEY → api_endpoints.id |
| method | varchar | Método HTTP | NOT NULL |
| url | text | URL completa | NOT NULL |
| requestHeaders | jsonb | Headers da requisição | NULL |
| requestBody | jsonb | Body da requisição | NULL |
| responseStatus | integer | Status HTTP | NULL |
| responseHeaders | jsonb | Headers da resposta | NULL |
| responseBody | jsonb | Body da resposta | NULL |
| responseTime | integer | Tempo em ms | NULL |
| errorMessage | text | Mensagem de erro | NULL |
| createdAt | timestamp | Data de criação | DEFAULT NOW() |

### sessions
Armazena sessões de usuário (gerenciada pelo express-session).

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| sid | varchar | Session ID | PRIMARY KEY |
| sess | jsonb | Dados da sessão | NOT NULL |
| expire | timestamp | Expiração | NOT NULL |

## Índices

### Índices Existentes

1. **sessions**: IDX_session_expire em `expire`
2. **users**: Índice único em `email`
3. **products**: Índice implícito em `authorId` (FK)
4. **sales**: Índice implícito em `productId` (FK)

### Índices Recomendados

```sql
-- Para queries de produtos por status
CREATE INDEX idx_products_status ON products(status);

-- Para queries de vendas por data
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);

-- Para queries de produtos por autor e status
CREATE INDEX idx_products_author_status ON products(authorId, status);
```

## Relações

### Diagrama ER Simplificado

```
users (1) ──────< (N) products
                         │
                         │ (1)
                         │
                         ˅ (N)
                       sales

api_integrations (1) ──────< (N) api_endpoints
        │                              │
        │ (1)                          │ (1)
        │                              │
        ˅ (N)                          ˅ (N)
    api_logs <──────────────────── api_logs
```

### Integridade Referencial

1. **Cascade Delete**: Não implementado (segurança)
2. **On Delete Restrict**: Padrão para FKs
3. **Soft Delete**: Usar campo `status` ao invés de deletar

## Queries Comuns

### Estatísticas do Autor

```sql
-- Total de vendas e receita
SELECT 
  COUNT(*) as total_sales,
  SUM(author_earnings) as total_revenue
FROM sales s
JOIN products p ON s.product_id = p.id
WHERE p.author_id = $1;

-- Produtos por status
SELECT 
  status, 
  COUNT(*) as count
FROM products
WHERE author_id = $1
GROUP BY status;
```

### Vendas Recentes

```sql
SELECT 
  s.*,
  p.title as product_title,
  p.author as product_author
FROM sales s
JOIN products p ON s.product_id = p.id
WHERE p.author_id = $1
ORDER BY s.created_at DESC
LIMIT 10;
```

## Backup e Manutenção

### Backup

```bash
# Backup completo
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Backup apenas estrutura
pg_dump --schema-only $DATABASE_URL > schema.sql

# Backup apenas dados
pg_dump --data-only $DATABASE_URL > data.sql
```

### Manutenção

```sql
-- Vacuum e análise
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE nome_database;

-- Verificar tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Migração e Versionamento

### Drizzle Kit

```bash
# Gerar migração
npx drizzle-kit generate:pg

# Aplicar migração
npx drizzle-kit push:pg

# Verificar estado
npx drizzle-kit studio
```

### Convenções

1. Sempre revisar migrações antes de aplicar
2. Testar em ambiente de desenvolvimento primeiro
3. Fazer backup antes de migrações em produção
4. Documentar mudanças significativas 