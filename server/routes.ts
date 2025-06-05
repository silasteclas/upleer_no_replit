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

// Function to send product data to external webhook
async function sendProductToWebhook(product: Product) {
  const webhookUrl = "https://auton8n.upleer.com.br/webhook-test/5b04bf83-a7d2-4eec-9d85-dfa14f2e3e00";
  
  try {
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
      updatedAt: product.updatedAt
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
  // Serve static files from uploads directory
  app.use('/uploads', express.static('uploads'));

  // Public webhook endpoints (before auth middleware to avoid session issues)
  
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
  app.post("/api/products/:id/simulate-purchase", async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.user.id;
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

  app.post('/api/settings/profile', async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.post('/api/settings/banking', async (req: any, res) => {
    try {
      const userId = req.user.id;
      // For now, just return success since we don't have banking settings table
      res.json({ message: "Banking information updated successfully" });
    } catch (error) {
      console.error("Error updating banking info:", error);
      res.status(500).json({ message: "Failed to update banking information" });
    }
  });

  app.post('/api/settings/notifications', async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const webhookUrl = 'https://auton8n.upleer.com.br/webhook-test/5b04bf83-a7d2-4eec-9d85-dfa14f2e3e00';
      
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
