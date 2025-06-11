import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import crypto from "crypto";
import { registerUser, loginUser, getCurrentUser, logoutUser, requireAuth } from "./real-auth";

// Webhook function to send product data to N8N
async function sendProductToWebhook(product: any) {
  const webhookUrl = 'https://auton8n.upleer.com.br/webhook/5b04bf83-a7d2-4eec-9d85-dfa14f2e3e00';
  
  try {
    console.log(`[WEBHOOK] Sending product ${product.id} to webhook...`);
    console.log(`[WEBHOOK] Full product data:`, JSON.stringify(product, null, 2));
    
    // Primeiro teste com dados simplificados que funcionaram no teste manual
    const simpleData = {
      id: product.id,
      title: product.title || 'Produto sem título',
      author: product.author || 'Autor não informado',
      salePrice: product.salePrice || '0.00',
      status: product.status || 'pending',
      test: true
    };

    console.log(`[WEBHOOK] Sending simplified data:`, JSON.stringify(simpleData, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Upleer-Webhook/1.0'
      },
      body: JSON.stringify(simpleData)
    });

    const responseText = await response.text();
    console.log(`[WEBHOOK] Response status:`, response.status);
    console.log(`[WEBHOOK] Response headers:`, JSON.stringify([...response.headers.entries()]));
    
    if (response.ok) {
      console.log(`[WEBHOOK] Product ${product.id} sent successfully to webhook`);
      console.log(`[WEBHOOK] Response:`, responseText);
    } else {
      console.error(`[WEBHOOK] Failed to send product ${product.id}:`, response.status, response.statusText);
      console.error(`[WEBHOOK] Response body:`, responseText);
      console.error(`[WEBHOOK] Request URL:`, webhookUrl);
      
      // Teste adicional para verificar se a URL está acessível
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Upleer-Test/1.0'
          }
        });
        console.log(`[WEBHOOK] GET test status:`, testResponse.status);
        const testText = await testResponse.text();
        console.log(`[WEBHOOK] GET test response:`, testText);
      } catch (testError) {
        console.error(`[WEBHOOK] GET test error:`, testError);
      }
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error sending product ${product.id} to webhook:`, error);
    console.error(`[WEBHOOK] Error details:`, error.message, error.stack);
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
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

  // New endpoint that matches frontend expectations
  app.post("/api/products", requireAuth, upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "cover", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const {
        title, description, isbn, author, coAuthors, genre, language,
        targetAudience, pageCount, baseCost, salePrice
      } = req.body;

      if (!title || !author || !genre || !salePrice) {
        return res.status(400).json({
          message: "Campos obrigatórios: title, author, genre, salePrice"
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
        description: description || "",
        author,
        isbn: isbn || undefined,
        coAuthors: coAuthors || undefined,
        genre,
        language: language || "português",
        targetAudience: targetAudience || undefined,
        pdfUrl: pdfUrl || "/uploads/placeholder.pdf",
        coverImageUrl: coverImageUrl || undefined,
        pageCount: parseInt(pageCount) || 1,
        baseCost: baseCost?.toString() || "0.00",
        salePrice: salePrice.toString(),
        marginPercent: 150,
        status: "pending",
        authorId: userId
      });

      // Send to webhook
      await sendProductToWebhook(product);

      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
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

  // Settings endpoints
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      res.json({
        phone: user?.phone || "",
        bio: "",
        banking: {
          bankName: "",
          accountType: "corrente",
          agency: "",
          account: "",
          accountDigit: "",
          cpf: "",
          holderName: ""
        }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/settings/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { firstName, lastName, email, phone, bio, profileImage } = req.body;
      
      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        phone,
        profileImageUrl: profileImage || null
      });
      
      res.json({ 
        message: "Perfil atualizado com sucesso",
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/settings/banking", requireAuth, async (req, res) => {
    try {
      // For now, just return success since we don't have banking storage
      res.json({ message: "Dados bancários atualizados com sucesso" });
    } catch (error) {
      console.error("Error updating banking:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}