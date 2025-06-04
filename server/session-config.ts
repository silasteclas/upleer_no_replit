import session from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

export function createSessionConfig() {
  return session({
    secret: process.env.SESSION_SECRET || 'upleer-fallback-secret-2024',
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    name: 'upleer.sid',
    cookie: {
      secure: false, // Allow HTTP for development and public domains
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  });
}