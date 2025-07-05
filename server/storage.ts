import {
  users,
  products,
  sales,
  orders,
  saleItems,
  apiIntegrations,
  apiEndpoints,
  apiLogs,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
  type Sale,
  type InsertSale,
  type Order,
  type InsertOrder,
  type SaleItem,
  type InsertSaleItem,
  type ApiIntegration,
  type InsertApiIntegration,
  type ApiEndpoint,
  type InsertApiEndpoint,
  type ApiLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, count, max, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfileImage(id: string, profileImageUrl: string): Promise<User>;
  updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User>;

  // Admin operations
  getAllUsers(): Promise<User[]>;

  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProductsByAuthor(authorId: string): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  updateProductStatus(id: number, status: string): Promise<Product>;

  // Order operations (NOVO - FASE 3)
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;

  // Sales operations
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesByAuthor(authorId: string): Promise<(Sale & { 
    product: { title: string; author: string };
    order: { cliente_nome: string; cliente_email: string; valor_total: number; status_envio: string };
    saleItems: { product_name: string; quantity: number; price: number; foto_produto: string | null }[];
  })[]>;
  getNextVendorOrderNumber(authorId: string): Promise<number>;

  // Sale Items operations (NOVO - FASE 3)
  createSaleItem(saleItem: InsertSaleItem): Promise<SaleItem>;
  getSaleItemsBySale(saleId: number): Promise<SaleItem[]>;

  // Analytics operations
  getAuthorStats(authorId: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    activeProducts: number;
    pendingProducts: number;
  }>;
  getSalesData(authorId: string, months: number): Promise<{
    month: string;
    sales: number;
    revenue: number;
  }[]>;

  // API Integration operations
  createApiIntegration(integration: InsertApiIntegration): Promise<ApiIntegration>;
  getApiIntegrations(): Promise<ApiIntegration[]>;
  getApiIntegration(id: number): Promise<ApiIntegration | undefined>;
  updateApiIntegration(id: number, updates: Partial<InsertApiIntegration>): Promise<ApiIntegration>;
  deleteApiIntegration(id: number): Promise<void>;

  // API Endpoint operations
  createApiEndpoint(endpoint: InsertApiEndpoint): Promise<ApiEndpoint>;
  getApiEndpoints(integrationId: number): Promise<ApiEndpoint[]>;
  updateApiEndpoint(id: number, updates: Partial<InsertApiEndpoint>): Promise<ApiEndpoint>;
  deleteApiEndpoint(id: number): Promise<void>;

  // API Logs operations
  createApiLog(log: Partial<ApiLog>): Promise<ApiLog>;
  getApiLogs(limit?: number): Promise<ApiLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfileImage(id: string, profileImageUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        profileImageUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async getProductsByAuthor(authorId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.authorId, authorId))
      .orderBy(desc(products.createdAt));
  }

  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async updateProductStatus(id: number, status: string): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ status, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  // Order operations (NOVO - FASE 3)
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
      
    return order;
  }

  // Atualiza campos parciais de um pedido (order)
  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Sales operations
  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db
      .insert(sales)
      .values(sale)
      .returning();
    return newSale;
  }

  async getNextVendorOrderNumber(authorId: string): Promise<number> {
    // Get the highest vendor_order_number for this author using max()
    const [result] = await db
      .select({ maxNumber: max(sales.vendorOrderNumber) })
      .from(sales)
      .where(eq(sales.authorId, authorId));

    return (result.maxNumber || 0) + 1;
  }

  async getSalesByAuthor(authorId: string): Promise<(Sale & { 
    product: { title: string; author: string };
    order: { cliente_nome: string; cliente_email: string; valor_total: number; status_envio: string };
    saleItems: { product_name: string; quantity: number; price: number; foto_produto: string | null }[];
  })[]> {
    // FASE 4: NOVA ESTRUTURA MARKETPLACE
    // Buscar vendas do autor com relacionamentos para orders e sale_items
    const authorSales = await db
      .select({
        // Campos da venda
        id: sales.id,
        orderId: sales.orderId,
        authorId: sales.authorId,
        vendorOrderNumber: sales.vendorOrderNumber,
        productId: sales.productId,
        buyerEmail: sales.buyerEmail,
        buyerName: sales.buyerName,
        buyerPhone: sales.buyerPhone,
        buyerCpf: sales.buyerCpf,
        buyerAddress: sales.buyerAddress,
        buyerCity: sales.buyerCity,
        buyerState: sales.buyerState,
        buyerZipCode: sales.buyerZipCode,
        salePrice: sales.salePrice,
        commission: sales.commission,
        authorEarnings: sales.authorEarnings,
        orderDate: sales.orderDate,
        paymentStatus: sales.paymentStatus,
        paymentMethod: sales.paymentMethod,
        installments: sales.installments,
        discountCoupon: sales.discountCoupon,
        discountAmount: sales.discountAmount,
        shippingCost: sales.shippingCost,
        shippingCarrier: sales.shippingCarrier,
        deliveryDays: sales.deliveryDays,
        quantity: sales.quantity,
        createdAt: sales.createdAt,

        // Campos do produto
        productTitle: products.title,
        productAuthor: products.author,

        // Campos do pedido
        orderClienteNome: orders.clienteNome,
        orderClienteEmail: orders.clienteEmail,
        orderValorTotal: orders.valorTotal,
        orderStatusEnvio: orders.statusEnvio,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .innerJoin(orders, eq(sales.orderId, orders.id))
      .where(eq(sales.authorId, authorId))
      .orderBy(desc(sales.createdAt));

    // Para cada venda, buscar os sale_items relacionados
    const salesWithItems = await Promise.all(
      authorSales.map(async (sale) => {
        const items = await db
          .select({
            product_name: saleItems.productName,
            quantity: saleItems.quantity,
            price: saleItems.price,
            foto_produto: saleItems.fotoProduto,
          })
          .from(saleItems)
          .where(eq(saleItems.saleId, sale.id));

        return {
          id: sale.id,
          orderId: sale.orderId,
          authorId: sale.authorId,
          vendorOrderNumber: sale.vendorOrderNumber,
          productId: sale.productId,
          buyerEmail: sale.buyerEmail,
          buyerName: sale.buyerName,
          buyerPhone: sale.buyerPhone,
          buyerCpf: sale.buyerCpf,
          buyerAddress: sale.buyerAddress,
          buyerCity: sale.buyerCity,
          buyerState: sale.buyerState,
          buyerZipCode: sale.buyerZipCode,
          salePrice: sale.salePrice,
          commission: sale.commission,
          authorEarnings: sale.authorEarnings,
          orderDate: sale.orderDate,
          paymentStatus: sale.paymentStatus,
          paymentMethod: sale.paymentMethod,
          installments: sale.installments,
          discountCoupon: sale.discountCoupon,
          discountAmount: sale.discountAmount,
          shippingCost: sale.shippingCost,
          shippingCarrier: sale.shippingCarrier,
          deliveryDays: sale.deliveryDays,
          quantity: sale.quantity,
          createdAt: sale.createdAt,
          product: {
            title: sale.productTitle,
            author: sale.productAuthor,
          },
          order: {
            cliente_nome: sale.orderClienteNome || '',
            cliente_email: sale.orderClienteEmail || '',
            valor_total: Number(sale.orderValorTotal) || 0,
            status_envio: sale.orderStatusEnvio || 'unpacked',
          },
          saleItems: items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            price: Number(item.price),
            foto_produto: item.foto_produto,
          })),
        };
      })
    );

    return salesWithItems;
  }

  // Sale Items operations (NOVO - FASE 3)
  async createSaleItem(saleItem: InsertSaleItem): Promise<SaleItem> {
    const [newSaleItem] = await db
      .insert(saleItems)
      .values(saleItem)
      .returning();
    return newSaleItem;
  }

  async getSaleItemsBySale(saleId: number): Promise<SaleItem[]> {
    return await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId))
      .orderBy(desc(saleItems.createdAt));
  }

  // Analytics operations
  async getAuthorStats(authorId: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    activeProducts: number;
    pendingProducts: number;
  }> {
    console.log(`[DEBUG] Getting stats for author: ${authorId}`);

    // FASE 4: NOVA ESTRUTURA MARKETPLACE
    // Get sales stats - agora usando authorId diretamente na tabela sales
    const [salesStats] = await db
      .select({
        totalSales: count(sales.id),
        totalRevenue: sum(sales.salePrice),
      })
      .from(sales)
      .where(eq(sales.authorId, authorId));

    // Debug: verificar produtos do autor PRIMEIRO
    const allProductsForAuthor = await db
      .select({ id: products.id, title: products.title, status: products.status })
      .from(products)
      .where(eq(products.authorId, authorId));

    console.log(`[DEBUG] Author ${authorId} has ${allProductsForAuthor.length} total products:`);
    allProductsForAuthor.forEach(p => {
      console.log(`[DEBUG] - Product ${p.id}: "${p.title}" - Status: "${p.status}"`);
    });

    // Contar produtos published manualmente
    const publishedProducts = allProductsForAuthor.filter(p => p.status === "published");
    const pendingProducts = allProductsForAuthor.filter(p => p.status === "pending");

    console.log(`[DEBUG] Manual count - Published: ${publishedProducts.length}, Pending: ${pendingProducts.length}`);

    // Get product counts usando a query original para comparar
    const [activeCount] = await db
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.authorId, authorId), eq(products.status, "published")));

    const [pendingCount] = await db
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.authorId, authorId), eq(products.status, "pending")));

    console.log(`[DEBUG] Query count - Published: ${activeCount.count}, Pending: ${pendingCount.count}`);

    const result = {
      totalSales: salesStats.totalSales || 0,
      totalRevenue: Number(salesStats.totalRevenue) || 0,
      activeProducts: publishedProducts.length, // Usar contagem manual
      pendingProducts: pendingProducts.length, // Usar contagem manual
    };

    console.log(`[DEBUG] Final stats for author ${authorId}:`, result);
    return result;
  }

  async getSalesData(authorId: string, months: number): Promise<{
    month: string;
    sales: number;
    revenue: number;
  }[]> {
    // FASE 4: NOVA ESTRUTURA MARKETPLACE
    // Usar authorId diretamente da tabela sales
    const data = await db
      .select({
        month: sales.createdAt,
        sales: count(sales.id),
        revenue: sum(sales.authorEarnings),
      })
      .from(sales)
      .where(eq(sales.authorId, authorId))
      .groupBy(sales.createdAt)
      .orderBy(desc(sales.createdAt))
      .limit(months);

    return data.map(item => ({
      month: item.month?.toISOString().slice(0, 7) || '',
      sales: item.sales || 0,
      revenue: Number(item.revenue) || 0,
    }));
  }

  // API Integration operations
  async createApiIntegration(integration: InsertApiIntegration): Promise<ApiIntegration> {
    const [result] = await db
      .insert(apiIntegrations)
      .values(integration)
      .returning();
    return result;
  }

  async getApiIntegrations(): Promise<ApiIntegration[]> {
    return await db.select().from(apiIntegrations).orderBy(desc(apiIntegrations.createdAt));
  }

  async getApiIntegration(id: number): Promise<ApiIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(apiIntegrations)
      .where(eq(apiIntegrations.id, id));
    return integration;
  }

  async updateApiIntegration(id: number, updates: Partial<InsertApiIntegration>): Promise<ApiIntegration> {
    const [updated] = await db
      .update(apiIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiIntegrations.id, id))
      .returning();
    return updated;
  }

  async deleteApiIntegration(id: number): Promise<void> {
    await db.delete(apiIntegrations).where(eq(apiIntegrations.id, id));
  }

  // API Endpoint operations
  async createApiEndpoint(endpoint: InsertApiEndpoint): Promise<ApiEndpoint> {
    const [result] = await db
      .insert(apiEndpoints)
      .values(endpoint)
      .returning();
    return result;
  }

  async getApiEndpoints(integrationId: number): Promise<ApiEndpoint[]> {
    return await db
      .select()
      .from(apiEndpoints)
      .where(eq(apiEndpoints.integrationId, integrationId))
      .orderBy(desc(apiEndpoints.createdAt));
  }

  async updateApiEndpoint(id: number, updates: Partial<InsertApiEndpoint>): Promise<ApiEndpoint> {
    const [updated] = await db
      .update(apiEndpoints)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiEndpoints.id, id))
      .returning();
    return updated;
  }

  async deleteApiEndpoint(id: number): Promise<void> {
    await db.delete(apiEndpoints).where(eq(apiEndpoints.id, id));
  }

  // API Logs operations
  async createApiLog(log: Partial<ApiLog>): Promise<ApiLog> {
    const [result] = await db
      .insert(apiLogs)
      .values(log as any)
      .returning();
    return result;
  }

  async getApiLogs(limit: number = 100): Promise<ApiLog[]> {
    const logs = await db
      .select({
        id: apiLogs.id,
        integrationId: apiLogs.integrationId,
        endpointId: apiLogs.endpointId,
        method: apiLogs.method,
        url: apiLogs.url,
        responseStatus: apiLogs.responseStatus,
        responseTime: apiLogs.responseTime,
        errorMessage: apiLogs.errorMessage,
        createdAt: apiLogs.createdAt,
      })
      .from(apiLogs)
      .orderBy(desc(apiLogs.createdAt))
      .limit(limit);

    // Get integration names separately
    const logsWithIntegrations = await Promise.all(
      logs.map(async (log) => {
        const [integration] = await db
          .select({ name: apiIntegrations.name })
          .from(apiIntegrations)
          .where(eq(apiIntegrations.id, log.integrationId));

        return {
          ...log,
          integration: {
            name: integration?.name || 'Unknown'
          }
        };
      })
    );

    return logsWithIntegrations as any;
  }
}

export const storage = new DatabaseStorage();