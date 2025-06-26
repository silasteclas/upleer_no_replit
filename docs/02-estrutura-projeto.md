# Estrutura do Projeto

## Visão Geral

O projeto Upleer está organizado em uma estrutura monorepo com separação clara entre frontend, backend e recursos compartilhados.

## Estrutura de Diretórios

```
upleer_no_replit/
├── client/                    # Aplicação Frontend (React)
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   │   ├── dashboard/   # Componentes do dashboard
│   │   │   ├── integrations/# Componentes de integrações
│   │   │   ├── layout/      # Componentes de layout
│   │   │   ├── ui/          # Componentes UI base
│   │   │   └── upload/      # Componentes de upload
│   │   ├── hooks/           # React hooks customizados
│   │   ├── lib/             # Utilitários e configurações
│   │   ├── pages/           # Componentes de página/rotas
│   │   ├── App.tsx          # Componente raiz
│   │   ├── main.tsx         # Entry point React
│   │   └── index.css        # Estilos globais
│   └── index.html           # HTML template
├── server/                   # Aplicação Backend (Express)
│   ├── index.ts            # Entry point do servidor
│   ├── routes.ts           # Definição de rotas API
│   ├── auth.ts             # Sistema de autenticação
│   ├── real-auth.ts        # Implementação real de auth
│   ├── storage.ts          # Camada de acesso a dados
│   ├── db.ts               # Configuração do banco
│   ├── session-config.ts   # Configuração de sessões
│   └── vite.ts             # Integração com Vite
├── shared/                  # Código compartilhado
│   └── schema.ts           # Schemas do banco de dados
├── uploads/                 # Arquivos enviados
├── attached_assets/         # Assets do projeto
├── docs/                    # Documentação
└── Arquivos de configuração
```

## Detalhamento por Módulo

### Frontend (`/client`)

#### Páginas (`/pages`)
- `landing.tsx` - Página inicial para usuários não autenticados
- `login.tsx` - Página de login
- `register.tsx` - Página de cadastro
- `dashboard.tsx` - Dashboard principal
- `products.tsx` - Listagem de produtos
- `product-view.tsx` - Visualização de produto
- `product-edit.tsx` - Edição de produto
- `sales.tsx` - Listagem de vendas
- `sale-details.tsx` - Detalhes de venda
- `settings.tsx` - Configurações do usuário
- `integrations.tsx` - Gestão de integrações
- `upload.tsx` - Upload de produtos

#### Componentes UI (`/components/ui`)
Biblioteca de componentes base construída com Radix UI:
- `button.tsx` - Botões
- `card.tsx` - Cards
- `dialog.tsx` - Modais
- `form.tsx` - Formulários
- `input.tsx` - Inputs
- `select.tsx` - Selects
- `table.tsx` - Tabelas
- E mais 40+ componentes

#### Componentes de Layout (`/components/layout`)
- `header.tsx` - Cabeçalho da aplicação
- `sidebar.tsx` - Menu lateral

#### Componentes Específicos
- `/dashboard` - Cards de estatísticas, gráficos
- `/upload` - Modal de upload, tela de sucesso
- `/integrations` - Testador de endpoints

#### Hooks (`/hooks`)
- `useAuth.ts` - Gerenciamento de autenticação
- `useAdminAuth.ts` - Autenticação de admin
- `useToast.ts` - Sistema de notificações
- `useMobile.tsx` - Detecção de dispositivo móvel

#### Utilitários (`/lib`)
- `queryClient.ts` - Configuração do TanStack Query
- `authUtils.ts` - Funções auxiliares de auth
- `utils.ts` - Funções utilitárias gerais

### Backend (`/server`)

#### Arquivos Principais
- `index.ts` - Configuração do Express e middlewares
- `routes.ts` - Todas as rotas da API
- `storage.ts` - Interface de acesso ao banco de dados
- `db.ts` - Conexão com PostgreSQL via Drizzle

#### Módulos de Autenticação
- `auth.ts` - Interface de autenticação
- `real-auth.ts` - Implementação com bcrypt
- `session-config.ts` - Configuração de sessões

#### Integrações
- `vite.ts` - Dev server com Vite

### Compartilhado (`/shared`)

- `schema.ts` - Definições de tabelas e tipos TypeScript

### Arquivos de Configuração

#### Build e Desenvolvimento
- `vite.config.ts` - Configuração do Vite
- `tsconfig.json` - Configuração TypeScript
- `tailwind.config.ts` - Configuração Tailwind CSS
- `postcss.config.js` - Configuração PostCSS
- `drizzle.config.ts` - Configuração Drizzle ORM

#### Dependências
- `package.json` - Dependências e scripts
- `package-lock.json` - Lock file

#### Componentes UI
- `components.json` - Configuração shadcn/ui

## Convenções de Nomenclatura

### Arquivos
- **Componentes React**: PascalCase (`ProductView.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useAuth.ts`)
- **Utilitários**: camelCase (`queryClient.ts`)
- **Páginas**: kebab-case (`product-view.tsx`)

### Diretórios
- Sempre em lowercase
- Usar hífens para separar palavras
- Agrupar por funcionalidade

### Imports
- Usar aliases configurados:
  - `@/` para `client/src/`
  - `@shared/` para `shared/`
  - `@assets/` para `attached_assets/`

## Scripts Disponíveis

```json
{
  "dev": "Inicia servidor de desenvolvimento",
  "build": "Build de produção",
  "start": "Inicia servidor de produção",
  "check": "Verifica tipos TypeScript",
  "db:push": "Atualiza schema do banco"
}
```

## Fluxo de Build

1. **Development**:
   - Frontend servido pelo Vite HMR
   - Backend com hot reload via tsx
   - Proxy configurado para API

2. **Production**:
   - Frontend: Build estático com Vite
   - Backend: Bundle com esbuild
   - Assets servidos pelo Express

## Organização de Assets

### Uploads (`/uploads`)
- PDFs de livros
- Imagens de capa
- Fotos de perfil
- Nomeados com hash MD5

### Assets Anexados (`/attached_assets`)
- Logo da aplicação
- Imagens de documentação
- Screenshots
- Recursos estáticos 