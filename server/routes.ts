import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { registerUser, loginUser, getCurrentUser, logoutUser, requireAuth } from "./real-auth";

// Webhook function to send product data to N8N
async function sendProductToWebhook(product: any) {
  const webhookUrl = 'https://auton8n.upleer.com.br/webhook/c29d8318-4c2c-4d9f-a1ee-a2b21e7cd4ff';
  
  try {
    console.log(`[WEBHOOK] Sending product ${product.id} to webhook...`);
    
    const pdfFilename = product.pdfUrl ? product.pdfUrl.split('/').pop() : null;
    const coverFilename = product.coverImageUrl ? product.coverImageUrl.split('/').pop() : null;
    
    const webhookData = {
      id: product.id,
      title: product.title,
      description: product.description,
      author: product.author,
      isbn: product.isbn,
      coAuthors: product.coAuthors,
      category: product.category,
      originalPrice: product.originalPrice,
      salePrice: product.salePrice,
      profitMargin: product.profitMargin,
      tags: product.tags,
      status: product.status,
      authorId: product.authorId,
      pdfUrl: product.pdfUrl,
      coverImageUrl: product.coverImageUrl,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      downloadUrls: {
        productDetails: `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/products/${product.id}`,
        pdfDownload: pdfFilename ? `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/uploads/${pdfFilename}` : null,
        coverDownload: coverFilename ? `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/uploads/${coverFilename}` : null
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    if (response.ok) {
      console.log(`[WEBHOOK] Product ${product.id} sent successfully to webhook`);
    } else {
      console.error(`[WEBHOOK] Failed to send product ${product.id}:`, response.status, response.statusText);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error sending product ${product.id} to webhook:`, error);
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(file.originalname + Date.now()).digest('hex');
      cb(null, hash);
    }
  }),
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
  // Serve static files from uploads directory
  app.use('/uploads', express.static('uploads'));

  // Test database connection on startup
  try {
    await storage.getAllProducts();
    console.log('[DATABASE] Connection successful');
  } catch (error) {
    console.error('[DATABASE] Connection error:', error);
  }

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      await storage.getAllProducts();
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      res.status(503).json({ status: "error", database: "disconnected", error: errorMessage });
    }
  });

  // Setup session config for auth
  const { createSessionConfig } = await import("./session-config");
  app.use(createSessionConfig());

  // Auth routes
  app.post('/api/auth/register', registerUser);
  app.post('/api/auth/login', loginUser);
  app.get('/api/auth/user', getCurrentUser);
  app.post('/api/auth/logout', logoutUser);

  // Protected routes for authors
  app.post("/api/upload", requireAuth, upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "cover", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const {
        title, description, author, isbn, coAuthors, category,
        originalPrice, salePrice, profitMargin, tags
      } = req.body;

      if (!title || !description || !author || !category || !salePrice) {
        return res.status(400).json({
          message: "Campos obrigatórios: title, description, author, category, salePrice"
        });
      }

      const userId = (req as any).userId;
      
      let pdfUrl = null;
      let coverImageUrl = null;

      if (files.pdf && files.pdf[0]) {
        pdfUrl = `/uploads/${files.pdf[0].filename}`;
      }

      if (files.cover && files.cover[0]) {
        coverImageUrl = `/uploads/${files.cover[0].filename}`;
      }

      const product = await storage.createProduct({
        title,
        description,
        author,
        isbn: isbn || undefined,
        coAuthors: coAuthors || undefined,
        genre: category,
        language: "português",
        targetAudience: undefined,
        pdfUrl: pdfUrl || "/uploads/placeholder.pdf",
        coverImageUrl: coverImageUrl || undefined,
        pageCount: 100,
        baseCost: "10.00",
        salePrice: salePrice.toString(),
        marginPercent: 150,
        status: "pending",
        authorId: userId
      });

      // Send to webhook
      await sendProductToWebhook(product);

      res.status(201).json(product);
    } catch (error) {
      console.error("Error uploading product:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const products = await storage.getProductsByAuthor(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = (req as any).userId;
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      if (product.authorId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = (req as any).userId;
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      if (product.authorId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const updatedProduct = await storage.updateProduct(productId, req.body);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/sales", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const sales = await storage.getSalesByAuthor(userId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const stats = await storage.getAuthorStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/sales-data", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const months = parseInt(req.query.months as string) || 6;
      const salesData = await storage.getSalesData(userId, months);
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Logout endpoints - support both GET and POST
  const logoutHandler = (req: any, res: any) => {
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ message: "Erro ao fazer logout" });
        }
        res.json({ message: "Logout realizado com sucesso" });
      });
    } else {
      res.json({ message: "Logout realizado com sucesso" });
    }
  };

  app.get("/api/auth/logout", logoutHandler);
  app.post("/api/auth/logout", logoutHandler);

  const httpServer = createServer(app);
  return httpServer;
}