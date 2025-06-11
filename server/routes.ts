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
    // Escrever logs em arquivo para debug
    const logData = {
      timestamp: new Date().toISOString(),
      productId: product.id,
      webhookUrl: webhookUrl,
      fullProduct: product
    };
    
    fs.writeFileSync('/tmp/webhook-debug.log', JSON.stringify(logData, null, 2) + '\n', { flag: 'a' });
    
    console.log(`[WEBHOOK] Sending product ${product.id} to webhook...`);
    
    // Tentar primeiro com dados completos do produto
    const pdfFilename = product.pdfUrl ? product.pdfUrl.split('/').pop() : null;
    const coverFilename = product.coverImageUrl ? product.coverImageUrl.split('/').pop() : null;
    
    const webhookData = {
      id: product.id,
      title: product.title,
      description: product.description,
      author: product.author,
      isbn: product.isbn,
      coAuthors: product.coAuthors,
      genre: product.genre,
      language: product.language,
      targetAudience: product.targetAudience,
      pageCount: product.pageCount,
      baseCost: product.baseCost,
      salePrice: product.salePrice,
      marginPercent: product.marginPercent,
      status: product.status,
      authorId: product.authorId,
      pdfUrl: product.pdfUrl,
      coverImageUrl: product.coverImageUrl,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      downloadUrls: {
        productDetails: `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/products/${product.id}`,
        pdfDownload: pdfFilename ? `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/download/pdf/${pdfFilename}` : null,
        coverDownload: coverFilename ? `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/download/cover/${coverFilename}` : null
      }
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Upleer-Webhook/1.0'
      },
      body: JSON.stringify(webhookData)
    });

    const responseText = await response.text();
    
    // Log da resposta
    const responseLog = {
      timestamp: new Date().toISOString(),
      productId: product.id,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      responseBody: responseText,
      sentData: webhookData
    };
    
    fs.writeFileSync('/tmp/webhook-response.log', JSON.stringify(responseLog, null, 2) + '\n', { flag: 'a' });
    
    if (response.ok) {
      console.log(`[WEBHOOK] Product ${product.id} sent successfully to webhook`);
    } else {
      console.error(`[WEBHOOK] Failed to send product ${product.id}:`, response.status, response.statusText);
    }
  } catch (error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      productId: product.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    fs.writeFileSync('/tmp/webhook-error.log', JSON.stringify(errorLog, null, 2) + '\n', { flag: 'a' });
    console.error(`[WEBHOOK] Error sending product ${product.id} to webhook:`, error);
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
  // Public download endpoint for webhooks/N8N integration - MUST BE BEFORE OTHER ROUTES
  app.get('/api/download/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    const filePath = path.join('uploads', filename);
    
    // Validate file type
    if (!['pdf', 'cover', 'image'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de arquivo inválido' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    try {
      const buffer = fs.readFileSync(filePath, { encoding: null });
      let contentType = 'application/octet-stream';
      let downloadName = filename;
      
      // Set content type based on file type parameter and content detection
      if (type === 'pdf' || (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF')) {
        contentType = 'application/pdf';
        downloadName = filename.includes('.pdf') ? filename : `${filename}.pdf`;
      } else if (type === 'cover' || type === 'image') {
        if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
          contentType = 'image/jpeg';
          downloadName = filename.includes('.jpg') ? filename : `${filename}.jpg`;
        } else if (buffer.length >= 8 && buffer.toString('ascii', 1, 4) === 'PNG') {
          contentType = 'image/png';
          downloadName = filename.includes('.png') ? filename : `${filename}.png`;
        } else {
          contentType = 'image/jpeg'; // default for covers
          downloadName = filename.includes('.jpg') ? filename : `${filename}.jpg`;
        }
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
      
    } catch (error) {
      console.error('Error serving download file:', error);
      res.status(500).json({ message: 'Erro ao servir arquivo' });
    }
  });

  // Download endpoint with proper file type detection
  app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    try {
      const buffer = fs.readFileSync(filePath, { encoding: null });
      let contentType = 'application/octet-stream';
      let downloadName = filename;
      
      // Detect file type by content
      if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
        contentType = 'application/pdf';
        downloadName = filename.includes('.pdf') ? filename : `${filename}.pdf`;
      } else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
        contentType = 'image/jpeg';
        downloadName = filename.includes('.jpg') ? filename : `${filename}.jpg`;
      } else if (buffer.length >= 8 && buffer.toString('ascii', 1, 4) === 'PNG') {
        contentType = 'image/png';
        downloadName = filename.includes('.png') ? filename : `${filename}.png`;
      } else if (buffer.length >= 6 && buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a') {
        contentType = 'image/gif';
        downloadName = filename.includes('.gif') ? filename : `${filename}.gif`;
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
      
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ message: 'Erro ao servir arquivo' });
    }
  });



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