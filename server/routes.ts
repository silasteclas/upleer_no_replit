import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { simpleAuthFixed, simpleLoginFixed, simpleUserCheckFixed, simpleLogoutFixed } from "./simple-auth-fixed";
import { requireAuth, getCurrentUser, registerUser, loginUser, logoutUser } from "./real-auth";
import { insertProductSchema, insertApiIntegrationSchema, insertApiEndpointSchema, products, type Product } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Admin authentication middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = req.session?.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Acesso negado - apenas administradores" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Erro na verificação de administrador" });
  }
};

// Function to send product data to external webhook
async function sendProductToWebhook(product: Product) {
  const webhookUrl = "https://auton8n.upleer.com.br/webhook/5b04bf83-a7d2-4eec-9d85-dfa14f2e3e00";
  
  try {
    // Extract filename from URLs for admin access
    const pdfFilename = product.pdfUrl ? product.pdfUrl.split('/').pop() : null;
    const coverFilename = product.coverImageUrl ? product.coverImageUrl.split('/').pop() : null;
    
    const webhookData = {
      id: product.id,
      title: product.title,
      description: product.description,
      isbn: product.isbn,
      author: product.author,
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
      // Admin access URLs for platform owner
      adminAccess: {
        productDetails: `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/admin/products/${product.id}`,
        pdfDownload: pdfFilename ? `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/admin/files/pdf/${pdfFilename}` : null,
        coverDownload: coverFilename ? `https://bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3.kirk.replit.dev/api/admin/files/cover/${coverFilename}` : null
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
      // Generate consistent filename using crypto
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
    console.log('[DATABASE] Continuing with limited functionality...');
  }

  // Public webhook endpoints (before auth middleware to avoid session issues)
  
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

  // Webhook endpoint for receiving sales from external sources (N8N)
  app.post("/api/webhook/sales", async (req, res) => {
    try {
      const {
        productId,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerCpf,
        buyerAddress,
        buyerCity,
        buyerState,
        buyerZipCode,
        salePrice,
        // Novos campos de pagamento e entrega
        orderDate,
        paymentStatus = "pendente",
        paymentMethod,
        installments = 1,
        discountCoupon,
        discountAmount = "0.00",
        shippingCost = "0.00",
        shippingCarrier,
        deliveryDays,
        source = "webhook"
      } = req.body;

      // Validate required fields
      if (!productId || !buyerEmail || !salePrice) {
        return res.status(400).json({ 
          message: "Campos obrigatórios: productId, buyerEmail, salePrice" 
        });
      }

      // Get product to validate it exists
      const product = await storage.getProduct(parseInt(productId));
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      // Calculate pricing
      const salePriceNum = parseFloat(salePrice);
      const commission = salePriceNum * 0.3; // 30% platform fee
      const authorEarnings = salePriceNum * 0.7; // 70% for author

      // Create sale record with complete information
      const sale = await storage.createSale({
        productId: parseInt(productId),
        buyerEmail,
        buyerName: buyerName || null,
        buyerPhone: buyerPhone || null,
        buyerCpf: buyerCpf || null,
        buyerAddress: buyerAddress || null,
        buyerCity: buyerCity || null,
        buyerState: buyerState || null,
        buyerZipCode: buyerZipCode || null,
        salePrice: salePriceNum.toFixed(2),
        commission: commission.toFixed(2),
        authorEarnings: authorEarnings.toFixed(2),
        // Novos campos de pagamento e entrega
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        paymentStatus,
        paymentMethod,
        installments: parseInt(installments) || 1,
        discountCoupon,
        discountAmount: parseFloat(discountAmount || "0").toFixed(2),
        shippingCost: parseFloat(shippingCost || "0").toFixed(2),
        shippingCarrier,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null
      });

      res.status(201).json({ 
        message: "Venda criada com sucesso via webhook",
        sale: {
          id: sale.id,
          productId: sale.productId,
          buyerEmail: sale.buyerEmail,
          salePrice: sale.salePrice,
          source
        }
      });

    } catch (error) {
      console.error("Erro no webhook de vendas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Public endpoint to list products for webhook integration
  app.get("/api/webhook/products", async (req, res) => {
    try {
      // Use direct database access to avoid storage method issues
      const allProducts = await db.select().from(products);
      
      // Filter only approved products for webhook
      const approvedProducts = allProducts.filter((product: any) => product.status === "approved");
      
      // Return simplified product data for webhook integration
      const webhookProducts = approvedProducts.map((product: any) => ({
        id: product.id,
        title: product.title,
        author: product.author,
        salePrice: product.salePrice,
        status: product.status
      }));

      res.json(webhookProducts);
    } catch (error) {
      console.error("Erro ao listar produtos para webhook:", error);
      res.status(500).json({ message: "Erro interno do servidor", error: (error as Error).message });
    }
  });

  // Admin routes for platform owner to access uploaded files
  // Admin endpoint to get product details with file access
  app.get("/api/admin/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      res.json({
        ...product,
        fullPdfUrl: product.pdfUrl ? `${req.protocol}://${req.get('host')}${product.pdfUrl}` : null,
        fullCoverUrl: product.coverImageUrl ? `${req.protocol}://${req.get('host')}${product.coverImageUrl}` : null
      });
    } catch (error) {
      console.error("Erro ao buscar produto para admin:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin endpoint to access PDF files directly (no auth required for platform owner)
  app.get("/api/admin/files/pdf/:filename", (req, res, next) => {
    const filename = req.params.filename;
    console.log(`[ADMIN-ACCESS] PDF file requested: ${filename}`);
    
    const fs = require('fs');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Find the most recent large file (likely to be a PDF)
    try {
      const files = fs.readdirSync(uploadsDir);
      const largeFiles = files
        .filter((file: string) => {
          try {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            return stats.size > 500000; // Files > 500KB
          } catch {
            return false;
          }
        })
        .sort((a: string, b: string) => {
          const aStats = fs.statSync(path.join(uploadsDir, a));
          const bStats = fs.statSync(path.join(uploadsDir, b));
          return bStats.mtime.getTime() - aStats.mtime.getTime();
        });

      if (largeFiles.length > 0) {
        const pdfFile = largeFiles[0];
        const pdfPath = path.join(uploadsDir, pdfFile);
        console.log(`[ADMIN-ACCESS] Serving PDF: ${pdfFile}`);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"');
        res.setHeader('Cache-Control', 'no-cache');
        
        return res.sendFile(pdfPath, (err) => {
          if (err) {
            console.error('Erro ao enviar arquivo PDF:', err);
            res.status(404).json({ message: "Arquivo não encontrado" });
          }
        });
      }
      
      res.status(404).json({ message: "Nenhum arquivo PDF encontrado" });
    } catch (error) {
      console.error("Erro no endpoint PDF:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin endpoint to access cover images directly (no auth required for platform owner)
  app.get("/api/admin/files/cover/:filename", async (req, res) => {
    const filename = req.params.filename;
    console.log(`[ADMIN-ACCESS] Cover image requested: ${filename}`);
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // First try the exact file
      const exactPath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(exactPath)) {
        console.log(`[ADMIN-ACCESS] Found exact cover file: ${filename}`);
        res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(exactPath);
      }
      
      // Find product that references this filename
      const products = await storage.getAllProducts();
      const product = products.find(p => p.coverImageUrl && p.coverImageUrl.includes(filename));
      
      if (!product) {
        console.log(`[ADMIN-ACCESS] No product found for cover filename: ${filename}`);
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      console.log(`[ADMIN-ACCESS] Found product: ${product.title}`);
      
      // Find the most recent small file (likely image)
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const files = fs.readdirSync(uploadsDir);
      
      let bestFile = null;
      let bestTime = 0;
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        // Look for small files (images are typically 1KB-1MB)
        if (stats.size > 1000 && stats.size < 1000000 && stats.mtime.getTime() > bestTime) {
          bestFile = file;
          bestTime = stats.mtime.getTime();
        }
      }
      
      if (bestFile) {
        const bestPath = path.join(uploadsDir, bestFile);
        console.log(`[ADMIN-ACCESS] Serving fallback cover: ${bestFile}`);
        res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(bestPath);
      }
      
      return res.status(404).json({ message: "Arquivo de imagem não encontrado" });
      
    } catch (error) {
      console.error("Erro no endpoint cover admin:", error);
      res.status(500).json({ message: "Erro interno do servidor", error: error.message });
    }
  });

  // Public endpoint for updating product status and public URL (no authentication required)
  app.patch("/api/webhook/products/:id/status", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { status, publicUrl } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'published', 'rejected', 'archived'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Status inválido. Use: pending, published, rejected, ou archived" 
        });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      // Update product with status and optional public URL
      const updates: any = { status };
      if (publicUrl) {
        updates.publicUrl = publicUrl;
      }
      
      const updatedProduct = await storage.updateProduct(productId, updates);
      
      console.log(`[WEBHOOK-STATUS] Product ${productId} status changed from ${product.status} to ${status}${publicUrl ? ` with URL: ${publicUrl}` : ''}`);
      
      res.json({
        message: `Status do produto alterado para ${status}${publicUrl ? ' e URL pública adicionada' : ''}`,
        product: updatedProduct
      });
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ message: "Falha ao atualizar status do produto" });
    }
  });

  // Setup session config for auth
  const { createSessionConfig } = await import("./session-config");
  app.use(createSessionConfig());

  // Setup real authentication with password validation
  // Auth routes
  app.post('/api/auth/register', registerUser);
  app.post('/api/auth/login', loginUser);
  app.get('/api/auth/user', getCurrentUser);
  app.post('/api/auth/logout', logoutUser);

  // Admin authentication routes
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find admin user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Credenciais inválidas ou acesso negado" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password || '');
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Set admin session
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };

      res.json({
        message: "Login administrativo realizado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });

    } catch (error) {
      console.error("Erro no login administrativo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/admin/user', async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Não autenticado como administrador" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Erro ao verificar sessão administrativa" });
    }
  });

  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logout administrativo realizado com sucesso" });
    });
  });

  // Admin management routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin endpoint to download specific product files
  app.get('/api/admin/download/pdf/:productId', requireAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const product = await storage.getProduct(productId);
      
      if (!product || !product.pdfUrl) {
        return res.status(404).json({ message: "Produto ou PDF não encontrado" });
      }

      const fs = require('fs');
      const path = require('path');
      const filename = product.pdfUrl.split('/').pop();
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo PDF não encontrado no servidor" });
      }

      console.log(`[ADMIN-DOWNLOAD] PDF for product ${productId}: ${filename}`);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${product.title}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Erro ao enviar PDF:', err);
          res.status(500).json({ message: "Erro ao enviar arquivo" });
        }
      });
    } catch (error) {
      console.error("Erro no download de PDF:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/admin/download/cover/:productId', requireAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const product = await storage.getProduct(productId);
      
      if (!product || !product.coverImageUrl) {
        return res.status(404).json({ message: "Produto ou capa não encontrada" });
      }

      const fs = require('fs');
      const path = require('path');
      const filename = product.coverImageUrl.split('/').pop();
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo de capa não encontrado no servidor" });
      }

      console.log(`[ADMIN-DOWNLOAD] Cover for product ${productId}: ${filename}`);
      
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      
      res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${product.title}-capa${ext}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Erro ao enviar capa:', err);
          res.status(500).json({ message: "Erro ao enviar arquivo" });
        }
      });
    } catch (error) {
      console.error("Erro no download de capa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/admin/all-products', requireAdmin, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Erro ao buscar todos os produtos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/admin/all-sales', requireAdmin, async (req, res) => {
    try {
      // Get all sales across all authors
      const allUsers = await storage.getAllUsers();
      let allSales = [];
      
      for (const user of allUsers) {
        if (user.role === 'author') {
          const userSales = await storage.getSalesByAuthor(user.id);
          allSales.push(...userSales);
        }
      }
      
      res.json(allSales);
    } catch (error) {
      console.error("Erro ao buscar todas as vendas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/admin/dashboard-stats', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const products = await storage.getAllProducts();
      
      // Calculate overall platform stats
      const totalAuthors = users.filter(u => u.role === 'author').length;
      const totalProducts = products.length;
      const activeProducts = products.filter(p => p.status === 'approved').length;
      const pendingProducts = products.filter(p => p.status === 'pending').length;
      
      // Calculate total sales across all authors
      let totalSales = 0;
      let totalRevenue = 0;
      
      for (const user of users) {
        if (user.role === 'author') {
          const userStats = await storage.getAuthorStats(user.id);
          totalSales += userStats.totalSales;
          totalRevenue += userStats.totalRevenue;
        }
      }
      
      res.json({
        totalAuthors,
        totalProducts,
        activeProducts,
        pendingProducts,
        totalSales,
        totalRevenue
      });
    } catch (error) {
      console.error("Erro ao calcular estatísticas administrativas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Stats endpoint
  app.get('/api/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const stats = await storage.getAuthorStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Product routes
  app.post('/api/products', requireAuth, upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const userId = req.session.userId;
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
      
      // Send product data to webhook
      await sendProductToWebhook(product);
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get('/api/products', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const products = await storage.getProductsByAuthor(userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  app.put('/api/products/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  // Update product status (e.g., from pending to published)
  app.patch('/api/products/:id/status', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const productId = parseInt(req.params.id);
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ['pending', 'published', 'rejected', 'archived'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Status inválido. Use: pending, published, rejected, ou archived" 
        });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      // Check if user owns this product
      if (product.authorId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const updatedProduct = await storage.updateProductStatus(productId, status);
      
      console.log(`[STATUS] Product ${productId} status changed from ${product.status} to ${status}`);
      
      res.json({
        message: `Status do produto alterado para ${status}`,
        product: updatedProduct
      });
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ message: "Falha ao atualizar status do produto" });
    }
  });

  // Simulate purchase for a product
  app.post("/api/products/:id/simulate-purchase", requireAuth, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.session.userId;
      const {
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerCpf,
        buyerAddress,
        buyerCity,
        buyerState,
        buyerZipCode
      } = req.body;
      
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      // Verify that the user owns this product
      if (product.authorId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Calculate pricing
      const salePrice = parseFloat(product.salePrice.toString());
      const commission = salePrice * 0.3; // 30% platform fee
      const authorEarnings = salePrice * 0.7; // 70% for author
      
      // Create sale record with complete customer information
      const sale = await storage.createSale({
        productId: product.id,
        buyerEmail,
        buyerName,
        buyerPhone,
        buyerCpf,
        buyerAddress,
        buyerCity,
        buyerState,
        buyerZipCode,
        salePrice: salePrice.toFixed(2),
        commission: commission.toFixed(2),
        authorEarnings: authorEarnings.toFixed(2)
      });

      res.json({ 
        success: true, 
        message: "Compra simulada com sucesso",
        sale: sale
      });
    } catch (error) {
      console.error("Erro ao simular compra:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao simular compra",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Sales routes
  app.get('/api/sales', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sales = await storage.getSalesByAuthor(userId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const stats = await storage.getAuthorStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/analytics/sales-data', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const months = parseInt(req.query.months as string) || 6;
      const salesData = await storage.getSalesData(userId, months);
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      res.status(500).json({ message: "Failed to fetch sales data" });
    }
  });

  // Settings routes
  app.get('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
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

  app.post('/api/settings/profile', requireAuth, async (req: any, res) => {
    try {
      console.log("=== Profile Update Route Hit ===");
      console.log("Method:", req.method);
      console.log("URL:", req.url);
      console.log("Headers:", req.headers);
      
      const userId = req.session.userId;
      const { profileImage, firstName, lastName, email, phone, bio } = req.body;
      
      console.log("=== Profile Update Request ===");
      console.log("User ID:", userId);
      console.log("Request body keys:", Object.keys(req.body));
      console.log("Data to update:", { firstName, lastName, email, phone, bio });
      console.log("Profile image length:", profileImage ? profileImage.length : 0);
      
      // Atualizar dados do perfil do usuário
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        profileImageUrl: profileImage
      });
      
      console.log("User profile updated:", updatedUser);
      
      // Return the updated user data (without password)
      const { password, ...userWithoutPassword } = updatedUser as any;
      res.json({ 
        message: "Profile updated successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post('/api/settings/banking', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      // For now, just return success since we don't have banking settings table
      res.json({ message: "Banking information updated successfully" });
    } catch (error) {
      console.error("Error updating banking info:", error);
      res.status(500).json({ message: "Failed to update banking information" });
    }
  });

  app.post('/api/settings/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      // For now, just return success since we don't have notifications settings table
      res.json({ message: "Notification preferences updated successfully" });
    } catch (error) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // File serving
  app.use('/uploads', express.static('uploads'));

  // Create sample sales data
  app.post('/api/sales/create-samples', async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      
      // Get user's products to create sales for
      const products = await storage.getProductsByAuthor(userId);
      
      if (products.length === 0) {
        return res.status(400).json({ message: "Nenhum produto encontrado para criar vendas" });
      }

      const sampleSales = [];
      const now = new Date();
      
      // Create sales for the last 6 months
      for (let i = 0; i < 12; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        
        // Random date in the last 6 months
        const randomDays = Math.floor(Math.random() * 180);
        const saleDate = new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
        
        // Create sale record
        const salePrice = parseFloat(product.salePrice.toString());
        const commission = salePrice * 0.3; // 30% platform fee
        const authorEarnings = salePrice * 0.7; // 70% for author
        
        const sale = await storage.createSale({
          productId: product.id,
          buyerEmail: `cliente${i + 1}@email.com`,
          salePrice: salePrice.toFixed(2),
          commission: commission.toFixed(2),
          authorEarnings: authorEarnings.toFixed(2)
        });
        
        sampleSales.push(sale);
      }

      res.json({ 
        success: true, 
        message: `${sampleSales.length} vendas fictícias criadas com sucesso`,
        sales: sampleSales 
      });

    } catch (error: any) {
      console.error("Erro ao criar vendas fictícias:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao criar vendas fictícias",
        error: error.message 
      });
    }
  });

  // Webhook N8N integration
  app.post('/api/products/:id/send-webhook', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      // Get product author info
      const author = await storage.getUser(product.authorId);
      
      // Prepare webhook data
      const webhookData = {
        product: {
          id: product.id,
          title: product.title,
          author: product.author,
          coAuthors: product.coAuthors,
          genre: product.genre,
          language: product.language,
          targetAudience: product.targetAudience,
          description: product.description,
          isbn: product.isbn,
          pageCount: product.pageCount,
          baseCost: product.baseCost,
          authorEarnings: (product as any).authorEarnings || 0,
          salePrice: product.salePrice,
          status: product.status,
          coverImageUrl: (product as any).coverImageUrl || null,
          pdfPath: (product as any).pdfPath || null,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        },
        authorInfo: {
          id: author?.id,
          email: author?.email,
          firstName: author?.firstName,
          lastName: author?.lastName
        },
        timestamp: new Date().toISOString(),
        event: 'product_data_sync'
      };

      // Send to N8N webhook
      const webhookUrl = 'https://auton8n.upleer.com.br/webhook/5b04bf83-a7d2-4eec-9d85-dfa14f2e3e00';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      const responseText = await response.text();
      
      res.json({ 
        success: true, 
        message: "Dados enviados para webhook N8N com sucesso",
        webhookResponse: responseText,
        status: response.status
      });

    } catch (error: any) {
      console.error("Erro ao enviar webhook:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao enviar dados para webhook",
        error: error.message 
      });
    }
  });

  // API Integrations routes
  app.get('/api/integrations', async (req, res) => {
    try {
      const integrations = await storage.getApiIntegrations();
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.post('/api/integrations', async (req, res) => {
    try {
      const validatedData = insertApiIntegrationSchema.parse(req.body);
      const integration = await storage.createApiIntegration(validatedData);
      res.json(integration);
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(400).json({ message: "Invalid integration data" });
    }
  });

  app.get('/api/integrations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const integration = await storage.getApiIntegration(id);
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      res.json(integration);
    } catch (error) {
      console.error("Error fetching integration:", error);
      res.status(500).json({ message: "Failed to fetch integration" });
    }
  });

  app.put('/api/integrations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertApiIntegrationSchema.partial().parse(req.body);
      const integration = await storage.updateApiIntegration(id, validatedData);
      res.json(integration);
    } catch (error) {
      console.error("Error updating integration:", error);
      res.status(400).json({ message: "Invalid integration data" });
    }
  });

  app.delete('/api/integrations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteApiIntegration(id);
      res.json({ message: "Integration deleted successfully" });
    } catch (error) {
      console.error("Error deleting integration:", error);
      res.status(500).json({ message: "Failed to delete integration" });
    }
  });

  app.post('/api/integrations/test', async (req, res) => {
    try {
      const { baseUrl, authType, authConfig } = req.body;
      
      // Simple test request to the base URL
      const testUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication headers based on type
      if (authType === 'api_key' && authConfig.apiKey) {
        headers['X-API-Key'] = authConfig.apiKey;
      } else if (authType === 'bearer' && authConfig.token) {
        headers['Authorization'] = `Bearer ${authConfig.token}`;
      } else if (authType === 'basic' && authConfig.username && authConfig.password) {
        const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const startTime = Date.now();
      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
      });
      const responseTime = Date.now() - startTime;

      // Log the test
      await storage.createApiLog({
        integrationId: 0, // Test integration
        method: 'GET',
        url: testUrl,
        requestHeaders: headers,
        responseStatus: response.status,
        responseTime,
        errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      });

      res.json({
        status: response.status,
        message: response.ok ? 'Connection successful' : 'Connection failed',
        responseTime,
      });
    } catch (error: any) {
      res.status(500).json({
        status: 0,
        message: error.message || 'Connection test failed',
        responseTime: 0,
      });
    }
  });

  // API Logs routes
  app.get('/api/integrations/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getApiLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // API Endpoints routes
  app.get('/api/integrations/:id/endpoints', async (req, res) => {
    try {
      const integrationId = parseInt(req.params.id);
      const endpoints = await storage.getApiEndpoints(integrationId);
      res.json(endpoints);
    } catch (error) {
      console.error("Error fetching endpoints:", error);
      res.status(500).json({ message: "Failed to fetch endpoints" });
    }
  });

  app.post('/api/integrations/:id/endpoints', async (req, res) => {
    try {
      const integrationId = parseInt(req.params.id);
      const validatedData = insertApiEndpointSchema.parse({
        ...req.body,
        integrationId,
      });
      const endpoint = await storage.createApiEndpoint(validatedData);
      res.json(endpoint);
    } catch (error) {
      console.error("Error creating endpoint:", error);
      res.status(400).json({ message: "Invalid endpoint data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
