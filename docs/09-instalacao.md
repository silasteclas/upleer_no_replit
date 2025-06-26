# Guia de Instalação

## Requisitos do Sistema

### Software Necessário

- **Node.js**: versão 18.x ou superior
- **PostgreSQL**: versão 14.x ou superior
- **npm**: versão 8.x ou superior (vem com Node.js)
- **Git**: para clonar o repositório

### Hardware Recomendado

- **RAM**: Mínimo 4GB (8GB recomendado)
- **Disco**: 2GB livres para aplicação + espaço para uploads
- **CPU**: 2 cores ou mais

## Início Rápido

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/upleer.git
cd upleer
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Banco de Dados

#### Criar banco PostgreSQL

```sql
CREATE DATABASE upleer;
CREATE USER upleer_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE upleer TO upleer_user;
```

#### Criar tabela de sessões (obrigatória)

```sql
\c upleer;

CREATE TABLE "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX "IDX_session_expire" ON "sessions" ("expire");
```

### 4. Configurar Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL=postgresql://upleer_user:sua_senha_segura@localhost:5432/upleer

# Sessão
SESSION_SECRET=uma_string_aleatoria_muito_segura_aqui

# Ambiente
NODE_ENV=development

# Domínios (para produção)
REPLIT_DOMAINS=seu-dominio.com,www.seu-dominio.com
```

### 5. Executar Migrações

```bash
npm run db:push
```

### 6. Iniciar o Servidor

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5000`

## Configuração Detalhada

### Configuração do PostgreSQL

#### Conexão SSL (Produção)

```env
DATABASE_URL=postgresql://user:pass@host:5432/database?sslmode=require
```

#### Pool de Conexões

O Drizzle ORM gerencia automaticamente o pool. Para configuração avançada:

```typescript
// server/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // máximo de conexões
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Configuração de Uploads

#### Diretório de Uploads

Por padrão, os arquivos são salvos em `./uploads`. Para mudar:

```typescript
// server/routes.ts
const upload = multer({
  storage: multer.diskStorage({
    destination: "caminho/personalizado/uploads/",
    // ...
  })
});
```

#### Limites de Upload

```typescript
limits: {
  fileSize: 100 * 1024 * 1024, // 100MB para PDFs
}
```

### Configuração de Sessões

#### Tempo de Expiração

```typescript
// server/session-config.ts
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 dias
```

#### Configurações de Cookie

```typescript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: sessionTtl,
  domain: '.seu-dominio.com' // para subdomínios
}
```

## Instalação em Produção

### 1. Build da Aplicação

```bash
npm run build
```

### 2. Configurar Nginx (Recomendado)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Proxy para Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Arquivos estáticos
    location /uploads {
        alias /path/to/upleer/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Limite de upload
    client_max_body_size 100M;
}
```

### 3. Configurar PM2

```bash
# Instalar PM2
npm install -g pm2

# Criar ecosystem file
pm2 init
```

Editar `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'upleer',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

Iniciar com PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configurar Backups

#### Backup Automático do Banco

Criar script `backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
DB_NAME="upleer"

# Backup do banco
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_$DATE.sql"

# Backup dos uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /path/to/uploads/

# Manter apenas últimos 30 dias
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

Agendar no cron:

```bash
0 2 * * * /path/to/backup.sh
```

## Variáveis de Ambiente

### Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| DATABASE_URL | URL de conexão PostgreSQL | postgresql://user:pass@localhost/db |
| SESSION_SECRET | Chave secreta para sessões | string-aleatoria-segura |

### Opcionais

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| NODE_ENV | Ambiente (development/production) | development |
| PORT | Porta do servidor | 5000 |
| REPLIT_DOMAINS | Domínios permitidos | localhost |

## Verificação da Instalação

### 1. Testar Conexão com Banco

```bash
npm run db:push
```

### 2. Verificar Health Check

```bash
curl http://localhost:5000/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### 3. Criar Primeiro Usuário

1. Acesse `http://localhost:5000`
2. Clique em "Criar conta"
3. Preencha o formulário
4. Faça login

## Troubleshooting

### Erro: Cannot connect to database

1. Verificar se PostgreSQL está rodando
2. Verificar credenciais em DATABASE_URL
3. Verificar se banco existe
4. Testar conexão: `psql $DATABASE_URL`

### Erro: Session table does not exist

Execute o SQL de criação da tabela sessions (ver seção 3)

### Erro: Port already in use

1. Verificar processo na porta: `lsof -i :5000`
2. Matar processo: `kill -9 PID`
3. Ou mudar porta: `PORT=3000 npm run dev`

### Erro: Upload failed

1. Verificar permissões da pasta uploads
2. Criar pasta se não existir: `mkdir uploads`
3. Dar permissões: `chmod 755 uploads`

## Otimizações

### Performance

1. **Habilitar compressão**:
```typescript
import compression from 'compression';
app.use(compression());
```

2. **Cache de assets**:
```typescript
app.use(express.static('public', {
  maxAge: '1y',
  etag: false
}));
```

3. **Índices do banco**:
```sql
CREATE INDEX idx_products_author ON products(author_id);
CREATE INDEX idx_sales_product ON sales(product_id);
```

### Segurança

1. **Rate limiting**:
```typescript
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

2. **Helmet para headers**:
```typescript
import helmet from 'helmet';
app.use(helmet());
```

3. **CORS configurado**:
```typescript
import cors from 'cors';
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
``` 