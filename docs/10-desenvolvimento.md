# Guia de Desenvolvimento

## Configuração do Ambiente

### IDE Recomendada

**Visual Studio Code** com as seguintes extensões:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Prisma (para visualizar schemas)
- Thunder Client (para testar APIs)

### Configuração do VSCode

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Estrutura de Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor com hot reload

# Build
npm run build        # Build de produção
npm run check        # Verifica tipos TypeScript

# Banco de Dados
npm run db:push      # Aplica schema ao banco
```

### Fluxo de Desenvolvimento

1. **Frontend Development**
   - Vite serve arquivos com HMR
   - Proxy automático para API em `/api`
   - React DevTools para debug

2. **Backend Development**
   - tsx com watch mode
   - Logs coloridos no console
   - Recarregamento automático

## Padrões de Código

### TypeScript

#### Tipos vs Interfaces

```typescript
// Use interface para objetos
interface User {
  id: string;
  email: string;
  name: string;
}

// Use type para unions e utilidades
type Status = 'pending' | 'approved' | 'rejected';
type Nullable<T> = T | null;
```

#### Imports

```typescript
// Ordem de imports
import { useState, useEffect } from 'react';        // 1. React
import { useQuery } from '@tanstack/react-query';   // 2. Bibliotecas
import { Button } from '@/components/ui/button';    // 3. Componentes internos
import { apiRequest } from '@/lib/queryClient';     // 4. Utilitários
import type { User } from '@shared/schema';         // 5. Tipos
```

### React

#### Componentes Funcionais

```typescript
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState(false);
  
  // Hooks primeiro
  useEffect(() => {
    // efeito
  }, []);
  
  // Handlers depois
  const handleClick = () => {
    setState(true);
    onAction?.();
  };
  
  // Render por último
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Action</Button>
    </div>
  );
}
```

#### Custom Hooks

```typescript
export function useCustomHook(param: string) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    fetchData(param)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [param]);
  
  return { data, loading, error };
}
```

### API Development

#### Endpoint Pattern

```typescript
// POST /api/resource
app.post('/api/resource', requireAuth, async (req, res) => {
  try {
    // 1. Validação
    const { field1, field2 } = validateSchema.parse(req.body);
    
    // 2. Verificação de permissões
    if (!canUserAccess(req.userId, resourceId)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    // 3. Lógica de negócio
    const result = await storage.createResource({
      field1,
      field2,
      userId: req.userId
    });
    
    // 4. Resposta
    res.status(201).json(result);
    
  } catch (error) {
    // 5. Tratamento de erro
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
    }
    
    console.error('Error creating resource:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});
```

#### Storage Pattern

```typescript
// storage.ts
export class DatabaseStorage implements IStorage {
  async createResource(data: InsertResource): Promise<Resource> {
    const [resource] = await db
      .insert(resources)
      .values(data)
      .returning();
    return resource;
  }
  
  async getResourcesByUser(userId: string): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(eq(resources.userId, userId))
      .orderBy(desc(resources.createdAt));
  }
}
```

## Testes

### Estrutura de Testes

```
tests/
├── unit/          # Testes unitários
├── integration/   # Testes de integração
└── e2e/          # Testes end-to-end
```

### Exemplo de Teste Unitário

```typescript
// storage.test.ts
describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  
  beforeEach(() => {
    storage = new DatabaseStorage();
  });
  
  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        title: 'Test Product',
        authorId: 'user-123',
        // ... outros campos
      };
      
      const product = await storage.createProduct(productData);
      
      expect(product).toMatchObject({
        title: 'Test Product',
        authorId: 'user-123',
        status: 'pending'
      });
      expect(product.id).toBeDefined();
    });
  });
});
```

### Teste de Componente

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Debugging

### Frontend Debugging

#### React DevTools

1. Instalar extensão do Chrome/Firefox
2. Abrir DevTools → React tab
3. Inspecionar componentes e props
4. Profiler para performance

#### Console Logs Estruturados

```typescript
// Use grupos para logs relacionados
console.group('Upload Process');
console.log('File selected:', file);
console.log('Validation result:', isValid);
console.groupEnd();

