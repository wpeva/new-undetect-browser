import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Proxy {
  id: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  city?: string;
  status: 'active' | 'inactive' | 'checking';
}

const proxies: Map<string, Proxy> = new Map();

// GET /api/proxies - Get all proxies
router.get('/', (_req: Request, res: Response) => {
  res.json(Array.from(proxies.values()));
});

// POST /api/proxies - Add proxy
router.post('/', (req: Request, res: Response) => {
  const proxy: Proxy = {
    id: uuidv4(),
    type: req.body.type || 'http',
    host: req.body.host,
    port: req.body.port,
    username: req.body.username,
    password: req.body.password,
    country: req.body.country,
    city: req.body.city,
    status: 'inactive',
  };

  proxies.set(proxy.id, proxy);
  res.status(201).json(proxy);
});

// PUT /api/proxies/:id - Update proxy
router.put('/:id', (req: Request, res: Response) => {
  const proxy = proxies.get(req.params.id);
  if (!proxy) {
    return res.status(404).json({ error: 'Proxy not found' });
  }

  const updated = { ...proxy, ...req.body, id: proxy.id };
  proxies.set(req.params.id, updated);
  res.json(updated);
});

// DELETE /api/proxies/:id - Delete proxy
router.delete('/:id', (req: Request, res: Response) => {
  if (!proxies.has(req.params.id)) {
    return res.status(404).json({ error: 'Proxy not found' });
  }

  proxies.delete(req.params.id);
  res.status(204).send();
});

// POST /api/proxies/:id/check - Check proxy
router.post('/:id/check', async (req: Request, res: Response) => {
  const proxy = proxies.get(req.params.id);
  if (!proxy) {
    return res.status(404).json({ error: 'Proxy not found' });
  }

  // Simulate proxy check
  proxy.status = 'checking';
  proxies.set(req.params.id, proxy);

  setTimeout(() => {
    proxy.status = Math.random() > 0.3 ? 'active' : 'inactive';
    proxies.set(req.params.id, proxy);
  }, 1000);

  res.json({
    status: 'checking',
    latency: Math.floor(Math.random() * 200) + 50,
  });
});

export default router;
