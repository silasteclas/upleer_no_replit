import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("author").notNull(), // 'author' or 'admin'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  isbn: varchar("isbn"),
  author: varchar("author").notNull(),
  coAuthors: varchar("co_authors"),
  genre: varchar("genre").notNull(),
  language: varchar("language").notNull().default("português"),
  targetAudience: varchar("target_audience"),
  pdfUrl: varchar("pdf_url").notNull(),
  coverImageUrl: varchar("cover_image_url"),
  pageCount: integer("page_count").notNull(),
  baseCost: decimal("base_cost", { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  marginPercent: integer("margin_percent").notNull().default(150),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, published, archived
  publicUrl: varchar("public_url"), // URL do produto na loja oficial
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  buyerEmail: varchar("buyer_email"),
  buyerName: varchar("buyer_name"),
  buyerPhone: varchar("buyer_phone"),
  buyerCpf: varchar("buyer_cpf"),
  buyerAddress: varchar("buyer_address"),
  buyerCity: varchar("buyer_city"),
  buyerState: varchar("buyer_state"),
  buyerZipCode: varchar("buyer_zip_code"),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull(),
  authorEarnings: decimal("author_earnings", { precision: 10, scale: 2 }).notNull(),
  // Novos campos de pagamento e entrega
  orderDate: timestamp("order_date"),
  paymentStatus: varchar("payment_status").default("pendente"), // pendente, aprovado, devolvido
  paymentMethod: varchar("payment_method"), // cartao_credito, boleto, pix
  installments: integer("installments").default(1),
  discountCoupon: varchar("discount_coupon"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  shippingCarrier: varchar("shipping_carrier"),
  deliveryDays: integer("delivery_days"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  author: one(users, {
    fields: [products.authorId],
    references: [users.id],
  }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  product: one(products, {
    fields: [sales.productId],
    references: [products.id],
  }),
}));

// Schemas
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

// API Integrations table
export const apiIntegrations = pgTable("api_integrations", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  baseUrl: varchar("base_url").notNull(),
  authType: varchar("auth_type").notNull(), // 'api_key', 'oauth', 'bearer', 'basic'
  authConfig: jsonb("auth_config").notNull(), // stores auth credentials securely
  headers: jsonb("headers"), // default headers
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API Endpoints table
export const apiEndpoints = pgTable("api_endpoints", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => apiIntegrations.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").notNull(), // GET, POST, PUT, DELETE, etc.
  requestBody: jsonb("request_body"), // template for request body
  responseMapping: jsonb("response_mapping"), // how to map response data
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API Logs table
export const apiLogs = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => apiIntegrations.id),
  endpointId: integer("endpoint_id").references(() => apiEndpoints.id),
  method: varchar("method").notNull(),
  url: text("url").notNull(),
  requestHeaders: jsonb("request_headers"),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status"),
  responseHeaders: jsonb("response_headers"),
  responseBody: jsonb("response_body"),
  responseTime: integer("response_time"), // in milliseconds
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for API tables
export const apiIntegrationsRelations = relations(apiIntegrations, ({ many }) => ({
  endpoints: many(apiEndpoints),
  logs: many(apiLogs),
}));

export const apiEndpointsRelations = relations(apiEndpoints, ({ one, many }) => ({
  integration: one(apiIntegrations, {
    fields: [apiEndpoints.integrationId],
    references: [apiIntegrations.id],
  }),
  logs: many(apiLogs),
}));

export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  integration: one(apiIntegrations, {
    fields: [apiLogs.integrationId],
    references: [apiIntegrations.id],
  }),
  endpoint: one(apiEndpoints, {
    fields: [apiLogs.endpointId],
    references: [apiEndpoints.id],
  }),
}));

// API schemas
export const insertApiIntegrationSchema = createInsertSchema(apiIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiEndpointSchema = createInsertSchema(apiEndpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;
export type ApiIntegration = typeof apiIntegrations.$inferSelect;
export type InsertApiIntegration = z.infer<typeof insertApiIntegrationSchema>;
export type ApiEndpoint = typeof apiEndpoints.$inferSelect;
export type InsertApiEndpoint = z.infer<typeof insertApiEndpointSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;
