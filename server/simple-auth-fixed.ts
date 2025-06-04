import type { RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication middleware that works reliably
export const simpleAuthFixed: RequestHandler = async (req, res, next) => {
  // Check if user is already in session
  if (req.session && (req.session as any).userId) {
    const user = await storage.getUser((req.session as any).userId);
    if (user) {
      (req as any).user = user;
      return next();
    }
  }
  
  // Return 401 for API routes (except public endpoints)
  const publicEndpoints = ['/api/auth/user', '/api/simple-login', '/api/webhook/'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  if (req.path.startsWith('/api/') && !isPublicEndpoint) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
};

export const simpleLoginFixed: RequestHandler = async (req, res) => {
  try {
    console.log('[SIMPLE-AUTH] Login attempt:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    // For demo purposes, accept any valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    // Create or get user
    let user = await storage.getUserByEmail(email);
    
    if (!user) {
      // Create new user
      const [firstName, ...lastNameParts] = email.split('@')[0].split('.');
      user = await storage.createUser({
        id: `user_${Date.now()}`,
        email,
        firstName: firstName || 'Usuário',
        lastName: lastNameParts.join(' ') || '',
        profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || 'User')}&background=0066cc&color=fff`
      });
      console.log('[SIMPLE-AUTH] New user created:', user.id);
    }

    // Set session
    (req.session as any).userId = user.id;
    console.log('[SIMPLE-AUTH] Session set for user:', user.id);
    
    res.json({ 
      message: "Login realizado com sucesso",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      }
    });
  } catch (error) {
    console.error('[SIMPLE-AUTH] Login error:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const simpleUserCheckFixed: RequestHandler = async (req, res) => {
  try {
    if (req.session && (req.session as any).userId) {
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        });
      }
    }
    
    res.status(401).json({ message: "Não autenticado" });
  } catch (error) {
    console.error('[SIMPLE-AUTH] User check error:', error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const simpleLogoutFixed: RequestHandler = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[SIMPLE-AUTH] Logout error:', err);
      return res.status(500).json({ message: "Erro ao fazer logout" });
    }
    res.json({ message: "Logout realizado com sucesso" });
  });
};