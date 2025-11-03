// routes/auth.ts
import express, { Request, Response } from 'express';
import { readUsers, generateUserId, insertUserSorted } from '../utils/userManager';

const router = express.Router();

/** Adjust if you have concrete shapes */
type Summary = Record<string, unknown>;
type CrashCourse = Record<string, unknown>;

interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  password: string;         // demo only (plaintext)
  createdAt: string;
  profilePicture?: string;
  crashCourses?: CrashCourse[];
  summaries?: Summary[];
}
interface UsersData {
  users: User[];
}

const ITEMS_PER_PAGE = 4;
const WAITING_RANGE_MS = 400;

function simulateDelay(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, WAITING_RANGE_MS + Math.random() * WAITING_RANGE_MS)
  );
}

// GET /user/:userId/stats
router.get('/user/:userId/stats', (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const usersData = readUsers() as UsersData;
    const user = usersData.users.find((u) => u.id === userId);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({
      totalSummaries: (user.summaries ?? []).length,
      totalCrashCourses: (user.crashCourses ?? []).length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /user/:userId/summaries
router.get(
  '/user/:userId/summaries',
  async (
    req: Request<{ userId: string }, unknown, unknown, { start?: string; limit?: string }>,
    res: Response
  ) => {
    try {
      const { userId } = req.params;
      const start = Number(req.query.start ?? 0) || 0;
      const limit = Number(req.query.limit ?? ITEMS_PER_PAGE) || ITEMS_PER_PAGE;

      await simulateDelay();

      const usersData = readUsers() as UsersData;
      const user = usersData.users.find((u) => u.id === userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const allSummaries = user.summaries ?? [];
      const items = allSummaries.slice(start, start + limit);

      res.json({ items, hasMore: start + limit < allSummaries.length });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

// GET /user/:userId/crash-courses
router.get(
  '/user/:userId/crash-courses',
  async (
    req: Request<{ userId: string }, unknown, unknown, { start?: string; limit?: string }>,
    res: Response
  ) => {
    try {
      const { userId } = req.params;
      const start = Number(req.query.start ?? 0) || 0;
      const limit = Number(req.query.limit ?? ITEMS_PER_PAGE) || ITEMS_PER_PAGE;

      await simulateDelay();

      const usersData = readUsers() as UsersData;
      const user = usersData.users.find((u) => u.id === userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const allCourses = user.crashCourses ?? [];
      const items = allCourses.slice(start, start + limit);

      res.json({ items, hasMore: start + limit < allCourses.length });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
);

// GET /user/:userId
router.get('/user/:userId', (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const usersData = readUsers() as UsersData;
    const user = usersData.users.find((u) => u.id === userId);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      crashCourses: user.crashCourses ?? [],
      summaries: user.summaries ?? [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const usersData = readUsers() as UsersData;
    const user = usersData.users.find(
      (u) => (u.username === username || u.email === username) && u.password === password
    );

    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture ?? '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, name, email, password } = req.body as {
      username?: string;
      name?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, error: 'Username, email and password are required' });
    }

    const usersData = readUsers() as UsersData;
    const exists = usersData.users.find((u) => u.username === username || u.email === email);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Username or email already in use' });
    }

    const newId = generateUserId();
    const newUser: User = {
      id: newId,
      username,
      name: name ?? '',
      email,
      password, // demo only
      createdAt: new Date().toISOString(),
      profilePicture: '',
      crashCourses: [],
      summaries: [],
    };

    insertUserSorted(newUser);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        profilePicture: newUser.profilePicture,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
