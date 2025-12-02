// backend/utils/userManager.ts
import { supabase } from './supabaseClient';
import bcrypt from 'bcrypt';

// -------- Types --------
export interface Summary extends Record<string, unknown> {}
export interface CrashCourse extends Record<string, unknown> {}

export interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  password?: string;           // Not stored/retrieved for security
  createdAt: string;
  profilePicture?: string;
  major?: string;
  year?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  crashCourses?: CrashCourse[];
  summaries?: Summary[];
}

export interface UsersData {
  users: User[];
}

// -------- ID generation --------
export async function generateUserId(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last user ID:', error);
      return `user_001`;
    }

    if (!data || data.length === 0) {
      return 'user_001';
    }

    const lastId = data[0].id;
    const lastIdNum = parseInt(String(lastId).split('_')[1], 10);
    const newIdNum = (isNaN(lastIdNum) ? 0 : lastIdNum) + 1;

    return `user_${String(newIdNum).padStart(3, '0')}`;
  } catch (err) {
    console.error('Error generating user ID:', err);
    return `user_001`;
  }
}

// -------- Read operations --------
export async function readUsers(): Promise<UsersData> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Error reading users:', error);
      return { users: [] };
    }

    return {
      users: (data || []).map((user: any) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
        profilePicture: user.profile_picture,
        major: user.major,
        year: user.year,
        isAdmin: user.is_admin,
        isSuperAdmin: user.is_super_admin,
        crashCourses: user.crash_courses || [],
        summaries: user.summaries || [],
      })),
    };
  } catch (err) {
    console.error('Error reading users:', err);
    return { users: [] };
  }
}

// -------- Find user by ID --------
export async function findUserByID(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      createdAt: data.created_at,
      profilePicture: data.profile_picture,
      major: data.major,
      year: data.year,
      isAdmin: data.is_admin,
      isSuperAdmin: data.is_super_admin,
      crashCourses: data.crash_courses || [],
      summaries: data.summaries || [],
    };
  } catch (err) {
    console.error('Error finding user by ID:', err);
    return null;
  }
}

// -------- Find user by username or email --------
export async function findUserByUsernameOrEmail(
  username: string,
  email: string
): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      createdAt: data.created_at,
      profilePicture: data.profile_picture,
      major: data.major,
      year: data.year,
      isAdmin: data.is_admin,
      isSuperAdmin: data.is_super_admin,
      crashCourses: data.crash_courses || [],
      summaries: data.summaries || [],
    };
  } catch (err) {
    // No match found is not an error
    return null;
  }
}

// -------- Insert new user --------
export async function insertUserSorted(newUser: User, password?: string): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name || '',
          email: newUser.email,
          password: password || '', // Include password in insert
          created_at: newUser.createdAt,
          profile_picture: newUser.profilePicture || '',
          major: newUser.major || '',
          year: newUser.year || '',
          is_admin: newUser.isAdmin || false,
          is_super_admin: newUser.isSuperAdmin || false,
          crash_courses: newUser.crashCourses || [],
          summaries: newUser.summaries || [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting user:', error);
      throw error;
    }

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      createdAt: data.created_at,
      profilePicture: data.profile_picture,
      major: data.major,
      year: data.year,
      isAdmin: data.is_admin,
      isSuperAdmin: data.is_super_admin,
      crashCourses: data.crash_courses || [],
      summaries: data.summaries || [],
    };
  } catch (err) {
    console.error('Error inserting user:', err);
    throw err;
  }
}

// -------- Update user --------
export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const updateData: Record<string, any> = {};

    if (updates.username) updateData.username = updates.username;
    if (updates.name) updateData.name = updates.name;
    if (updates.profilePicture) updateData.profile_picture = updates.profilePicture;
    if (updates.major) updateData.major = updates.major;
    if (updates.year) updateData.year = updates.year;
    if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
    if (updates.isSuperAdmin !== undefined) updateData.is_super_admin = updates.isSuperAdmin;
    if (updates.crashCourses) updateData.crash_courses = updates.crashCourses;
    if (updates.summaries) updateData.summaries = updates.summaries;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      email: data.email,
      createdAt: data.created_at,
      profilePicture: data.profile_picture,
      major: data.major,
      year: data.year,
      isAdmin: data.is_admin,
      isSuperAdmin: data.is_super_admin,
      crashCourses: data.crash_courses || [],
      summaries: data.summaries || [],
    };
  } catch (err) {
    console.error('Error updating user:', err);
    return null;
  }
}

// -------- Verify password (for authentication) --------
export async function verifyPassword(email: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    const passwordMatch = await bcrypt.compare(password, data.password);

    if (passwordMatch) {
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        email: data.email,
        createdAt: data.created_at,
        profilePicture: data.profile_picture,
        major: data.major,
        year: data.year,
        isAdmin: data.is_admin,
        isSuperAdmin: data.is_super_admin,
        crashCourses: data.crash_courses || [],
        summaries: data.summaries || [],
      };
    }

    return null;
  } catch (err) {
    console.error('Error verifying password:', err);
    return null;
  }
}

// -------- Store password (for registration) --------
export async function storePassword(userId: string, password: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ password })
      .eq('id', userId);

    if (error) {
      console.error('Error storing password:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error storing password:', err);
    return false;
  }
}
