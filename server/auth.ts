import bcrypt from 'bcryptjs';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());

  // Register route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const user = await storage.createUser({
        id: Date.now().toString(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });
      
      // Set session
      (req.session as any).userId = user.id;
      
      res.json({ message: 'Cadastro realizado com sucesso', user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Dados inválidos' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }
      
      // Check password
      if (!user.password) {
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Email ou senha incorretos' });
      }
      
      // Set session
      (req.session as any).userId = user.id;
      
      res.json({ message: 'Login realizado com sucesso', user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: 'Dados inválidos' });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao fazer logout' });
      }
      res.json({ message: 'Logout realizado com sucesso' });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  (req as any).user = user;
  next();
};