# 📁 Scripts de Teste - Upleer N8N

Esta pasta contém scripts para testar e enviar produtos existentes do banco de dados para o N8N.

## 📋 Arquivos Disponíveis

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `list_products.cjs` | Lista produtos do banco | `node scripts/list_products.cjs` |
| `resend_single_product.cjs` | Reenvia produto específico | `node scripts/resend_single_product.cjs [ID]` |
| `resend_products.cjs` | Reenvia múltiplos produtos | `node scripts/resend_products.cjs` |
| `SCRIPTS_N8N.md` | Documentação completa | Leia para detalhes |

## 🚀 Como Usar

### 1. Listar Produtos
```bash
node scripts/list_products.cjs
```

### 2. Enviar Produto Específico
```bash
node scripts/resend_single_product.cjs 15
```

### 3. Enviar Múltiplos Produtos
```bash
node scripts/resend_products.cjs
```

## ⚠️ Pré-requisitos

- Servidor rodando (`npm run dev` em outro terminal)
- Arquivo `.env` configurado
- Banco de dados acessível

## 📚 Documentação Completa

Leia `SCRIPTS_N8N.md` para instruções detalhadas, exemplos e resolução de problemas.

---

**💡 Execute sempre a partir da raiz do projeto!** 