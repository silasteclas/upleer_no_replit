# Refatoração para Modelo de Marketplace - Plano de Implementação

## 📋 Visão Geral

Este documento detalha o plano completo para refatorar o sistema Upleer de um modelo de vendas simples para um **modelo de marketplace adequado**, onde múltiplos vendedores podem ter produtos em um único pedido, mas cada vendedor vê apenas suas próprias vendas.

## 🎯 Objetivo

Transformar a estrutura atual de dados para suportar:
- **Pedidos multi-vendedor**: Um pedido pode conter produtos de vários autores
- **Isolamento por vendedor**: Cada autor vê apenas suas vendas
- **Integridade referencial**: Relacionamentos bem definidos entre orders → sales → sale_items
- **Relatórios precisos**: Sem duplicação de dados

## 🚨 Considerações Críticas

### ⚠️ Tabela `produto_nuvemshop_mapping` - ESSENCIAL
**ATENÇÃO**: A tabela `produto_nuvemshop_mapping` é **CRÍTICA** para o funcionamento do sistema. Ela permite que o N8N identifique qual produto pertence a qual autor. **DEVE permanecer intacta e funcionando** durante toda a refatoração.

## 📊 Nova Estrutura de Dados

### 1. Tabela `orders` (NOVA)
**Finalidade**: Armazenar informações gerais do pedido da Nuvem Shop

```sql
CREATE TABLE orders (
  id VARCHAR PRIMARY KEY,           -- ID original da Nuvem Shop
  cliente_nome VARCHAR NOT NULL,
  cliente_email VARCHAR NOT NULL,
  valor_total DECIMAL(10,2),        -- Valor total do pedido completo
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Tabela `sales` (MODIFICAR ATUAL)
**Finalidade**: Uma venda para cada vendedor dentro de um pedido

```sql
-- Adicionar colunas à tabela atual:
ALTER TABLE sales ADD COLUMN order_id VARCHAR;
ALTER TABLE sales ADD COLUMN author_id VARCHAR;
-- Renomear/ajustar outras colunas conforme necessário
```

### 3. Tabela `sale_items` (NOVA)
**Finalidade**: Produtos específicos de cada venda

```sql
CREATE TABLE sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id VARCHAR NOT NULL,
  product_name VARCHAR NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);
