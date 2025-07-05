import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import crypto from "crypto";
import { registerUser, loginUser, getCurrentUser, logoutUser, requireAuth } from "./real-auth";
import { uploadFileToSupabase, deleteFileFromSupabase, extractFileNameFromSupabaseUrl } from "./supabase";
import { eq, and } from "drizzle-orm";
import { products } from "../shared/schema";
import { db } from "./db";

// Helper function to get base URL based on environment
function getBaseUrl(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const port = process.env.PORT || 5000;
  
  if (isDevelopment) {
    return `http://localhost:${port}`;
  }
  
  // Para produção, usar domínio real quando disponível
  return process.env.BASE_URL || `http://localhost:${port}`;
}

// Webhook function to send product data to N8N
async function sendProductToWebhook(product: any) {
  const webhookUrl = 'https://auton8n.upleer.com.br/webhook/novo_produto';
  
  try {
    console.log(`[WEBHOOK] Sending product ${product.id} to N8N webhook...`);
    
      // Preparar dados do produto para webhook
  const pdfFilename = product.pdfUrl ? product.pdfUrl.split('/').pop() : null;
  const coverFilename = product.coverImageUrl ? product.coverImageUrl.split('/').pop() : null;
  
  // Limpar e formatar descrição
  const cleanDescription = product.description 
    ? product.description
        .replace(/\\n/g, ' ')           // Remover \n literais
        .replace(/\n/g, ' ')            // Remover quebras de linha reais
        .replace(/\r/g, ' ')            // Remover retornos de carro
        .replace(/\s+/g, ' ')           // Múltiplos espaços vira um só
        .trim()                         // Remove espaços no início/fim
    : '';
  
  const webhookData = {
    id: product.id,
    title: product.title,
    description: cleanDescription,
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
      // Usar URL do Supabase diretamente (já é URL pública)
      coverImageUrl: product.coverImageUrl,
      publicUrl: product.publicUrl,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // URLs para download e integração
      downloadUrls: {
        productDetails: `${getBaseUrl()}/api/products/${product.id}`,
        pdfDownload: pdfFilename ? `${getBaseUrl()}/api/pdf/${pdfFilename}` : null,
        pdfDirect: pdfFilename ? `${getBaseUrl()}/uploads/${pdfFilename}` : null,
        coverDownload: coverFilename ? `${getBaseUrl()}/api/download/cover/${coverFilename}` : null
      },
      // Metadata adicional para N8N
      metadata: {
        source: 'upleer_local',
        environment: 'development',
        timestamp: new Date().toISOString(),
        fileInfo: {
          pdfSize: pdfFilename ? 'unknown' : null,
          coverSize: coverFilename ? 'unknown' : null,
          pdfFilename: pdfFilename,
          coverFilename: coverFilename
        }
      }
    };
    
    console.log(`[WEBHOOK] Sending to: ${webhookUrl}`);
    console.log(`[WEBHOOK] Product data summary:`, {
      id: product.id,
      title: product.title,
      author: product.author,
      genre: product.genre,
      status: product.status,
      description: cleanDescription.substring(0, 100) + (cleanDescription.length > 100 ? '...' : ''),
      hasFiles: {
        pdf: !!pdfFilename,
        cover: !!coverFilename
      }
    });
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Upleer-Webhook/1.0',
        'X-Webhook-Source': 'upleer-local',
        'X-Product-ID': product.id.toString()
      },
      body: JSON.stringify(webhookData),
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    });

    const responseText = await response.text();
    
    console.log(`[WEBHOOK] Response status: ${response.status}`);
    console.log(`[WEBHOOK] Response headers:`, Object.fromEntries(response.headers));
    
    if (response.ok) {
      console.log(`[WEBHOOK] ✅ Product ${product.id} sent successfully to N8N`);
      console.log(`[WEBHOOK] Response body:`, responseText);
    } else {
      console.error(`[WEBHOOK] ❌ Failed to send product ${product.id}:`, response.status, response.statusText);
      console.error(`[WEBHOOK] Error response:`, responseText);
    }


  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`[WEBHOOK] ⏰ Timeout sending product ${product.id} to webhook (>10s)`);
    } else {
      console.error(`[WEBHOOK] ❌ Error sending product ${product.id} to webhook:`, error);
    }
    // Não falhar o produto se o webhook falhar
  }
}

