// backend/utils/userManager.ts
import fs from 'fs';
import path from 'path';

// -------- Types --------
export interface Summary extends Record<string, unknown> {}
export interface CrashCourse extends Record<string, unknown> {}

export interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  password: string;           // NOTE: plaintext for demo only
  createdAt: string;
  profilePicture?: string;
  crashCourses?: CrashCourse[];
  summaries?: Summary[];
}

export interface UsersData {
  users: User[];
}

// -------- Path resolution (works from src and dist) --------
function resolveUsersJsonPath(): string {
  // When compiled, __dirname = backend/dist/utils
  // In source, __dirname = backend/utils
  const candidates = [
    path.join(__dirname, '..', 'data_objects', 'users.json'),     // dist/utils → dist/data_objects
    path.join(__dirname, '..', '..', 'data_objects', 'users.json') // utils → data_objects
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Fallback to project root (backend/data_objects/users.json)
  return path.join(process.cwd(), 'backend', 'data_objects', 'users.json');
}

const usersPath = resolveUsersJsonPath();

// -------- I/O helpers --------
export function readUsers(): UsersData {
  const raw = fs.readFileSync(usersPath, 'utf8');
  const data = JSON.parse(raw);
  // Basic shape guard
  if (!data || !Array.isArray(data.users)) {
    return { users: [] };
  }
  return data as UsersData;
}

export function writeUsers(userData: UsersData): void {
  const dir = path.dirname(usersPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(usersPath, JSON.stringify(userData, null, 2), 'utf8');
}

// -------- ID generation --------
export function generateUserId(): string {
  const usersData = readUsers();
  const users = usersData.users;

  if (users.length === 0) return 'user_001';

  const lastUser = users[users.length - 1];
  const lastIdNum = parseInt(String(lastUser.id).split('_')[1], 10);
  const newIdNum = (isNaN(lastIdNum) ? 0 : lastIdNum) + 1;

  return `user_${String(newIdNum).padStart(3, '0')}`;
}

// -------- Insert user (append for now) --------
export function insertUserSorted(newUser: User): User {
  const usersData = readUsers();
  usersData.users.push(newUser);
  // (Optional) ensure sort by id if needed:
  // usersData.users.sort((a, b) => a.id.localeCompare(b.id));
  writeUsers(usersData);
  return newUser;
}

// -------- Binary search by ID (assumes sorted by id ascending) --------
export function findUserByID(userId: string): User | null {
  const { users } = readUsers();
  let left = 0;
  let right = users.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midId = users[mid].id;
    if (midId === userId) return users[mid];
    if (midId < userId) left = mid + 1;
    else right = mid - 1;
  }
  return null;
}
