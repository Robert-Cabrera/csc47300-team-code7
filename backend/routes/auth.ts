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
  isSuperAdmin?: boolean;
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
      isSuperAdmin: user.isSuperAdmin,
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

    // ! CHECKMARK 2.1: LOGIN AS EITHER ADMIN OR SUPER ADMIN

    // ? STEP 1: Find user by username or email
    /*

    CODE TO HIT THE DATABASE AND CHECK FOR USER OR EMAIL
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`username.eq.${username},email.eq.${email}`)
          .single();
    */
    const user = await findUserByUsernameOrEmail(username, username);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // ? STEP 2: Verify password
    /*
      CODE TO HIT THE DATABASE AND VERIFY THE PASSWORD
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (error || !data) {
          return null;
        }

        ? Note that we are encrypting the password using bcrypt
        const passwordMatch = await bcrypt.compare(password, data.password);
    */
    const verifiedUser = await verifyPassword(user.email, password);
    if (!verifiedUser) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // ? STEP 3: Return user data (including admin and superAdmin flags)
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
        isSuperAdmin: verifiedUser.isSuperAdmin ?? false,
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
        isSuperAdmin: newUser.isSuperAdmin,
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

router.post('/makeSuperAdmin', async (req: Request, res: Response) => {
  try {
    const { username, name, isSuperAdmin } = req.body as {
      username?: string;
      name?: string;
      isSuperAdmin?: boolean;
    };

    // Validate input
    if (!username || !name) {
      return res
        .status(400)
        .json({ success: false, error: 'Username and name are required' });
    }

    if (isSuperAdmin === undefined) {
      return res
        .status(400)
        .json({ success: false, error: 'isSuperAdmin flag is required' });
    }

    // Find user by username
    const user = await findUserByUsernameOrEmail(username, '');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify name matches
    if (user.name !== name) {
      return res
        .status(400)
        .json({ success: false, error: 'Username and name do not match' });
    }

    // Update user's super admin status
    // ! CHECKMARK 2.2: BACKEND that allows "SUPER ADMIN" to update other users to be "SUPER ADMIN"
    /*
      ? THIS IS AN ``UPDATE`` OPERATION

      CODE TO HIT THE DATABASE AND UPDATE THE USER'S isSuperAdmin FLAG
          
          if (updates.isSuperAdmin !== undefined) updateData.is_super_admin = updates.isSuperAdmin;

          const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

    */
    const updatedUser = await updateUser(user.id, { isSuperAdmin });

    if (!updatedUser) {
      return res.status(500).json({ success: false, error: 'Failed to update user' });
    }

    res.json({
      success: true,
      message: isSuperAdmin
        ? `User ${username} promoted to super admin`
        : `User ${username} removed from super admin`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        isSuperAdmin: updatedUser.isSuperAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