```

## 🔄 Fluxo de Dados com Nova Estrutura

### Exemplo: Cliente compra produtos dos Vendedores A e B

#### 1. Inserir em `orders`:
```sql
INSERT INTO orders (id, cliente_nome, cliente_email, valor_total)
VALUES ('1739350610', 'João Silva', 'joao@email.com', 160.04);
```

#### 2. Inserir em `sales` (uma para cada vendedor):
```sql
INSERT INTO sales (order_id, author_id, valor_total) VALUES
('1739350610', 'vendedor_A', 73.37),
('1739350610', 'vendedor_B', 86.67);
```

#### 3. Inserir em `sale_items`:
```sql
INSERT INTO sale_items (sale_id, product_id, product_name, price, quantity) VALUES
(1, 'produto_19', 'Comandos Elétricos', 73.37, 1),
(2, 'produto_20', 'Ar Condicionado', 86.67, 1);
```

## 🚀 Fases de Implementação

### **FASE 1: Criação das Novas Tabelas**
**Duração estimada**: 30 minutos

#### 1.1 Atualizar Schema Drizzle
- Adicionar tabela `orders` ao `shared/schema.ts`
- Adicionar tabela `sale_items` ao `shared/schema.ts`
- Modificar tabela `sales` (adicionar `order_id`, `author_id`)
- Definir relacionamentos entre as tabelas

#### 1.2 Gerar Migration
- Executar `drizzle-kit generate` para criar migrations
- Aplicar migrations no banco de dados

#### 1.3 Verificar Integridade
- Confirmar que `produto_nuvemshop_mapping` permanece intacta
- Testar conexões e relacionamentos

---

### **FASE 2: Migração de Dados Existentes**
**Duração estimada**: 45 minutos

#### 2.1 Script de Migração
- Criar script para migrar dados atuais da tabela `sales`
- Gerar registros em `orders` baseados em vendas existentes
- Popular `sale_items` com dados migrados
- Manter referências para `produto_nuvemshop_mapping`

#### 2.2 Backup de Segurança
- Fazer backup completo do banco antes da migração
- Criar tabelas temporárias para rollback se necessário

#### 2.3 Validação de Dados
- Verificar integridade referencial
- Confirmar que todos os dados foram migrados corretamente
- Testar queries básicas

---

### **FASE 3: Novo Endpoint Webhook**
**Duração estimada**: 60 minutos

#### 3.1 Refatorar `/api/webhook/sales/batch`
- Implementar lógica: 1 order → N sales → N sale_items
- Manter compatibilidade com payload N8N atual
- Preservar funcionamento da `produto_nuvemshop_mapping`

#### 3.2 Estrutura do Novo Endpoint
```typescript
// Fluxo: Payload N8N → Orders → Sales → Sale_Items
POST /api/webhook/sales/batch
{
  "order_id": "1739350610",
  "cliente_nome": "João Silva", 
  "cliente_email": "joao@email.com",
  "valor_total": 160.04,
  "vendedores": [
    {
      "id_autor": "vendedor_A",
      "produtos": [
        {
          "id_produto_interno": "19",
          "nome": "Comandos Elétricos",
          "preco": 73.37,
          "quantidade": 1
        }
      ]
    },
    {
      "id_autor": "vendedor_B", 
      "produtos": [
        {
          "id_produto_interno": "20",
          "nome": "Ar Condicionado",
          "preco": 86.67,
          "quantidade": 1
        }
      ]
    }
  ]
}
```

#### 3.3 Manter Compatibilidade
- Suportar formato atual do N8N
- Garantir que `produto_nuvemshop_mapping` funcione
- Preservar cálculos de comissão (15%)

---

### **FASE 4: Atualização do Frontend**
**Duração estimada**: 45 minutos

#### 4.1 Modificar Queries de Storage
- Atualizar `server/storage.ts` para usar relacionamentos
- Modificar queries para buscar dados das novas tabelas
- Manter isolamento por vendedor

#### 4.2 Atualizar Dashboards
- Modificar componentes para usar nova estrutura
- Garantir que vendedores vejam apenas suas vendas
- Atualizar contadores e estatísticas

#### 4.3 Consultas Exemplo

**Dashboard do Vendedor A:**
```sql
SELECT s.*, si.*, o.cliente_nome, o.cliente_email
FROM sales s 
JOIN sale_items si ON s.id = si.sale_id 
JOIN orders o ON s.order_id = o.id
WHERE s.author_id = 'vendedor_A';
```

**Relatório geral de um pedido:**
```sql
SELECT o.*, s.author_id, s.valor_total, si.product_name, si.quantity
FROM orders o
JOIN sales s ON o.id = s.order_id  
JOIN sale_items si ON s.id = si.sale_id
WHERE o.id = '1739350610';
```

---

### **FASE 5: Testes e Validação**
**Duração estimada**: 30 minutos

#### 5.1 Testes de Integração
- Testar fluxo completo: N8N → Webhook → Banco → Frontend
- Validar isolamento de dados por vendedor
- Verificar integridade referencial

#### 5.2 Testes de Compatibilidade
- Confirmar que `produto_nuvemshop_mapping` funciona
- Testar payloads existentes do N8N
- Validar cálculos de comissão

#### 5.3 Testes de Performance
- Verificar performance das novas queries
- Testar com volume de dados simulado
- Otimizar índices se necessário

## ✅ Benefícios Esperados

### 🎯 **Isolamento Total**
- Vendedor A nunca vê dados do Vendedor B
- Cada autor acessa apenas suas próprias vendas
- Dashboards personalizados por vendedor

### 📊 **Relatórios Precisos**
- Sem duplicação de dados entre vendedores
- Relatórios consolidados por pedido
- Análises detalhadas por autor

### 🚀 **Escalabilidade**
- Suporta qualquer quantidade de vendedores por pedido
- Estrutura preparada para crescimento
- Fácil adição de novos recursos

### 🔒 **Integridade**
- Relacionamentos garantem consistência
- Validações automáticas
- Rollback seguro em caso de problemas

## 🔧 Considerações Técnicas

### **Manutenção da Compatibilidade**
- `produto_nuvemshop_mapping` permanece inalterada
- Endpoints atuais continuam funcionando
- Payload N8N mantém formato atual

### **Estratégia de Rollback**
- Backup completo antes da migração
- Tabelas temporárias para reversão
- Scripts de rollback preparados

### **Monitoramento**
- Logs detalhados durante migração
- Alertas para problemas de integridade
- Métricas de performance

## 📅 Cronograma Estimado

| Fase | Duração | Dependências |
|------|---------|--------------|
| FASE 1 | 30 min | Schema atual |
| FASE 2 | 45 min | FASE 1 completa |
| FASE 3 | 60 min | FASE 2 completa |
| FASE 4 | 45 min | FASE 3 completa |
| FASE 5 | 30 min | FASE 4 completa |
| **TOTAL** | **3h 30min** | - |

## 🚨 Pontos de Atenção

### **Críticos**
1. **`produto_nuvemshop_mapping`** deve permanecer funcional
2. Backup completo antes de iniciar
3. Testar em ambiente de desenvolvimento primeiro

### **Importantes**
1. Validar todos os relacionamentos
2. Confirmar cálculos de comissão
3. Testar payloads N8N existentes

### **Desejáveis**
1. Otimizar performance das queries
2. Adicionar índices apropriados
3. Documentar mudanças

## 🎉 Resultado Final

Após a implementação completa, o sistema terá:
- **Modelo de marketplace adequado**
- **Isolamento total entre vendedores**
- **Relatórios precisos e escaláveis**
- **Compatibilidade mantida com N8N**
- **Estrutura preparada para crescimento**

---

**Próximo passo**: Aprovação do plano e início da FASE 1 🚀 