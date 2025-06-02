import {
  users,
  products,
  sales,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
  type Sale,
  type InsertSale,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProductsByAuthor(authorId: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
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

  async getSalesByAuthor(authorId: string): Promise<Sale[]> {
    return await db
      .select({
        id: sales.id,
        productId: sales.productId,
        buyerEmail: sales.buyerEmail,
        salePrice: sales.salePrice,
        commission: sales.commission,
        authorEarnings: sales.authorEarnings,
        createdAt: sales.createdAt,
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
        totalRevenue: sum(sales.authorEarnings),
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
}

export const storage = new DatabaseStorage();
