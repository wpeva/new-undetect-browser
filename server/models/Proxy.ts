/**
 * Proxy model
 */

import { getDatabase } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export interface Proxy {
  id: string;
  name: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  city?: string;
  status: 'unchecked' | 'working' | 'failed';
  last_checked?: number;
  speed?: number;
  created_at: number;
}

export class ProxyModel {
  /**
   * Create new proxy
   */
  static async create(data: Partial<Proxy>): Promise<Proxy> {
    const db = getDatabase();
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    await db.run(
      `INSERT INTO proxies (
        id, name, type, host, port, username, password,
        country, city, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name || `${data.host}:${data.port}`,
        data.type || 'http',
        data.host,
        data.port,
        data.username || null,
        data.password || null,
        data.country || null,
        data.city || null,
        data.status || 'unchecked',
        now,
      ]
    );

    return this.findById(id) as Promise<Proxy>;
  }

  /**
   * Find proxy by ID
   */
  static async findById(id: string): Promise<Proxy | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM proxies WHERE id = ?', id);
  }

  /**
   * Find all proxies
   */
  static async findAll(filters?: {
    status?: string;
    type?: string;
    country?: string;
  }): Promise<Proxy[]> {
    const db = getDatabase();
    let query = 'SELECT * FROM proxies WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.country) {
      query += ' AND country = ?';
      params.push(filters.country);
    }

    query += ' ORDER BY created_at DESC';

    return db.all(query, ...params);
  }

  /**
   * Update proxy
   */
  static async update(id: string, data: Partial<Proxy>): Promise<Proxy | null> {
    const db = getDatabase();

    const fields = Object.keys(data)
      .filter((key) => key !== 'id')
      .map((key) => `${key} = ?`)
      .join(', ');

    if (!fields) {
      return this.findById(id);
    }

    const values = Object.entries(data)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => value);

    await db.run(`UPDATE proxies SET ${fields} WHERE id = ?`, [...values, id]);

    return this.findById(id);
  }

  /**
   * Delete proxy
   */
  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM proxies WHERE id = ?', id);
    return (result.changes || 0) > 0;
  }

  /**
   * Bulk import proxies
   */
  static async bulkCreate(proxies: Partial<Proxy>[]): Promise<number> {
    const db = getDatabase();
    let count = 0;

    for (const proxy of proxies) {
      try {
        await this.create(proxy);
        count++;
      } catch (error) {
        console.error(`Failed to import proxy: ${proxy.host}:${proxy.port}`, error);
      }
    }

    return count;
  }

  /**
   * Update proxy status after check
   */
  static async updateStatus(
    id: string,
    status: Proxy['status'],
    speed?: number
  ): Promise<void> {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    await db.run(
      'UPDATE proxies SET status = ?, last_checked = ?, speed = ? WHERE id = ?',
      status,
      now,
      speed || null,
      id
    );
  }

  /**
   * Get proxy count by status
   */
  static async countByStatus(): Promise<Record<string, number>> {
    const db = getDatabase();
    const rows = await db.all('SELECT status, COUNT(*) as count FROM proxies GROUP BY status');

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }

    return result;
  }
}
