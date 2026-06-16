import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { UserSkill } from '@/types/skill';

interface User {
  id: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  balancePoints: number;
  usedPoints: number;
  usedTokens: number;
}

interface Project {
  id: string;
  userId?: string;
  isDemo?: boolean;
  name: string;
  description?: string;
  requirement?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  projectType?: string;
  templateId?: string | null;
  runtimeKind?: string | null;
}

interface ProjectFile {
  id: number;
  projectId: string;
  path: string;
  name: string;
  language: string;
  content: string;
  createdAt: string;
}

interface BillingSession {
  id: string;
  accountId: string;
  projectId: string;
  taskType: 'demo_generate' | 'demo_iterate';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  balanceBefore: number;
  balanceAfter?: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  pointsCharged: number;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

interface BillingSessionStep {
  id: string;
  sessionId: string;
  stepName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  pointsCharged: number;
  status: 'success' | 'failed';
  requestId?: string;
  durationMs?: number;
  createdAt: string;
}

interface PointLedgerEntry {
  id: string;
  accountId: string;
  sessionId?: string;
  changeType: 'consume' | 'recharge' | 'refund' | 'manual_adjust';
  deltaPoints: number;
  balanceBefore: number;
  balanceAfter: number;
  remark?: string;
  createdAt: string;
}

type CollectionMap = {
  users: User;
  projects: Project;
  projectFiles: ProjectFile;
  billingSessions: BillingSession;
  billingSessionSteps: BillingSessionStep;
  pointLedger: PointLedgerEntry;
  userSkills: UserSkill;
};

type CollectionName = keyof CollectionMap;

type DatabaseCollection = keyof Omit<CollectionMap, never>;

const defaultUsers = [
  { id: 'admin', name: 'admin', password: 'admin123', role: 'admin' as const, avatar: '👔' },
  { id: 'test1', name: 'test1', password: 'admin123', role: 'user' as const, avatar: '👨‍💼' },
  { id: 'test2', name: 'test2', password: 'admin123', role: 'user' as const, avatar: '👩‍💼' },
  { id: 'test3', name: 'test3', password: 'admin123', role: 'user' as const, avatar: '🧑‍💼' },
];

let db: Database.Database | null = null;

function getDbPath() {
  return path.join(process.cwd(), 'data', 'app.db');
}

function getJsonPath() {
  return path.join(process.cwd(), 'data', 'db.json');
}

function ensureDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function parseRow<T>(row: any): T {
  if (!row?.data) throw new Error('Invalid row data');
  return JSON.parse(row.data) as T;
}

function collectionToTable(collection: CollectionName) {
  return collection;
}

function makeInsertId(collection: CollectionName) {
  if (collection === 'projects') return `proj_${Date.now().toString(36)}`;
  if (collection === 'billingSessions') return `bill_${Date.now().toString(36)}`;
  if (collection === 'billingSessionSteps') return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (collection === 'pointLedger') return `ledger_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return uuidv4();
}

function seedDefaultUsers() {
  const database = ensureDb();
  const select = database.prepare('SELECT id, data FROM users');
  const insertStmt = database.prepare('INSERT INTO users (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)');
  const now = new Date().toISOString();
  const existing = new Map((select.all() as any[]).map((row) => {
    const user = parseRow<User>(row);
    return [user.name, user];
  }));

  for (const defaultUser of defaultUsers) {
    const found = existing.get(defaultUser.name);
    if (!found) {
      const user: User = {
        ...defaultUser,
        createdAt: now,
        balancePoints: 100,
        usedPoints: 0,
        usedTokens: 0,
      };
      insertStmt.run(user.id, JSON.stringify(user), now, now);
      continue;
    }

    const nextUser: User = {
      ...found,
      usedPoints: found.usedPoints ?? 0,
      usedTokens: found.usedTokens ?? 0,
      balancePoints: found.id !== 'admin'
        ? (found.balancePoints === undefined || found.balancePoints === null || found.balancePoints === 0 ? 100 : found.balancePoints)
        : (found.balancePoints === undefined || found.balancePoints === null ? 100 : found.balancePoints),
    };

    if (JSON.stringify(nextUser) !== JSON.stringify(found)) {
      database.prepare('UPDATE users SET data = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(nextUser), now, found.id);
    }
  }
}

function migrateJsonIfNeeded() {
  const database = ensureDb();
  const hasUsers = Number(database.prepare('SELECT COUNT(1) as count FROM users').get()?.count || 0) > 0;
  if (hasUsers) return;

  const jsonPath = getJsonPath();
  if (!fs.existsSync(jsonPath)) return;

  const raw = fs.readFileSync(jsonPath, 'utf-8').trim();
  if (!raw) return;

  const parsed = JSON.parse(raw);
  const now = new Date().toISOString();
  const transaction = database.transaction(() => {
    const insertRow = (table: string, id: string | number, item: any) => {
      database.prepare(`INSERT INTO ${table} (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(String(id), JSON.stringify(item), item.createdAt || item.startedAt || now, item.updatedAt || item.finishedAt || now);
    };

    for (const item of parsed.users || []) insertRow('users', item.id, item);
    for (const item of parsed.projects || []) insertRow('projects', item.id, item);
    for (const item of parsed.projectFiles || []) insertRow('projectFiles', item.id, item);
    for (const item of parsed.billingSessions || []) insertRow('billingSessions', item.id, item);
    for (const item of parsed.billingSessionSteps || []) insertRow('billingSessionSteps', item.id, item);
    for (const item of parsed.pointLedger || []) insertRow('pointLedger', item.id, item);
    for (const item of parsed.userSkills || []) insertRow('userSkills', item.id, item);
  });
  transaction();
}

