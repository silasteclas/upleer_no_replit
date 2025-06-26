# Documentação Upleer

## Visão Geral

O Upleer é uma plataforma completa para autores publicarem e venderem seus livros digitais (e-books em PDF). O sistema permite que autores façam upload de seus livros, gerenciem produtos, acompanhem vendas e configurem integrações com APIs externas.

## Índice de Documentação

1. [Arquitetura do Sistema](./01-arquitetura.md)
2. [Estrutura do Projeto](./02-estrutura-projeto.md)
3. [Fluxos de Dados](./03-fluxos-dados.md)
4. [API Reference](./04-api-reference.md)
5. [Banco de Dados](./05-banco-dados.md)
6. [Componentes Frontend](./06-componentes-frontend.md)
7. [Sistema de Autenticação](./07-autenticacao.md)
8. [Integrações e Webhooks](./08-integracoes-webhooks.md)
9. [Guia de Instalação](./09-instalacao.md)
10. [Guia de Desenvolvimento](./10-desenvolvimento.md)
11. [Setup Local Windows](./11-setup-local-windows.md)

## Características Principais

- **Gestão de Produtos**: Upload e gerenciamento de e-books
- **Sistema de Vendas**: Registro e acompanhamento de vendas com cálculo automático de comissões
- **Dashboard Analítico**: Estatísticas e visualizações de desempenho
- **Integrações API**: Sistema flexível para integrar com serviços externos
- **Webhooks**: Automação via N8N para processos de negócio
- **Multi-tenant**: Isolamento de dados por autor

## Stack Tecnológica

### Frontend
- React 18 com TypeScript
- Vite como bundler
- Tailwind CSS + Radix UI
- TanStack Query
- Wouter (routing)

### Backend
- Node.js com Express
- PostgreSQL com Drizzle ORM
- Autenticação baseada em sessões
- Multer para uploads

### Infraestrutura
- Webhooks via N8N
- Armazenamento de arquivos local
- Sessões persistentes em PostgreSQL

## Links Rápidos

- [Início Rápido](./09-instalacao.md#inicio-rapido)
- [Configuração de Ambiente](./09-instalacao.md#configuracao-ambiente)
- [Troubleshooting](./10-desenvolvimento.md#troubleshooting) 