const upload = multer({
  storage: multer.memoryStorage(), // Usar memory storage para enviar direto ao Supabase
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
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

// Separate multer configuration for profile images
const profileImageUpload = multer({
  storage: multer.memoryStorage(), // Usar memory storage para enviar direto ao Supabase
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for profile images
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "profileImage" && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type for profile image"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Public download endpoint for webhooks/N8N integration - MUST BE BEFORE OTHER ROUTES
  app.get('/api/download/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    const filePath = path.join('uploads', filename);
    
    console.log(`[DOWNLOAD] Request for ${type}/${filename}`);
    console.log(`[DOWNLOAD] File path: ${filePath}`);
    console.log(`[DOWNLOAD] File exists: ${fs.existsSync(filePath)}`);
    
    // Validate file type
    if (!['pdf', 'cover', 'image'].includes(type)) {
      console.log(`[DOWNLOAD] Invalid file type: ${type}`);
      return res.status(400).json({ message: 'Tipo de arquivo inválido' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`[DOWNLOAD] File not found: ${filePath}`);
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    try {
      const buffer = fs.readFileSync(filePath);
      let contentType = 'application/octet-stream';
      let downloadName = filename;
      
      console.log(`[DOWNLOAD] File size: ${buffer.length} bytes`);
      
      // Set content type based on file type parameter and content detection
      if (type === 'pdf') {
        contentType = 'application/pdf';
        downloadName = filename.includes('.pdf') ? filename : `${filename}.pdf`;
        console.log(`[DOWNLOAD] Serving as PDF: ${downloadName}`);
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
        console.log(`[DOWNLOAD] Serving as image: ${contentType} - ${downloadName}`);
      }
      
      // Set headers for proper file serving
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
      
      console.log(`[DOWNLOAD] Successfully serving file ${filename}`);
      res.send(buffer);
      
    } catch (error) {
      console.error('[DOWNLOAD] Error serving download file:', error);
      res.status(500).json({ message: 'Erro ao servir arquivo' });
    }
  });

  // Direct PDF access endpoint - serves PDFs directly from uploads folder
  app.get('/api/pdf/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join('uploads', filename);
    
    console.log(`[PDF] Request for PDF: ${filename}`);
    console.log(`[PDF] File path: ${filePath}`);
    console.log(`[PDF] File exists: ${fs.existsSync(filePath)}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`[PDF] File not found: ${filePath}`);
      return res.status(404).json({ message: 'PDF não encontrado' });
    }
    
    try {
      const buffer = fs.readFileSync(filePath);
      
      // Verify it's actually a PDF file
      if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
        console.log(`[PDF] File is not a valid PDF: ${filename}`);
        return res.status(400).json({ message: 'Arquivo não é um PDF válido' });
      }
      
      console.log(`[PDF] Serving PDF file: ${filename} (${buffer.length} bytes)`);
      
      // Set proper headers for PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
      
      res.send(buffer);
      
    } catch (error) {
      console.error('[PDF] Error serving PDF file:', error);
      res.status(500).json({ message: 'Erro ao servir PDF' });
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

  // Test route for Supabase connectivity
  app.post('/api/test-supabase', async (req, res) => {
    try {
      const { supabase } = await import('./supabase');
      
      // Test a simple list operation to verify connectivity
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('[SUPABASE TEST] Error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Erro na conexão com Supabase',
          error: error.message 
        });
      }
      
      console.log('[SUPABASE TEST] Supabase conectado com sucesso!');
      res.json({ 
        success: true, 
        message: 'Supabase conectado com sucesso!',
        buckets: data?.length || 0
      });
    } catch (error) {
      console.error('[SUPABASE TEST] Exception:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno ao testar Supabase',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

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

      // Send to webhook de forma assíncrona (não bloquear resposta)
      setImmediate(async () => {
        try {
          await sendProductToWebhook(product);
        } catch (webhookError) {
          console.error("[UPLOAD] Webhook failed but continuing:", webhookError);
        }
      });

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
      console.log("[PRODUCTS] POST /api/products - Starting...");
      console.log("[PRODUCTS] Request body:", req.body);
      console.log("[PRODUCTS] Request files:", req.files);
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const {
        title, description, isbn, author, coAuthors, genre, language,
        targetAudience, pageCount, baseCost, salePrice,
        // FASE 3: Novos campos financeiros
        authorEarnings, platformCommission, fixedFee, 
        printingCostPerPage, commissionRate
      } = req.body;

      console.log("[PRODUCTS] Extracted fields:", {
        title, author, genre, salePrice, pageCount, baseCost,
        // FASE 3: Log dos novos campos financeiros
        authorEarnings, platformCommission, fixedFee, 
        printingCostPerPage, commissionRate
      });

      if (!title || !author || !genre || !salePrice) {
        console.log("[PRODUCTS] Missing required fields");
        return res.status(400).json({
          message: "Campos obrigatórios: title, author, genre, salePrice"
        });
      }

      // FASE 3: Validação dos novos campos financeiros
      if (authorEarnings !== undefined && (isNaN(parseFloat(authorEarnings)) || parseFloat(authorEarnings) < 0)) {
        console.log("[PRODUCTS] Invalid authorEarnings:", authorEarnings);
        return res.status(400).json({
          message: "authorEarnings deve ser um número válido e não negativo"
        });
      }

      if (platformCommission !== undefined && (isNaN(parseFloat(platformCommission)) || parseFloat(platformCommission) < 0)) {
        console.log("[PRODUCTS] Invalid platformCommission:", platformCommission);
        return res.status(400).json({
          message: "platformCommission deve ser um número válido e não negativo"
        });
      }

      const userId = (req as any).userId;
      console.log("[PRODUCTS] User ID:", userId);
      
      let pdfUrl = null;
      let coverImageUrl = null;

      // Upload PDF para Supabase se fornecido
      if (files.pdf && files.pdf[0]) {
        console.log("[PRODUCTS] Uploading PDF to Supabase...");
        const pdfFile = files.pdf[0];
        const pdfFileName = `pdf_${userId}_${Date.now()}.pdf`;
        
        pdfUrl = await uploadFileToSupabase(
          pdfFile.buffer,
          pdfFileName,
          pdfFile.mimetype
        );
        
        if (pdfUrl) {
          console.log("[PRODUCTS] PDF uploaded to Supabase:", pdfUrl);
        } else {
          console.error("[PRODUCTS] Failed to upload PDF to Supabase");
          return res.status(500).json({ message: "Erro ao fazer upload do PDF" });
        }
      }

      // Upload da capa para Supabase se fornecida
      if (files.cover && files.cover[0]) {
        console.log("[PRODUCTS] Uploading cover image to Supabase...");
        const coverFile = files.cover[0];
        const coverFileName = `cover_${userId}_${Date.now()}.${coverFile.mimetype.split('/')[1]}`;
        
        coverImageUrl = await uploadFileToSupabase(
          coverFile.buffer,
          coverFileName,
          coverFile.mimetype
        );
        
        if (coverImageUrl) {
          console.log("[PRODUCTS] Cover uploaded to Supabase:", coverImageUrl);
        } else {
          console.error("[PRODUCTS] Failed to upload cover to Supabase");
          return res.status(500).json({ message: "Erro ao fazer upload da capa" });
        }
      }

      const productData = {
        title,
        description: description || "",
        author,
        isbn: isbn || undefined,
        coAuthors: coAuthors || undefined,
        genre,
        language: language || "português",
        targetAudience: targetAudience || undefined,
        pdfUrl: pdfUrl || "",
        coverImageUrl: coverImageUrl || undefined,
        pageCount: parseInt(pageCount) || 1,
        baseCost: baseCost?.toString() || "0.00",
        salePrice: salePrice.toString(),
        marginPercent: 150,
        status: "pending",
        authorId: userId,
        
        // FASE 3: Novos campos financeiros
        authorEarnings: authorEarnings ? parseFloat(authorEarnings).toString() : undefined,
        platformCommission: platformCommission ? parseFloat(platformCommission).toString() : undefined,
        fixedFee: fixedFee ? parseFloat(fixedFee).toString() : "9.90",
        printingCostPerPage: printingCostPerPage ? parseFloat(printingCostPerPage).toString() : "0.10",
        commissionRate: commissionRate ? parseFloat(commissionRate).toString() : "30.00"
      };

      console.log("[PRODUCTS] Creating product with data:", productData);

      const product = await storage.createProduct(productData);
      console.log("[PRODUCTS] Product created successfully:", product.id);

      // Send to webhook de forma assíncrona (não bloquear resposta)
      setImmediate(async () => {
        try {
          await sendProductToWebhook(product);
        } catch (webhookError) {
          console.error("[PRODUCTS] Webhook failed but continuing:", webhookError);
        }
      });

      console.log("[PRODUCTS] Returning product response:", product.id);
      res.status(201).json(product);
    } catch (error) {
      console.error("[PRODUCTS] Error creating product:", error);
      console.error("[PRODUCTS] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Erro interno do servidor",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const products = await storage.getProductsByAuthor(userId);
      
      // Adicionar URLs de acesso a todos os produtos
      const baseUrl = getBaseUrl();
      const productsWithUrls = products.map(product => {
        const pdfFilename = product.pdfUrl ? product.pdfUrl.split('/').pop() : null;
        const coverFilename = product.coverImageUrl ? product.coverImageUrl.split('/').pop() : null;
        
        return {
          ...product,
          accessUrls: {
            pdfDirect: pdfFilename ? `${baseUrl}/uploads/${pdfFilename}` : null,
            pdfDownload: pdfFilename ? `${baseUrl}/api/pdf/${pdfFilename}` : null,
            coverDirect: coverFilename ? `${baseUrl}/uploads/${coverFilename}` : null,
            coverDownload: coverFilename ? `${baseUrl}/api/download/cover/${coverFilename}` : null,
            productDetails: `${baseUrl}/api/products/${product.id}`
          }
        };
      });
      
      res.json(productsWithUrls);
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
      
      // Adicionar URLs de acesso completas ao produto
      const baseUrl = getBaseUrl();
      const pdfFilename = product.pdfUrl ? product.pdfUrl.split('/').pop() : null;
      const coverFilename = product.coverImageUrl ? product.coverImageUrl.split('/').pop() : null;
      
      const productWithUrls = {
        ...product,
        accessUrls: {
          pdfDirect: pdfFilename ? `${baseUrl}/uploads/${pdfFilename}` : null,
          pdfDownload: pdfFilename ? `${baseUrl}/api/pdf/${pdfFilename}` : null,
          coverDirect: coverFilename ? `${baseUrl}/uploads/${coverFilename}` : null,
          coverDownload: coverFilename ? `${baseUrl}/api/download/cover/${coverFilename}` : null,
          productDetails: `${baseUrl}/api/products/${productId}`
        }
      };
      
      res.json(productWithUrls);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint específico para obter URLs de acesso de um produto (público)
  app.get("/api/products/:id/urls", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      const baseUrl = getBaseUrl();
      const pdfFilename = product.pdfUrl ? product.pdfUrl.split('/').pop() : null;
      const coverFilename = product.coverImageUrl ? product.coverImageUrl.split('/').pop() : null;
      
      const urls = {
        productId: product.id,
        title: product.title,
        author: product.author,
        status: product.status,
        urls: {
          pdfDirect: pdfFilename ? `${baseUrl}/uploads/${pdfFilename}` : null,
          pdfDownload: pdfFilename ? `${baseUrl}/api/pdf/${pdfFilename}` : null,
          coverDirect: coverFilename ? `${baseUrl}/uploads/${coverFilename}` : null,
          coverDownload: coverFilename ? `${baseUrl}/api/download/cover/${coverFilename}` : null,
          productDetails: `${baseUrl}/api/products/${productId}`
        },
        metadata: {
          pdfFilename,
          coverFilename,
          baseUrl,
          generatedAt: new Date().toISOString()
        }
      };
      
      console.log(`[PRODUCT-URLS] Generated URLs for product ${productId}:`, urls);
      res.json(urls);
    } catch (error) {
      console.error("Error fetching product URLs:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.patch("/api/products/:id", requireAuth, upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "cover", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const userId = (req as any).userId;
      
      console.log("[PRODUCTS] PATCH /api/products/:id - Starting...");
      console.log("[PRODUCTS] Product ID:", productId);
      console.log("[PRODUCTS] Request body:", req.body);
      console.log("[PRODUCTS] Request files:", req.files);
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      if (product.authorId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let updateData = { ...req.body };
      
      // Upload de novo PDF se fornecido
      if (files.pdf && files.pdf[0]) {
        console.log("[PRODUCTS] Uploading new PDF to Supabase...");
        const pdfFile = files.pdf[0];
        const pdfFileName = `pdf_${userId}_${Date.now()}.pdf`;
        
        const newPdfUrl = await uploadFileToSupabase(
          pdfFile.buffer,
          pdfFileName,
          pdfFile.mimetype
        );
        
        if (newPdfUrl) {
          console.log("[PRODUCTS] New PDF uploaded to Supabase:", newPdfUrl);
          
          // Deletar PDF antigo se existir
          if (product.pdfUrl) {
            const oldPdfName = extractFileNameFromSupabaseUrl(product.pdfUrl);
            if (oldPdfName) {
              await deleteFileFromSupabase(oldPdfName);
              console.log("[PRODUCTS] Old PDF deleted from Supabase");
            }
          }
          
          updateData.pdfUrl = newPdfUrl;
        } else {
          console.error("[PRODUCTS] Failed to upload new PDF to Supabase");
          return res.status(500).json({ message: "Erro ao fazer upload do PDF" });
        }
      }
      
      // Upload de nova capa se fornecida
      if (files.cover && files.cover[0]) {
        console.log("[PRODUCTS] Uploading new cover image to Supabase...");
        const coverFile = files.cover[0];
        const coverFileName = `cover_${userId}_${Date.now()}.${coverFile.mimetype.split('/')[1]}`;
        
        const newCoverUrl = await uploadFileToSupabase(
          coverFile.buffer,
          coverFileName,
          coverFile.mimetype
        );
        
        if (newCoverUrl) {
          console.log("[PRODUCTS] New cover uploaded to Supabase:", newCoverUrl);
          
          // Deletar capa antiga se existir
          if (product.coverImageUrl) {
            const oldCoverName = extractFileNameFromSupabaseUrl(product.coverImageUrl);
            if (oldCoverName) {
              await deleteFileFromSupabase(oldCoverName);
              console.log("[PRODUCTS] Old cover deleted from Supabase");
            }
          }
          
          updateData.coverImageUrl = newCoverUrl;
        } else {
          console.error("[PRODUCTS] Failed to upload new cover to Supabase");
          return res.status(500).json({ message: "Erro ao fazer upload da capa" });
        }
      }
      
      // Converter campos numéricos se necessário
      if (updateData.pageCount) {
        updateData.pageCount = parseInt(updateData.pageCount);
      }
      if (updateData.authorEarnings) {
        updateData.authorEarnings = parseFloat(updateData.authorEarnings).toString();
      }
      if (updateData.platformCommission) {
        updateData.platformCommission = parseFloat(updateData.platformCommission).toString();
      }
      if (updateData.fixedFee) {
        updateData.fixedFee = parseFloat(updateData.fixedFee).toString();
      }
      if (updateData.printingCostPerPage) {
        updateData.printingCostPerPage = parseFloat(updateData.printingCostPerPage).toString();
      }
      if (updateData.commissionRate) {
        updateData.commissionRate = parseFloat(updateData.commissionRate).toString();
      }
      
      console.log("[PRODUCTS] Updating product with data:", updateData);
      
      const updatedProduct = await storage.updateProduct(productId, updateData);
      
      console.log("[PRODUCTS] Product updated successfully:", updatedProduct.id);
      
      // Send updated product to webhook de forma assíncrona
      if (files.pdf || files.cover || Object.keys(req.body).length > 0) {
        setImmediate(async () => {
          try {
            await sendProductToWebhook(updatedProduct);
          } catch (webhookError) {
            console.error("[PRODUCTS] Webhook failed but continuing:", webhookError);
          }
        });
      }
      
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
      console.log("[STATS] GET /api/stats - Starting...");
      const userId = (req as any).userId;
      console.log("[STATS] User ID:", userId);
      const stats = await storage.getAuthorStats(userId);
      console.log("[STATS] Stats retrieved:", stats);
      res.json(stats);
    } catch (error) {
      console.error("[STATS] Error fetching stats:", error);
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

  // Upload profile image endpoint (using multer for file upload)
  app.post("/api/settings/profile-image", requireAuth, profileImageUpload.single('profileImage'), async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem foi enviada" });
      }

      // Generate the profile image URL
      const profileImageUrl = `/uploads/${req.file.filename}`;
      
      // Update user profile with new image
      const updatedUser = await storage.updateUserProfileImage(userId, profileImageUrl);
      
      res.json({ 
        message: "Foto de perfil atualizada com sucesso",
        user: updatedUser,
        profileImageUrl: profileImageUrl
      });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/settings/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { firstName, lastName, email, phone, bio } = req.body;
      
      // Update user profile (without image)
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        phone
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

  app.get("/api/debug-products", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      console.log("[DEBUG-PRODUCTS] Getting products for user:", userId);
      
      const products = await storage.getProductsByAuthor(userId);
      
      const productSummary = products.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.createdAt
      }));
      
      console.log("[DEBUG-PRODUCTS] Found products:", productSummary);
      
      res.json({
        total: products.length,
        products: productSummary,
        statusCounts: {
          pending: products.filter(p => p.status === 'pending').length,
          approved: products.filter(p => p.status === 'approved').length,
          published: products.filter(p => p.status === 'published').length,
          rejected: products.filter(p => p.status === 'rejected').length,
          archived: products.filter(p => p.status === 'archived').length,
        }
      });
    } catch (error) {
      console.error("[DEBUG-PRODUCTS] Error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/test-products", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      
      // Consulta direta para produtos published
      const publishedProducts = await db
        .select({ 
          id: products.id, 
          title: products.title, 
          status: products.status,
          authorId: products.authorId 
        })
        .from(products)
        .where(and(eq(products.authorId, userId), eq(products.status, "published")));

      // Consulta para TODOS os produtos do autor
      const allProducts = await db
        .select({ 
          id: products.id, 
          title: products.title, 
          status: products.status,
          authorId: products.authorId 
        })
        .from(products)
        .where(eq(products.authorId, userId));

      res.json({
        userId: userId,
        publishedCount: publishedProducts.length,
        totalCount: allProducts.length,
        publishedProducts: publishedProducts,
        allProducts: allProducts
      });
    } catch (error) {
      res.status(500).json({ message: "Erro", error: (error as Error).message });
    }
  });

  // PATCH /api/orders/:id/status - Atualizar status de pedido
  app.patch("/api/orders/:id/status", requireAuth, async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      
      console.log(`[ORDER-STATUS] PATCH /api/orders/${orderId}/status - Status: ${status}`);
      
      if (!status) {
        return res.status(400).json({ message: "Status é obrigatório" });
      }
      
      // Verificar se o pedido existe
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Atualizar o status do pedido
      const updatedOrder = await storage.updateOrder(orderId, { statusEnvio: status });
      
      console.log(`[ORDER-STATUS] Order ${orderId} status updated to: ${status}`);
      res.json(updatedOrder);
    } catch (error) {
      console.error("[ORDER-STATUS] Error updating order status:", error);
      res.status(500).json({ 
        message: "Erro interno do servidor",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ENDPOINT DE TESTE TEMPORÁRIO - SEM AUTENTICAÇÃO
  app.patch("/api/test-orders/:id/status", async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      
      console.log(`[TEST-ORDER-STATUS] PATCH /api/test-orders/${orderId}/status - Status: ${status}`);
      
      if (!status) {
        return res.status(400).json({ message: "Status é obrigatório" });
      }
      
      // Verificar se o pedido existe
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Atualizar o status do pedido
      const updatedOrder = await storage.updateOrder(orderId, { statusEnvio: status });
      
      console.log(`[TEST-ORDER-STATUS] Order ${orderId} status updated to: ${status}`);
      res.json(updatedOrder);
    } catch (error) {
      console.error("[TEST-ORDER-STATUS] Error updating order status:", error);
      res.status(500).json({ 
        message: "Erro interno do servidor",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}