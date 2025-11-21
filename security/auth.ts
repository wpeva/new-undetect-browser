/**
 * JWT Authentication Service
 *
 * Provides token-based authentication with refresh tokens.
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export interface AuthOptions {
  jwtSecret: string;
  accessTokenTTL?: number;   // seconds (default: 900 = 15 min)
  refreshTokenTTL?: number;  // seconds (default: 604800 = 7 days)
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private jwtSecret: string;
  private accessTokenTTL: number;
  private refreshTokenTTL: number;
  private refreshTokens = new Map<string, TokenPayload>();

  constructor(options: AuthOptions) {
    this.jwtSecret = options.jwtSecret;
    this.accessTokenTTL = options.accessTokenTTL || 900;
    this.refreshTokenTTL = options.refreshTokenTTL || 604800;
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    // Generate access token (short-lived)
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenTTL
    });

    // Generate refresh token (long-lived)
    const refreshToken = randomBytes(32).toString('hex');
    this.refreshTokens.set(refreshToken, payload);

    // Set expiry for refresh token
    setTimeout(() => {
      this.refreshTokens.delete(refreshToken);
    }, this.refreshTokenTTL * 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTTL
    };
  }

  /**
   * Verify access token
   */
  async verify(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = this.refreshTokens.get(refreshToken);

    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Delete old refresh token
    this.refreshTokens.delete(refreshToken);

    // Generate new tokens
    return await this.generateTokens(payload);
  }

  /**
   * Revoke refresh token
   */
  async revoke(refreshToken: string): Promise<void> {
    this.refreshTokens.delete(refreshToken);
  }

  /**
   * Check if user has permission
   */
  hasPermission(payload: TokenPayload, permission: string): boolean {
    return payload.permissions.includes(permission) || payload.role === 'admin';
  }
}

// Middleware for Express
export function authMiddleware(authService: AuthService) {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const payload = await authService.verify(token);
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Example usage:
/*
const auth = new AuthService({
  jwtSecret: process.env.JWT_SECRET!,
  accessTokenTTL: 900,
  refreshTokenTTL: 604800
});

// Generate tokens
const tokens = await auth.generateTokens({
  userId: 'user123',
  username: 'john',
  role: 'user',
  permissions: ['session.create', 'session.read']
});

// Verify token
const payload = await auth.verify(tokens.accessToken);

// Refresh
const newTokens = await auth.refresh(tokens.refreshToken);
*/
