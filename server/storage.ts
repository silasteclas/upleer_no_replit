import {
  users,
  products,
  sales,
  apiIntegrations,
  apiEndpoints,
  apiLogs,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
  type Sale,
  type InsertSale,
  type ApiIntegration,
  type InsertApiIntegration,
  type ApiEndpoint,
  type InsertApiEndpoint,
  type ApiLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, count } from "drizzle-orm";

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
  
  // Sales operations
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesByAuthor(authorId: string): Promise<Sale[]>;
  
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

  // Sales operations
  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db
      .insert(sales)
      .values(sale)
      .returning();
    return newSale;
  }

  async getSalesByAuthor(authorId: string): Promise<(Sale & { product: { title: string; author: string } })[]> {
    return await db
      .select({
        id: sales.id,
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
        createdAt: sales.createdAt,
        product: {
          title: products.title,
          author: products.author,
        }
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(eq(products.authorId, authorId))
      .orderBy(desc(sales.createdAt));
  }

  // Analytics operations
  async getAuthorStats(authorId: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    activeProducts: number;
    pendingProducts: number;
  }> {
    // Get sales stats
    const [salesStats] = await db
      .select({
        totalSales: count(sales.id),
        totalRevenue: sum(sales.salePrice),
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(eq(products.authorId, authorId));

    // Get product counts
    const [activeCount] = await db
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.authorId, authorId), eq(products.status, "approved")));

    const [pendingCount] = await db
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.authorId, authorId), eq(products.status, "pending")));

    return {
      totalSales: salesStats.totalSales || 0,
      totalRevenue: Number(salesStats.totalRevenue) || 0,
      activeProducts: activeCount.count || 0,
      pendingProducts: pendingCount.count || 0,
    };
  }

  async getSalesData(authorId: string, months: number): Promise<{
    month: string;
    sales: number;
    revenue: number;
  }[]> {
    // This is a simplified implementation - in production you'd want proper date handling
    const data = await db
      .select({
        month: sales.createdAt,
        sales: count(sales.id),
        revenue: sum(sales.authorEarnings),
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(eq(products.authorId, authorId))
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