// Use tabelas para arrays
console.table(products);

// Use cores para destaque
console.log('%c Important!', 'color: red; font-weight: bold;');
```

### Backend Debugging

#### Debug com VSCode

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

#### Logs Estruturados

```typescript
// Criar logger customizado
const log = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }
};

// Uso
log.info('Product created', { productId: product.id });
log.error('Failed to create product', error);
```

## Performance

### Frontend Optimization

#### Code Splitting

```typescript
// Lazy loading de rotas
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Products = lazy(() => import('@/pages/products'));

// Com Suspense
<Suspense fallback={<LoadingScreen />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/products" element={<Products />} />
  </Routes>
</Suspense>
```

#### Memoização

```typescript
// Memoizar componentes pesados
const ExpensiveComponent = memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Memoizar cálculos
const expensiveCalculation = useMemo(() => {
  return processLargeDataset(data);
}, [data]);

// Memoizar callbacks
const handleSubmit = useCallback((values) => {
  submitForm(values);
}, [submitForm]);
```

### Backend Optimization

#### Query Optimization

```typescript
// Usar select específico
const products = await db
  .select({
    id: products.id,
    title: products.title,
    status: products.status
  })
  .from(products)
  .where(eq(products.authorId, userId));

// Usar joins eficientes
const salesWithProducts = await db
  .select()
  .from(sales)
  .innerJoin(products, eq(sales.productId, products.id))
  .where(eq(products.authorId, userId));
```

#### Caching

```typescript
// Cache em memória simples
const cache = new Map();

async function getCachedData(key: string) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetchData(key);
  cache.set(key, data);
  
  // Limpar após 5 minutos
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  
  return data;
}
```

## Troubleshooting

### Problemas Comuns

#### 1. "Cannot find module '@/...'"

**Solução:**
```bash
# Verificar tsconfig.json paths
# Reiniciar servidor de desenvolvimento
npm run dev
```

#### 2. "Hydration mismatch"

**Causa:** Conteúdo diferente entre servidor e cliente

**Solução:**
```typescript
// Use useEffect para conteúdo dinâmico
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;
```

#### 3. "Database connection timeout"

**Verificar:**
- PostgreSQL está rodando
- DATABASE_URL está correta
- Firewall permite conexão
- Pool size adequado

#### 4. "File upload fails"

**Checklist:**
- Pasta uploads existe
- Permissões corretas
- Limite de tamanho adequado
- MIME type permitido

### Debug Avançado

#### Análise de Bundle

```bash
# Instalar analyzer
npm install --save-dev rollup-plugin-visualizer

# Adicionar ao vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({
    open: true,
    gzipSize: true,
    brotliSize: true,
  })
]
```

#### Profiling de Queries

```typescript
// Habilitar logs do Drizzle
const db = drizzle(pool, {
  logger: true
});

// Ou logger customizado
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('Query:', query);
      console.log('Params:', params);
    }
  }
});
```

## Git Workflow

### Branches

```bash
main          # Produção
├── develop   # Desenvolvimento
    ├── feature/nome-feature
    ├── fix/nome-fix
    └── hotfix/nome-hotfix
```

### Commits

```bash
# Formato
tipo(escopo): descrição

# Exemplos
feat(auth): adicionar recuperação de senha
fix(upload): corrigir validação de PDF
docs(api): atualizar documentação de webhooks
style(dashboard): ajustar espaçamento dos cards
refactor(storage): simplificar queries de vendas
test(products): adicionar testes de integração
chore(deps): atualizar dependências
```

### Pull Request Template

```markdown
## Descrição
Breve descrição do que foi feito

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Checklist
- [ ] Código segue os padrões do projeto
- [ ] Self-review realizado
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
```

## Recursos Adicionais

### Documentação Externa

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)

### Ferramentas Úteis

- **TablePlus**: GUI para PostgreSQL
- **Postman/Insomnia**: Testar APIs
- **React Developer Tools**: Debug React
- **Redux DevTools**: Se usar Redux/Zustand

### Comunidade

- Discord do projeto
- Issues no GitHub
- Stack Overflow tags: `upleer` 