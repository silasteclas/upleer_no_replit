# Componentes Frontend

## Visão Geral

O frontend do Upleer é construído com React e TypeScript, utilizando uma biblioteca de componentes baseada em Radix UI com estilização via Tailwind CSS.

## Estrutura de Componentes

### Hierarquia

```
App.tsx
├── Router (Wouter)
│   ├── Páginas Públicas
│   │   ├── Landing
│   │   ├── Login
│   │   └── Register
│   └── Páginas Autenticadas
│       ├── Layout (Sidebar + Header)
│       │   ├── Dashboard
│       │   ├── Products
│       │   ├── Sales
│       │   └── Settings
│       └── Páginas sem Layout
│           └── NotFound
└── Providers
    ├── QueryClientProvider
    ├── TooltipProvider
    └── Toaster
```

## Componentes de Layout

### Sidebar (`/components/layout/sidebar.tsx`)

Navegação lateral principal da aplicação.

**Props:**
```typescript
interface SidebarProps {
  // Sem props, usa hooks internamente
}
```

**Features:**
- Menu responsivo
- Indicador de rota ativa
- Avatar do usuário
- Logout

**Uso:**
```tsx
<Sidebar />
```

### Header (`/components/layout/header.tsx`)

Cabeçalho contextual das páginas.

**Props:**
```typescript
interface HeaderProps {
  title: string;
  subtitle: string;
}
```

**Uso:**
```tsx
<Header 
  title="Dashboard" 
  subtitle="Visão geral das suas publicações"
/>
```

## Componentes UI Base

### Button

Botão versátil com múltiplas variantes.

**Variantes:**
- `default`: Botão padrão
- `destructive`: Ações destrutivas
- `outline`: Botão com borda
- `secondary`: Ação secundária
- `ghost`: Sem background
- `link`: Estilo de link

**Tamanhos:**
- `default`, `sm`, `lg`, `icon`

**Exemplo:**
```tsx
<Button variant="outline" size="sm">
  Clique aqui
</Button>
```

### Card

Container para conteúdo agrupado.

**Componentes:**
- `Card`: Container principal
- `CardHeader`: Cabeçalho
- `CardTitle`: Título
- `CardDescription`: Descrição
- `CardContent`: Conteúdo
- `CardFooter`: Rodapé

**Exemplo:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo do card
  </CardContent>
</Card>
```

### Form

Sistema de formulários com React Hook Form.

**Componentes:**
- `Form`: Provider do formulário
- `FormField`: Campo individual
- `FormItem`: Container do campo
- `FormLabel`: Label
- `FormControl`: Wrapper do input
- `FormDescription`: Texto de ajuda
- `FormMessage`: Mensagem de erro

**Exemplo:**
```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### Dialog

Modal para interações.

**Componentes:**
- `Dialog`: Root
- `DialogTrigger`: Elemento que abre
- `DialogContent`: Conteúdo
- `DialogHeader`: Cabeçalho
- `DialogTitle`: Título
- `DialogDescription`: Descrição

**Exemplo:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    Conteúdo
  </DialogContent>
</Dialog>
```

## Componentes Específicos

### Dashboard Components

#### StatsCards (`/components/dashboard/stats-cards.tsx`)

Cards de estatísticas com ícones e valores.

**Features:**
- Loading skeleton
- Formatação de valores
- Ícones contextuais

#### SalesChart (`/components/dashboard/sales-chart.tsx`)

Gráfico de vendas com Recharts.

**Features:**
- Gráfico de área
- Tooltip customizado
- Responsivo

#### RecentProducts (`/components/dashboard/recent-products.tsx`)

Lista de produtos recentes.

**Features:**
- Status badges
- Links para detalhes
- Avatar placeholders

### Upload Components

#### UploadModal (`/components/upload/upload-modal.tsx`)

Modal completo de upload de produtos.

**Features:**
- Upload de PDF e imagem
- Validação de arquivos
- Preview de imagem
- Cálculo de margem

**Estados:**
1. Seleção de arquivos
2. Preenchimento de dados
3. Processando upload
4. Sucesso/Erro

#### SuccessScreen (`/components/upload/success-screen.tsx`)

Tela de sucesso pós-upload.

**Features:**
- Resumo do produto
- Próximas ações
- Animações

## Hooks Customizados

### useAuth

Gerenciamento de autenticação.

```typescript
const {
  user,
  isAuthenticated,
  isLoading,
  error,
  login,
  logout,
  refetch
} = useAuth();
```

### useToast

Sistema de notificações.

```typescript
const { toast } = useToast();

toast({
  title: "Sucesso",
  description: "Operação realizada",
  variant: "default" // ou "destructive"
});
```

### useMobile

Detecção de dispositivo móvel.

```typescript
const isMobile = useMobile(); // boolean
```

## Padrões de Estilização

### Tailwind Classes

Organização recomendada:

```tsx
className={cn(
  // Layout
  "flex flex-col gap-4",
  // Spacing
  "p-6",
  // Colors
  "bg-white dark:bg-gray-900",
  // Borders
  "border rounded-lg",
  // States
  "hover:shadow-lg",
  // Responsive
  "md:flex-row",
  // Condicional
  isActive && "ring-2 ring-blue-500"
)}
```

### Variantes com CVA

```typescript
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-classes",
        outline: "outline-classes"
      }
    }
  }
);
```

## Componentes de Integração

### EndpointTester (`/components/integrations/endpoint-tester.tsx`)

Testador de endpoints de API.

**Features:**
- Editor de headers
- Editor de body JSON
- Visualização de resposta
- Medição de tempo

## Best Practices

### 1. Composição

Prefira composição sobre props complexas:

```tsx
// ✅ Bom
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
</Card>

// ❌ Evitar
<Card title="Título" />
```

### 2. Tipos

Sempre tipar props e estados:

```typescript
interface ComponentProps {
  title: string;
  onAction: (id: number) => void;
}
```

### 3. Loading States

Use Skeleton para loading:

```tsx
if (isLoading) {
  return <Skeleton className="h-20 w-full" />;
}
```

### 4. Error Handling

Trate erros consistentemente:

```tsx
if (error) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
```

### 5. Acessibilidade

- Use componentes Radix (já acessíveis)
- Adicione `aria-label` quando necessário
- Mantenha foco keyboard-navigable

## Componentes Utilitários

### Separator

Linha divisória visual.

```tsx
<Separator orientation="horizontal" />
```

### Badge

Labels para status e categorias.

```tsx
<Badge variant="outline">Pendente</Badge>
```

### Skeleton

Placeholder para loading.

```tsx
<Skeleton className="h-4 w-[200px]" />
```

### Avatar

Imagem de perfil com fallback.

```tsx
<Avatar>
  <AvatarImage src={user.image} />
  <AvatarFallback>JS</AvatarFallback>
</Avatar>
```

## Performance

### Otimizações Implementadas

1. **React.memo** em componentes pesados
2. **useMemo** para cálculos complexos
3. **useCallback** para funções em deps
4. **Lazy loading** de rotas
5. **Code splitting** automático via Vite

### Monitoramento

- React DevTools Profiler
- Lighthouse para métricas
- Bundle analyzer do Vite 