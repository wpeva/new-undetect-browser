import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Task {
  id: string;
  name: string;
  profileId: string;
  script: string;
  schedule?: string;
  lastRun?: string;
  status: 'running' | 'scheduled' | 'paused' | 'failed';
}

const tasks: Map<string, Task> = new Map();

// GET /api/automation/tasks - Get all tasks
router.get('/tasks', (_req: Request, res: Response) => {
  res.json(Array.from(tasks.values()));
});

// POST /api/automation/tasks - Create task
router.post('/tasks', (req: Request, res: Response) => {
  const task: Task = {
    id: uuidv4(),
    name: req.body.name || `Task ${tasks.size + 1}`,
    profileId: req.body.profileId,
    script: req.body.script || '',
    schedule: req.body.schedule,
    status: 'paused',
  };

  tasks.set(task.id, task);
  res.status(201).json(task);
});

// PUT /api/automation/tasks/:id - Update task
router.put('/tasks/:id', (req: Request, res: Response): void => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Task ID is required' });
    return;
  }

  const task = tasks.get(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const updated = { ...task, ...req.body, id: task.id };
  tasks.set(id, updated);
  res.json(updated);
});

// DELETE /api/automation/tasks/:id - Delete task
router.delete('/tasks/:id', (req: Request, res: Response): void => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Task ID is required' });
    return;
  }

  if (!tasks.has(id)) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  tasks.delete(id);
  res.status(204).send();
});

// POST /api/automation/tasks/:id/run - Run task
router.post('/tasks/:id/run', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Task ID is required' });
    return;
  }

  const task = tasks.get(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  task.status = 'running';
  task.lastRun = new Date().toISOString();
  tasks.set(id, task);

  res.json({ status: 'started', task });
});

export default router;
