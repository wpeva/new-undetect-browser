/**
 * Audit Logger
 *
 * Logs all security-relevant actions for compliance and forensics.
 */

import fs from 'fs/promises';
import path from 'path';

export interface AuditEntry {
  timestamp: number;
  userId: string;
  action: string;
  resource: string;
  ip: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: any;
}

export interface AuditOptions {
  logPath?: string;
  retention?: number;  // days
  elasticsearch?: boolean;
  elasticsearchUrl?: string;
}

export class AuditLogger {
  private logPath: string;
  private retention: number;

  constructor(options: AuditOptions = {}) {
    this.logPath = options.logPath || './logs/audit';
    this.retention = options.retention || 90;
  }

  /**
   * Log an audit entry
   */
  async log(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
    const auditEntry: AuditEntry = {
      timestamp: Date.now(),
      ...entry
    };

    // Write to file
    const date = new Date().toISOString().split('T')[0];
    const filename = path.join(this.logPath, `audit-${date}.log`);

    try {
      await fs.mkdir(this.logPath, { recursive: true });
      await fs.appendFile(filename, JSON.stringify(auditEntry) + '\n');
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }

    // Emit event for real-time monitoring
    console.log('[AUDIT]', auditEntry);
  }

  /**
   * Query audit logs
   */
  async query(filter: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];

    // Read log files
    const files = await fs.readdir(this.logPath);

    for (const file of files) {
      if (!file.startsWith('audit-') || !file.endsWith('.log')) {
        continue;
      }

      const content = await fs.readFile(path.join(this.logPath, file), 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditEntry;

          // Apply filters
          if (filter.userId && entry.userId !== filter.userId) continue;
          if (filter.action && entry.action !== filter.action) continue;
          if (filter.startDate && entry.timestamp < filter.startDate.getTime()) continue;
          if (filter.endDate && entry.timestamp > filter.endDate.getTime()) continue;

          entries.push(entry);
        } catch (error) {
          // Skip invalid lines
        }
      }
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clean up old logs
   */
  async cleanup(): Promise<number> {
    const cutoff = Date.now() - this.retention * 24 * 60 * 60 * 1000;
    const files = await fs.readdir(this.logPath);
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(this.logPath, file);
      const stats = await fs.stat(filePath);

      if (stats.mtimeMs < cutoff) {
        await fs.unlink(filePath);
        deleted++;
      }
    }

    return deleted;
  }
}

// Middleware for Express
export function auditMiddleware(logger: AuditLogger) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      res.send = originalSend;

      // Log request
      logger.log({
        userId: req.user?.userId || 'anonymous',
        action: `${req.method} ${req.path}`,
        resource: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        success: res.statusCode < 400,
        error: res.statusCode >= 400 ? data : undefined,
        metadata: {
          duration: Date.now() - start,
          statusCode: res.statusCode
        }
      }).catch(console.error);

      return originalSend.call(this, data);
    };

    next();
  };
}

// Example usage:
/*
const audit = new AuditLogger({
  logPath: './logs/audit',
  retention: 90
});

// Log action
await audit.log({
  userId: 'user123',
  action: 'session.create',
  resource: 'session/456',
  ip: '192.168.1.1',
  success: true
});

// Query logs
const logs = await audit.query({
  userId: 'user123',
  startDate: new Date('2024-01-01')
});

// Cleanup
const deleted = await audit.cleanup();
*/