export async function initDatabase(): Promise<void> {
  if (db) return;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');

  const database = ensureDb();
  const tables = ['users', 'projects', 'projectFiles', 'billingSessions', 'billingSessionSteps', 'pointLedger', 'userSkills', 'meta'];
  for (const table of tables) {
    database.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT, updated_at TEXT)`);
  }
  const metaExists = database.prepare("SELECT 1 FROM meta WHERE id = 'projectFiles.nextId'").get();
  if (!metaExists) {
    const nextId = Number(database.prepare('SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS nextId FROM projectFiles').get()?.nextId || 1);
    database.prepare("INSERT INTO meta (id, data, created_at, updated_at) VALUES ('projectFiles.nextId', ?, ?, ?)").run(JSON.stringify({ value: nextId }), new Date().toISOString(), new Date().toISOString());
  }

  migrateJsonIfNeeded();
  seedDefaultUsers();
  console.log('✅ 默认账号已初始化: admin, test1, test2, test3 (密码均为 admin123)');
}

export async function saveDatabase(): Promise<void> {
}

export function queryAll(collection: DatabaseCollection): any[] {
  const database = ensureDb();
  const rows = database.prepare(`SELECT data FROM ${collectionToTable(collection)}`).all() as any[];
  return rows.map((row) => parseRow<any>(row));
}

export function queryOne(collection: DatabaseCollection, predicate: (item: any) => boolean): any | undefined {
  return queryAll(collection).find(predicate);
}

export async function insert(collection: 'users', item: Omit<User, 'id' | 'createdAt'> & { id?: string }): Promise<User>;
export async function insert(collection: 'projects', item: Omit<Project, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Project>;
export async function insert(collection: 'projectFiles', item: Omit<ProjectFile, 'id' | 'createdAt'>): Promise<ProjectFile>;
export async function insert(collection: 'billingSessions', item: Omit<BillingSession, 'id'> & { id?: string }): Promise<BillingSession>;
export async function insert(collection: 'billingSessionSteps', item: Omit<BillingSessionStep, 'id'> & { id?: string }): Promise<BillingSessionStep>;
export async function insert(collection: 'pointLedger', item: Omit<PointLedgerEntry, 'id'> & { id?: string }): Promise<PointLedgerEntry>;
export async function insert(collection: 'userSkills', item: Omit<UserSkill, 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }): Promise<UserSkill>;
export async function insert(collection: DatabaseCollection, item: any): Promise<any>;
export async function insert(collection: DatabaseCollection, item: any): Promise<any> {
  const database = ensureDb();
  const now = new Date().toISOString();

  if (collection === 'users') {
    const newItem: User = { ...item, id: item.id || uuidv4(), createdAt: now };
    database.prepare('INSERT INTO users (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newItem.id, JSON.stringify(newItem), newItem.createdAt, now);
    return newItem;
  }

  if (collection === 'projects') {
    const newItem: Project = { ...item, id: item.id || makeInsertId('projects'), createdAt: now, updatedAt: now };
    database.prepare('INSERT INTO projects (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newItem.id, JSON.stringify(newItem), newItem.createdAt, newItem.updatedAt);
    return newItem;
  }

  if (collection === 'projectFiles') {
    const metaRow = database.prepare("SELECT data FROM meta WHERE id = 'projectFiles.nextId'").get() as any;
    const nextId = Number((metaRow ? parseRow<any>(metaRow).value : 1) || 1);
    const newItem: ProjectFile = { ...item, id: nextId, createdAt: now };
    database.prepare('INSERT INTO projectFiles (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)').run(String(newItem.id), JSON.stringify(newItem), newItem.createdAt, now);
    database.prepare("UPDATE meta SET data = ?, updated_at = ? WHERE id = 'projectFiles.nextId'").run(JSON.stringify({ value: nextId + 1 }), now);
    return newItem;
  }

  if (collection === 'billingSessions') {
    const newItem: BillingSession = { ...item, id: item.id || makeInsertId('billingSessions') };
    database.prepare('INSERT INTO billingSessions (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newItem.id, JSON.stringify(newItem), newItem.startedAt || now, now);
    return newItem;
  }

  if (collection === 'billingSessionSteps') {
    const newItem: BillingSessionStep = { ...item, id: item.id || makeInsertId('billingSessionSteps') };
    database.prepare('INSERT INTO billingSessionSteps (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newItem.id, JSON.stringify(newItem), newItem.createdAt || now, now);
    return newItem;
  }

  if (collection === 'pointLedger') {
    const newItem: PointLedgerEntry = { ...item, id: item.id || makeInsertId('pointLedger') };
    database.prepare('INSERT INTO pointLedger (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newItem.id, JSON.stringify(newItem), newItem.createdAt || now, now);
    return newItem;
  }

  if (collection === 'userSkills') {
    const newItem: UserSkill = {
      ...item,
      id: item.id || uuidv4(),
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
    };
    database.prepare('INSERT INTO userSkills (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)').run(newItem.id, JSON.stringify(newItem), newItem.createdAt, newItem.updatedAt);
    return newItem;
  }

  throw new Error(`Unknown collection: ${collection}`);
}

export async function update(collection: CollectionName, predicate: (item: any) => boolean, updates: Partial<any>): Promise<boolean> {
  const database = ensureDb();
  const rows = database.prepare(`SELECT id, data FROM ${collectionToTable(collection)}`).all() as any[];
  const row = rows.find((item) => predicate(parseRow(item)));
  if (!row) return false;

  const current = parseRow<any>(row);
  const next = { ...current, ...updates };
  if (collection === 'projects') {
    next.updatedAt = new Date().toISOString();
  }

  database.prepare(`UPDATE ${collectionToTable(collection)} SET data = ?, updated_at = ? WHERE id = ?`).run(JSON.stringify(next), new Date().toISOString(), row.id);
  return true;
}

export async function remove(collection: CollectionName, predicate: (item: any) => boolean): Promise<number> {
  const database = ensureDb();
  const rows = database.prepare(`SELECT id, data FROM ${collectionToTable(collection)}`).all() as any[];
  const targets = rows.filter((item) => predicate(parseRow(item)));
  if (!targets.length) return 0;

  const stmt = database.prepare(`DELETE FROM ${collectionToTable(collection)} WHERE id = ?`);
  const transaction = database.transaction((ids: string[]) => {
    for (const id of ids) stmt.run(id);
  });
  transaction(targets.map((item) => String(item.id)));
  return targets.length;
}

export function closeDatabase() {
  db?.close();
  db = null;
}
