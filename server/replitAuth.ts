import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    console.log(`[AUTH] Getting OIDC config for ${process.env.REPL_ID}`);
    const config = await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
    console.log(`[AUTH] OIDC config obtained successfully`);
    return config;
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: false,
      secure: false,
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Configure session middleware
  const sessionMiddleware = getSession();
  app.use(sessionMiddleware);
  
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log(`[AUTH] Verify function called with tokens`);
      const claims = tokens.claims();
      console.log(`[AUTH] User claims:`, JSON.stringify(claims, null, 2));
      
      const user = {};
      updateUserSession(user, tokens);
      console.log(`[AUTH] User session updated:`, JSON.stringify(user, null, 2));
      
      await upsertUser(claims);
      console.log(`[AUTH] User upserted successfully`);
      
      verified(null, user);
      console.log(`[AUTH] Verification completed successfully`);
    } catch (error) {
      console.error(`[AUTH] Error in verify function:`, error);
      verified(error);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    console.log(`[AUTH] Registering strategy for domain: ${domain}`);
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log(`[AUTH] Login attempt for hostname: ${req.hostname}`);
    console.log(`[AUTH] Available domains: ${process.env.REPLIT_DOMAINS}`);
    console.log(`[AUTH] Strategy name: replitauth:${req.hostname}`);
    console.log(`[AUTH] Session ID: ${req.sessionID}`);
    console.log(`[AUTH] User agent: ${req.get('User-Agent')}`);
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log(`[AUTH] ===== CALLBACK RECEIVED =====`);
    console.log(`[AUTH] Hostname: ${req.hostname}`);
    console.log(`[AUTH] Session ID: ${req.sessionID}`);
    console.log(`[AUTH] Query params:`, JSON.stringify(req.query, null, 2));
    console.log(`[AUTH] Cookies:`, req.headers.cookie);
    console.log(`[AUTH] User-Agent:`, req.get('User-Agent'));
    
    const strategyName = `replitauth:${req.hostname}`;
    console.log(`[AUTH] Using strategy: ${strategyName}`);
    
    passport.authenticate(strategyName, (err: any, user: any, info: any) => {
      console.log(`[AUTH] Passport authenticate callback executed`);
      console.log(`[AUTH] Error:`, err);
      console.log(`[AUTH] User:`, user ? 'USER_OBJECT_PRESENT' : 'NO_USER');
      console.log(`[AUTH] Info:`, info);
      
      if (err) {
        console.error(`[AUTH] Authentication error:`, err);
        return res.redirect("/api/login?error=auth_failed");
      }
      
      if (!user) {
        console.log(`[AUTH] No user returned from authentication`);
        return res.redirect("/api/login?error=no_user");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error(`[AUTH] Login error:`, loginErr);
          return res.redirect("/api/login?error=login_failed");
        }
        
        console.log(`[AUTH] User successfully logged in`);
        console.log(`[AUTH] Session after login:`, req.session);
        console.log(`[AUTH] User in session:`, req.user);
        
        return res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
