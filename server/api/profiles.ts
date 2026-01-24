import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory storage (replace with database in production)
interface Profile {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'stopped';
  fingerprint: Record<string, any>;
  proxy?: Record<string, any>;
  userAgent: string;
  createdAt: string;
  lastUsed?: string;
  tags: string[];
  notes?: string;
}

const profiles: Map<string, Profile> = new Map();

// GET /api/profiles - Get all profiles
router.get('/', (_req: Request, res: Response) => {
  res.json(Array.from(profiles.values()));
});

// GET /api/profiles/:id - Get profile by ID
router.get('/:id', (req: Request, res: Response): void => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Profile ID is required' });
    return;
  }

  const profile = profiles.get(id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
});

// POST /api/profiles - Create new profile
router.post('/', (req: Request, res: Response) => {
  const profile: Profile = {
    id: uuidv4(),
    name: req.body.name || `Profile ${profiles.size + 1}`,
    status: 'idle',
    fingerprint: req.body.fingerprint || {},
    proxy: req.body.proxy,
    userAgent: req.body.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    createdAt: new Date().toISOString(),
    tags: req.body.tags || [],
    notes: req.body.notes,
  };

  profiles.set(profile.id, profile);
  res.status(201).json(profile);
});

// PUT /api/profiles/:id - Update profile
router.put('/:id', (req: Request, res: Response): void => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Profile ID is required' });
    return;
  }

  const profile = profiles.get(id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const updated = { ...profile, ...req.body, id: profile.id };
  profiles.set(id, updated);
  res.json(updated);
});

// DELETE /api/profiles/:id - Delete profile
router.delete('/:id', (req: Request, res: Response): void => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Profile ID is required' });
    return;
  }

  if (!profiles.has(id)) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  profiles.delete(id);
  res.status(204).send();
});

// POST /api/profiles/:id/launch - Launch browser
router.post('/:id/launch', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Profile ID is required' });
    return;
  }

  const profile = profiles.get(id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  profile.status = 'active';
  profile.lastUsed = new Date().toISOString();
  profiles.set(id, profile);

  res.json({ status: 'launched', profile });
});

// POST /api/profiles/:id/stop - Stop browser
router.post('/:id/stop', (req: Request, res: Response): void => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Profile ID is required' });
    return;
  }

  const profile = profiles.get(id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  profile.status = 'stopped';
  profiles.set(id, profile);

  res.json({ status: 'stopped', profile });
});

export default router;
