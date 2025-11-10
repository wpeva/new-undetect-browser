import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/stats - Get statistics
router.get('/', (_req: Request, res: Response) => {
  res.json({
    totalProfiles: 24,
    activeProfiles: 8,
    totalProxies: 156,
    successRate: 98.5,
    todayUsage: 142,
    weeklyUsage: [45, 52, 61, 48, 73, 65, 142],
  });
});

export default router;
