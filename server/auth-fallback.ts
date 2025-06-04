import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

// Simple fallback authentication for public domain
const loginSchema = {
  email: "string",
  password: "string"
};

export const fallbackLogin: RequestHandler = async (req, res) => {
  try {
    console.log(`[FALLBACK] Login attempt with:`, req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log(`[FALLBACK] Missing credentials`);
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    console.log(`[FALLBACK] Checking credentials: ${email} / ${password}`);
    // For demo purposes, use a simple admin account
    if (email === "admin@upleer.com" && password === "admin123") {
      // Create or get admin user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.upsertUser({
          id: "admin-user",
          email: email,
          firstName: "Admin",
          lastName: "Upleer",
          profileImageUrl: null
        });
      }

      // Set session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      };

      console.log(`[FALLBACK] Session set for user:`, (req.session as any).user);
      
      // Save session explicitly and wait for it
      return new Promise((resolve) => {
        req.session.save((err) => {
          if (err) {
            console.error(`[FALLBACK] Session save error:`, err);
            return res.status(500).json({ message: "Erro ao salvar sessão" });
          } else {
            console.log(`[FALLBACK] Session saved successfully for user:`, user.id);
            res.json({
              message: "Login realizado com sucesso!",
              user: (req.session as any).user
            });
            resolve(undefined);
          }
        });
      });
    }

    return res.status(401).json({ message: "Credenciais inválidas" });
  } catch (error) {
    console.error("Fallback login error:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const fallbackAuth: RequestHandler = (req, res, next) => {
  // Check if we're on the public domain
  if (req.hostname === "prompt-flow-adm64.replit.app") {
    // Use session-based auth for public domain
    if ((req.session as any)?.user) {
      (req as any).user = (req.session as any).user;
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // For other domains, continue with regular auth flow
  next();
};

export const fallbackLogout: RequestHandler = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
    }
    res.json({ message: "Logout realizado com sucesso" });
  });
};