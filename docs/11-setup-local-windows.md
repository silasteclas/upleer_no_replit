# Setup Local no Windows - Guia Completo

## Visão Geral

Este documento registra o processo completo para configurar e executar o projeto Upleer localmente no Windows, incluindo todos os problemas encontrados e suas soluções.

## ✅ Resultado Final

- ✅ Projeto rodando em `http://localhost:3000`
- ✅ Banco de dados Neon conectado
- ✅ Frontend React funcionando
- ✅ Backend Express operacional
- ✅ Sistema de autenticação ativo
- ✅ Possível criar conta e acessar dashboard

## 🔧 Pré-requisitos

- Node.js 18.x ou superior
- npm 8.x ou superior
- Windows 10/11
- Conta no Neon Database

## 📋 Processo Executado

### Passo 1: Instalação das Dependências
```bash
npm install
```

**Status**: ✅ Sucesso sem problemas

### Passo 2: Correção dos Scripts para Windows

**Problema Encontrado**:
```
'NODE_ENV' não é reconhecido como um comando interno
ou externo, um programa operável ou um arquivo em lotes.
```

**Causa**: O Windows não reconhece a sintaxe `NODE_ENV=development` nos scripts do package.json.

**Solução Implementada**:
1. Instalação do `cross-env`:
```bash
npm install --save-dev cross-env
```

2. Atualização do `package.json`:
```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "start": "cross-env NODE_ENV=production node dist/index.js"
  }
}
```

### Passo 3: Configuração do Banco de Dados Neon

**Processo**:
1. Criação de conta no [Neon](https://neon.tech/)
2. Criação de novo projeto
3. Obtenção da connection string:
```
postgresql://neondb_owner:npg_WvEZaIHiJ7j1@ep-falling-frost-a81spmxk-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
```

### Passo 4: Criação do Arquivo .env

**Problema Encontrado**:
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

**Causa**: Arquivo `.env` não existia ou estava mal formatado.

**Solução**:
1. Criação manual do arquivo `.env` na raiz do projeto
2. Conteúdo corrigido (sem espaços e caracteres especiais):
```env
DATABASE_URL=postgresql://neondb_owner:npg_WvEZaIHiJ7j1@ep-falling-frost-a81spmxk-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
SESSION_SECRET=upleer_development_secret_key_123456789_muito_segura
NODE_ENV=development
REPLIT_DOMAINS=localhost:5000,localhost:5173
```

### Passo 5: Correção do Carregamento do .env

**Problema Encontrado**: O arquivo `.env` não estava sendo lido pelo Node.js.

**Solução**:
1. Instalação do dotenv:
```bash
npm install dotenv
```

2. Adição do import no `server/db.ts`:
```typescript
import 'dotenv/config';
```

### Passo 6: Execução das Migrações
```bash
npm run db:push
```

**Status**: ✅ Sucesso - tabelas criadas no Neon

### Passo 7: Correção de Problemas de Rede

**Problema Encontrado**:
```
Error: listen ENOTSUP: operation not supported on socket 0.0.0.0:5000
```

**Causa**: 
- Porta 5000 hardcoded no código
- Host `0.0.0.0` não suportado adequadamente no Windows

**Soluções Implementadas**:

1. **Porta configurável** (`server/index.ts`):
```typescript
// Antes
const port = 5000;

// Depois  
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
```

2. **Host IPv4 específico**:
```typescript
// Antes
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`serving on port ${port}`);
});

// Depois
server.listen(port, "127.0.0.1", () => {
  log(`serving on port ${port}`);
});
```

### Passo 8: Execução Final

**Comando utilizado**:
```bash
set PORT=3000 && npm run dev
```

**Resultado**:
```
[DATABASE] Connection successful
[SERVER] Routes registered successfully  
5:33:25 PM [express] serving on port 3000
```

## 🐛 Problemas Encontrados e Soluções

### 1. Scripts Windows Incompatíveis
- **Problema**: `NODE_ENV=development` não funciona no Windows
- **Solução**: Usar `cross-env`

### 2. Variáveis de Ambiente Não Carregadas
- **Problema**: `.env` não sendo lido automaticamente
- **Solução**: Import explícito do `dotenv/config`

### 3. Problemas de Rede/Porta
- **Problema**: Host `0.0.0.0` e porta fixa causando erros
- **Solução**: Host específico `127.0.0.1` e porta configurável

### 4. Formatação do .env
- **Problema**: Espaços e caracteres especiais quebrando o parsing
- **Solução**: Arquivo limpo sem comentários ou espaços extras

## 📊 Verificações de Funcionamento

### Status dos Serviços
```bash
# Verificar porta em uso
netstat -an | findstr :3000
# Resultado: TCP 127.0.0.1:3000 0.0.0.0:0 LISTENING ✅

# Testar conexão
curl http://localhost:3000
# Resultado: Página HTML carregada ✅
```

### Logs de Funcionamento
```
[DATABASE] Connection successful ✅
[SERVER] Routes registered successfully ✅
[REQUEST] GET /api/auth/user from localhost ✅
[REQUEST] POST /api/auth/register from localhost ✅
```

## 🚀 Funcionalidades Testadas

1. **Acesso à aplicação**: ✅ `http://localhost:3000`
2. **Criação de conta**: ✅ Registro funcionando
3. **Login**: ✅ Autenticação ativa
4. **Dashboard**: ✅ Interface carregando
5. **Navegação**: ✅ Todas as rotas funcionais

## 📝 Comandos Finais de Execução

```bash
# 1. Instalar dependências
npm install

# 2. Instalar cross-env para Windows
npm install --save-dev cross-env

# 3. Instalar dotenv
npm install dotenv

# 4. Criar arquivo .env (manual)
# (conteúdo listado na seção correspondente)

# 5. Executar migrações
npm run db:push

# 6. Iniciar servidor
set PORT=3000 && npm run dev

# 7. Acessar aplicação
# http://localhost:3000
```

## 🔧 Configurações Específicas para Windows

### Arquivo package.json
```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "start": "cross-env NODE_ENV=production node dist/index.js"
  }
}
```

### Arquivo server/db.ts
```typescript
import 'dotenv/config'; // Adicionado para Windows
```

### Arquivo server/index.ts
```typescript
// Porta configurável
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Host específico para Windows
server.listen(port, "127.0.0.1", () => {
  log(`serving on port ${port}`);
});
```

## ⚠️ Pontos de Atenção

1. **Sempre use `cross-env`** para compatibilidade Windows/Unix
2. **Configure HOST explicitamente** - não use `0.0.0.0` no Windows
3. **Arquivo .env deve ser limpo** - sem espaços ou caracteres especiais
4. **Import explícito do dotenv** necessário em alguns casos
5. **Porta configurável** evita conflitos

## 🎯 Resultado Final

O projeto Upleer está **100% funcional** localmente no Windows com:
- Frontend React carregando corretamente
- Backend Express respondendo
- Banco de dados Neon conectado
- Sistema de autenticação operacional
- Todas as rotas e componentes funcionais

**Tempo total de configuração**: ~30 minutos
**Dificuldade**: Média (devido a especificidades do Windows) 