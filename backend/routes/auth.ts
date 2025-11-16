// routes/auth.ts
import express, { Request, Response } from 'express';
import {
  readUsers,
  generateUserId,
  insertUserSorted,
  findUserByID,
  findUserByUsernameOrEmail,
  verifyPassword,
  storePassword,
  updateUser,
} from '../utils/userManager';

const router = express.Router();

/** Adjust if you have concrete shapes */
type Summary = Record<string, unknown>;
type CrashCourse = Record<string, unknown>;

interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  password?: string;         // not exposed via API
  createdAt: string;
  profilePicture?: string;
  major?: string;
  year?: string;
  isAdmin?: boolean;
  crashCourses?: CrashCourse[];
  summaries?: Summary[];
}
interface UsersData {
  users: User[];
}

const ITEMS_PER_PAGE = 4;

// GET /user/:userId/stats
router.get('/user/:userId/stats', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await findUserByID(userId);

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

      const user = await findUserByID(userId);
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

      const user = await findUserByID(userId);
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
router.get('/user/:userId', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await findUserByID(userId);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      major: user.major,
      year: user.year,
      isAdmin: user.isAdmin,
      crashCourses: user.crashCourses ?? [],
      summaries: user.summaries ?? [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    // Try to find user by username or email
    const user = await findUserByUsernameOrEmail(username, username);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Verify password
    const verifiedUser = await verifyPassword(user.email, password);
    if (!verifiedUser) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      user: {
        id: verifiedUser.id,
        username: verifiedUser.username,
        name: verifiedUser.name,
        email: verifiedUser.email,
        profilePicture: verifiedUser.profilePicture ?? '',
        major: verifiedUser.major ?? '',
        year: verifiedUser.year ?? '',
        isAdmin: verifiedUser.isAdmin ?? false,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /register
router.post('/register', async (req: Request, res: Response) => {
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

    // Check if user already exists
    const exists = await findUserByUsernameOrEmail(username, email);
    if (exists) {
      return res.status(409).json({ success: false, error: 'Username or email already in use' });
    }

    const newId = await generateUserId();
    const newUser: User = {
      id: newId,
      username,
      name: name ?? '',
      email,
      createdAt: new Date().toISOString(),
      profilePicture: '',
      crashCourses: [],
      summaries: [],
    };

    await insertUserSorted(newUser, password);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        profilePicture: newUser.profilePicture,
        major: newUser.major,
        year: newUser.year,
        isAdmin: newUser.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// PUT /user/:userId - Update user profile
router.put('/user/:userId', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, major, year, profilePicture } = req.body as {
      name?: string;
      major?: string;
      year?: string;
      profilePicture?: string;
    };

    // Validate input
    if (!name && !major && !year && !profilePicture) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // Build updates object
    const updates: Partial<User> = {};
    if (name !== undefined) updates.name = name;
    if (major !== undefined) updates.major = major;
    if (year !== undefined) updates.year = year;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;

    // Update user
    const updatedUser = await updateUser(userId, updates);

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      name: updatedUser.name,
      major: updatedUser.major,
      year: updatedUser.year,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
