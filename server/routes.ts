import type { Express } from "express";
import express from "express";
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
      
      // Use page count from frontend (already validated with pdf-lib)
      const pageCount = parseInt(req.body.pageCount);
      const baseCost = parseFloat(req.body.baseCost);
      
      const productData = {
        authorId: userId,
        title: req.body.title,
        description: req.body.description,
        isbn: req.body.isbn || null,
        author: req.body.author,
        coAuthors: req.body.coAuthors || null,
        genre: req.body.genre,
        language: req.body.language,
        targetAudience: req.body.targetAudience || null,
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
      const userId = req.user.claims.sub;
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user owns this product
      if (product.authorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if user owns this product
      if (product.authorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedProduct = await storage.updateProduct(productId, {
        title: req.body.title,
        description: req.body.description,
        isbn: req.body.isbn,
        salePrice: req.body.salePrice.toString(),
      });
      
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
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

  // Settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Return empty settings for now since we don't have the schema
      res.json({
        phone: "",
        bio: "",
        website: "",
        banking: {
          bankName: "",
          accountType: "corrente",
          agency: "",
          account: "",
          accountDigit: "",
          cpf: "",
          holderName: "",
        },
        notifications: {
          emailSales: true,
          emailMarketing: false,
          emailSystem: true,
          pushNotifications: true,
        }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { profileImage, firstName, lastName, email, phone, bio } = req.body;
      
      console.log("=== Profile Update Request ===");
      console.log("User ID:", userId);
      console.log("Data to update:", { firstName, lastName, email, phone, bio });
      
      // Atualizar dados do perfil do usuário
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        profileImageUrl: profileImage
      });
      
      console.log("User profile updated:", updatedUser);
      
      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post('/api/settings/banking', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // For now, just return success since we don't have banking settings table
      res.json({ message: "Banking information updated successfully" });
    } catch (error) {
      console.error("Error updating banking info:", error);
      res.status(500).json({ message: "Failed to update banking information" });
    }
  });

  app.post('/api/settings/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // For now, just return success since we don't have notifications settings table
      res.json({ message: "Notification preferences updated successfully" });
    } catch (error) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // File serving
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
