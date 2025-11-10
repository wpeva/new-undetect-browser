/**
 * Profile model
 */

import { getDatabase } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export interface Profile {
  id: string;
  name: string;
  group_id?: string;
  status: 'idle' | 'active' | 'error';
  user_agent?: string;
  fingerprint?: string;
  proxy_id?: string;
  cookies?: string;
  local_storage?: string;
  session_storage?: string;
  tags?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
  last_used?: number;
  use_count: number;
}

export class ProfileModel {
  /**
   * Create new profile
   */
  static async create(data: Partial<Profile>): Promise<Profile> {
    const db = getDatabase();
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    await db.run(
      `INSERT INTO profiles (
        id, name, group_id, status, user_agent, fingerprint,
        proxy_id, cookies, local_storage, session_storage,
        tags, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name || `Profile ${Date.now()}`,
        data.group_id || null,
        data.status || 'idle',
        data.user_agent || null,
        data.fingerprint || null,
        data.proxy_id || null,
        data.cookies || null,
        data.local_storage || null,
        data.session_storage || null,
        data.tags || null,
        data.notes || null,
        now,
        now,
      ]
    );

    return this.findById(id) as Promise<Profile>;
  }

  /**
   * Find profile by ID
   */
  static async findById(id: string): Promise<Profile | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM profiles WHERE id = ?', id);
  }

  /**
   * Find all profiles
   */
  static async findAll(filters?: {
    group_id?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Profile[]> {
    const db = getDatabase();
    let query = 'SELECT * FROM profiles WHERE 1=1';
    const params: any[] = [];

    if (filters?.group_id) {
      query += ' AND group_id = ?';
      params.push(filters.group_id);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.search) {
      query += ' AND (name LIKE ? OR tags LIKE ? OR notes LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    return db.all(query, ...params);
  }

  /**
   * Update profile
   */
  static async update(id: string, data: Partial<Profile>): Promise<Profile | null> {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

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

    await db.run(
      `UPDATE profiles SET ${fields}, updated_at = ? WHERE id = ?`,
      [...values, now, id]
    );

    return this.findById(id);
  }

  /**
   * Delete profile
   */
  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM profiles WHERE id = ?', id);
    return (result.changes || 0) > 0;
  }

  /**
   * Bulk delete profiles
   */
  static async bulkDelete(ids: string[]): Promise<number> {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.run(
      `DELETE FROM profiles WHERE id IN (${placeholders})`,
      ...ids
    );
    return result.changes || 0;
  }

  /**
   * Update profile status
   */
  static async updateStatus(id: string, status: Profile['status']): Promise<void> {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    await db.run(
      'UPDATE profiles SET status = ?, updated_at = ? WHERE id = ?',
      status,
      now,
      id
    );

    if (status === 'active') {
      await db.run(
        'UPDATE profiles SET last_used = ?, use_count = use_count + 1 WHERE id = ?',
        now,
        id
      );
    }
  }

  /**
   * Get profile count
   */
  static async count(filters?: { group_id?: string; status?: string }): Promise<number> {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM profiles WHERE 1=1';
    const params: any[] = [];

    if (filters?.group_id) {
      query += ' AND group_id = ?';
      params.push(filters.group_id);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const result = await db.get(query, ...params);
    return result?.count || 0;
  }

  /**
   * Get profiles by group
   */
  static async findByGroup(groupId: string): Promise<Profile[]> {
    return this.findAll({ group_id: groupId });
  }

  /**
   * Search profiles
   */
  static async search(query: string, limit = 50): Promise<Profile[]> {
    return this.findAll({ search: query, limit });
  }
}
