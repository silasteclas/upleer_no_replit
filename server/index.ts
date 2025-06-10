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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
