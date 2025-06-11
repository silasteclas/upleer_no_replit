import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Set correct domains for the renamed project
if (!process.env.REPLIT_DOMAINS || process.env.REPLIT_DOMAINS.includes("prompt-flow-adm64")) {
  process.env.REPLIT_DOMAINS = `${process.env.REPLIT_SLUG || 'bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3'}.kirk.replit.dev,prompt-flow-adm64.replit.app`;
  console.log(`[CONFIG] Updated REPLIT_DOMAINS to: ${process.env.REPLIT_DOMAINS}`);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Add webhook endpoints BEFORE any other middleware to avoid Vite interception
// Sales webhook endpoint
app.post('/api/webhook/sales', async (req, res) => {
  try {
    const { storage } = await import("./storage");
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
      orderDate,
      paymentStatus,
      paymentMethod,
      installments,
      discountCoupon,
      discountAmount,
      shippingCost,
      shippingCarrier,
      deliveryDays
    } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'productId é obrigatório' });
    }
    
    if (!buyerName || !buyerEmail) {
      return res.status(400).json({ message: 'buyerName e buyerEmail são obrigatórios' });
    }
    
    if (!salePrice) {
      return res.status(400).json({ message: 'salePrice é obrigatório' });
    }
    
    // Check if product exists and get the author
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    // Convert string prices to numbers
    const price = parseFloat(salePrice.toString().replace(',', '.'));
    const discount = discountAmount ? parseFloat(discountAmount.toString().replace(',', '.')) : 0;
    const shipping = shippingCost ? parseFloat(shippingCost.toString().replace(',', '.')) : 0;
    
    // Calculate commission and author earnings (assuming 15% commission)
    const commissionRate = 0.15;
    const commission = price * commissionRate;
    const authorEarnings = price - commission;
    
    // Create sale record - the authorId is automatically determined by the product
    const saleData = {
      productId: productId,
      buyerName: buyerName,
      buyerEmail: buyerEmail,
      buyerPhone: buyerPhone || '',
      buyerCpf: buyerCpf || '',
      buyerAddress: buyerAddress || '',
      buyerCity: buyerCity || '',
      buyerState: buyerState || '',
      buyerZipCode: buyerZipCode || '',
      salePrice: price.toFixed(2),
      commission: commission.toFixed(2),
      authorEarnings: authorEarnings.toFixed(2),
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      paymentStatus: paymentStatus || 'pending',
      paymentMethod: paymentMethod || '',
      installments: installments || 1,
      discountCoupon: discountCoupon || '',
      discountAmount: discount.toFixed(2),
      shippingCost: shipping.toFixed(2),
      shippingCarrier: shippingCarrier || '',
      deliveryDays: deliveryDays || 0
    };
    
    const newSale = await storage.createSale(saleData);
    
    console.log(`[WEBHOOK] New sale created: ID ${newSale.id} for product ${productId} (author: ${product.authorId})`);
    
    res.json({
      message: 'Venda registrada com sucesso',
      sale: {
        id: newSale.id,
        productId: newSale.productId,
        productTitle: product.title,
        authorId: product.authorId,
        authorName: product.author,
        buyerName: newSale.buyerName,
        buyerEmail: newSale.buyerEmail,
        salePrice: newSale.salePrice,
        commission: newSale.commission,
        authorEarnings: newSale.authorEarnings,
        orderDate: newSale.orderDate,
        paymentStatus: newSale.paymentStatus
      }
    });
    
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Product status webhook endpoint
app.patch('/api/webhook/products/:id/status', async (req, res) => {
  try {
    const { storage } = await import("./storage");
    const productId = parseInt(req.params.id);
    const { status, publicUrl } = req.body;
    
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ message: 'ID do produto inválido' });
    }
    
    if (!status) {
      return res.status(400).json({ message: 'Status é obrigatório' });
    }
    
    // Valid status values
    const validStatuses = ['pending', 'published', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Status inválido. Valores permitidos: pending, published, rejected, archived' 
      });
    }
    
    // Check if product exists
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    // Update product status and public URL
    const updates: any = { status };
    if (publicUrl) {
      updates.publicUrl = publicUrl;
    }
    
    const updatedProduct = await storage.updateProduct(productId, updates);
    
    console.log(`[WEBHOOK] Product ${productId} status updated to ${status}${publicUrl ? ` with URL ${publicUrl}` : ''}`);
    
    res.json({
      message: 'Status do produto atualizado com sucesso',
      product: {
        id: updatedProduct.id,
        status: updatedProduct.status,
        publicUrl: updatedProduct.publicUrl,
        title: updatedProduct.title,
        author: updatedProduct.author
      }
    });
    
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Log all requests to identify routing issues
  console.log(`[REQUEST] ${req.method} ${req.path} from ${req.hostname}`);
  
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let server;
  
  try {
    server = await registerRoutes(app);
    console.log('[SERVER] Routes registered successfully');
  } catch (error) {
    console.error('[SERVER] Error during route registration:', error);
    // Continue with basic server setup even if routes fail
    const { createServer } = await import("http");
    server = createServer(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('[ERROR]', message, err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
