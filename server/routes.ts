import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProductSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { z } from "zod";

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdf" && file.mimetype === "application/pdf") {
      cb(null, true);
    } else if (file.fieldname === "cover" && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Product routes
  app.post('/api/products', isAuthenticated, upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.pdf || !files.pdf[0]) {
        return res.status(400).json({ message: "PDF file is required" });
      }

      // In a real implementation, you would:
      // 1. Validate PDF format and page count using pdf-lib
      // 2. Upload files to cloud storage (S3, etc.)
      // 3. Generate URLs for the files
      
      // For now, we'll simulate the validation and use placeholder URLs
      const pdfFile = files.pdf[0];
      const coverFile = files.cover?.[0];
      
      // Simulate page count validation (in real app, use pdf-lib)
      const pageCount = Math.floor(Math.random() * 50) + 10; // Random for demo
      const baseCost = pageCount * 0.5; // R$ 0.50 per page
      
      const productData = {
        authorId: userId,
        title: req.body.title,
        description: req.body.description,
        isbn: req.body.isbn || null,
        pdfUrl: `/uploads/${pdfFile.filename}`, // In production: cloud storage URL
        coverImageUrl: coverFile ? `/uploads/${coverFile.filename}` : null,
        pageCount,
        baseCost: baseCost.toString(),
        salePrice: req.body.salePrice,
        marginPercent: parseInt(req.body.marginPercent) || 150,
        status: "pending",
      };

      const validatedData = insertProductSchema.parse(productData);
      const product = await storage.createProduct(validatedData);
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const products = await storage.getProductsByAuthor(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user owns the product
      if (product.authorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Sales routes
  app.get('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sales = await storage.getSalesByAuthor(userId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getAuthorStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/analytics/sales-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const months = parseInt(req.query.months as string) || 6;
      const salesData = await storage.getSalesData(userId, months);
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      res.status(500).json({ message: "Failed to fetch sales data" });
    }
  });

  // File serving
  app.use('/uploads', isAuthenticated, (req, res, next) => {
    // In production, you'd want more sophisticated file access control
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
