/**
 * JWT Authentication Middleware
 * Provides secure authentication for API endpoints
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../src/utils/logger';

// JWT Secret (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'undetect-browser-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

/**
 * Extended Request with user
 */
export interface AuthRequest extends Request {
  user?: JWTPayload;
  body: any;
  params: any;
  query: any;
}

/**
 * In-memory user store (replace with database in production)
 */
const users: Map<string, {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
}> = new Map();

// Default admin user
const defaultAdminHash = bcrypt.hashSync('admin123', SALT_ROUNDS);
users.set('admin', {
  id: '1',
  username: 'admin',
  email: 'admin@undetect-browser.local',
  password: defaultAdminHash,
  role: 'admin',
  createdAt: new Date(),
});

/**
 * Generate JWT token
 */
export function generateToken(userId: string, username: string, role: string): string {
  const payload: JWTPayload = {
    userId,
    username,
    role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Authentication middleware
 * Verifies JWT token in Authorization header
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't reject if missing
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
    next();
  } catch (error) {
    next(); // Continue even if error
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Login handler
 */
export async function login(username: string, password: string): Promise<{ token: string; user: User } | null> {
  try {
    // Find user
    const user = users.get(username);
    if (!user) {
      return null;
    }

    // Compare password
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // Generate token
    const token = generateToken(user.id, user.username, user.role);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    logger.error('Login error:', error);
    return null;
  }
}

/**
 * Register new user
 */
export async function register(
  username: string,
  password: string,
  email: string
): Promise<{ token: string; user: User } | null> {
  try {
    // Check if user exists
    if (users.has(username)) {
      return null;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = String(users.size + 1);
    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: 'user' as const,
      createdAt: new Date(),
    };

    users.set(username, newUser);

    // Generate token
    const token = generateToken(userId, username, newUser.role);

    return {
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    };
  } catch (error) {
    logger.error('Registration error:', error);
    return null;
  }
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): User | null {
  for (const user of users.values()) {
    if (user.id === userId) {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      };
    }
  }
  return null;
}

/**
 * Get all users (admin only)
 */
export function getAllUsers(): User[] {
  return Array.from(users.values()).map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }));
}
