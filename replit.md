# Upleer - Digital E-book Publishing Platform

## Overview

Upleer is a comprehensive e-book publishing platform designed specifically for authors to publish and sell their digital books (PDFs). The system serves as a marketplace where authors can upload their books, manage products, track sales, and integrate with external services through webhooks and APIs.

## System Architecture

### Overall Architecture

The system follows a modern 3-tier architecture:

- **Frontend**: React with TypeScript, using Vite for development and build
- **Backend**: Node.js with Express, handling API requests and business logic
- **Database**: PostgreSQL with Drizzle ORM for data persistence

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (development server and build tool)
- Tailwind CSS + Radix UI components
- TanStack Query for state management
- Wouter for client-side routing

**Backend:**
- Node.js with Express
- PostgreSQL database
- Drizzle ORM for database operations
- Multer for file uploads
- Session-based authentication
- Bcrypt for password hashing

**Infrastructure:**
- File uploads stored locally or via Supabase
- Webhook integrations with N8N
- Session storage in PostgreSQL

## Key Components

### Frontend Structure

```
client/src/
├── components/
│   ├── ui/           # Base UI components (Radix UI)
│   ├── layout/       # Layout components (Sidebar, Header)
│   ├── dashboard/    # Dashboard-specific components
│   ├── upload/       # File upload components
│   └── integrations/ # API integration components
├── pages/            # Route components
├── hooks/            # Custom React hooks
└── lib/              # Utilities and configurations
```

### Backend Structure

```
server/
├── index.ts         # Main server entry point
├── routes.ts        # API route definitions
├── storage.ts       # Database abstraction layer
├── auth.ts          # Authentication system
├── real-auth.ts     # Production authentication
└── db.ts           # Database connection
```

### Database Schema

Key tables include:
- `users` - Author and admin accounts
- `products` - E-book catalog with pricing and metadata
- `sales` - Individual sales records
- `orders` - Order management for marketplace functionality
- `sale_items` - Items within each sale
- `sessions` - User session management
- `api_integrations` - External API configurations

## Data Flow

### Product Upload Flow

1. Author uploads PDF and cover image via React frontend
2. Files are processed and stored (local filesystem or Supabase)
3. Product metadata is validated and stored in PostgreSQL
4. Webhook automatically sends product data to N8N for external processing
5. Product status is tracked through approval workflow

### Sales Processing Flow

1. External sales data received via webhook (`/api/webhook/sales`)
2. Sales data is parsed and validated
3. Commission calculations are performed (15% platform fee)
4. Sales records are created with proper author attribution
5. Authors can view sales in their dashboard

### Authentication Flow

1. User registration/login via email/password
2. Session-based authentication with PostgreSQL storage
3. Role-based access control (author vs admin)
4. Session persistence across browser restarts

## External Dependencies

### N8N Integration

The system integrates with N8N for workflow automation:
- **Webhook URL**: `https://auton8n.upleer.com.br/webhook/novo_produto`
- **Purpose**: Automated processing of new products
- **Data**: Complete product information including download URLs

### Supabase Integration

Optional file storage via Supabase:
- **Storage**: PDF files and cover images
- **Configuration**: Via environment variables
- **Fallback**: Local filesystem storage

### Database Dependencies

- **PostgreSQL**: Primary data store
- **Neon Database**: Cloud PostgreSQL provider
- **Connection**: Via connection string in `DATABASE_URL`

## Deployment Strategy

### Development

```bash
npm run dev  # Starts both frontend and backend
```

### Production Build

```bash
npm run build  # Builds frontend and backend
npm start     # Runs production server
```

### Database Management

```bash
npm run db:push  # Applies schema changes
```

### Environment Variables

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `SUPABASE_URL` - Supabase project URL (optional)
- `SUPABASE_ANON_KEY` - Supabase API key (optional)

## Changelog

- July 05, 2025. **API Endpoint Fixed**: Resolved critical issue with PATCH `/api/orders/:id/status` endpoint returning HTML instead of JSON. Fixed by implementing direct API handler before Vite middleware, removing duplicate endpoints, and ensuring proper routing. Successfully tested with real production data from Neon database (orders: 1739993213, 1740869790, 1742229144). N8N automation can now communicate with the API correctly.
- July 04, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.