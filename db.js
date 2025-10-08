import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

function seed() {
  if (!fs.existsSync(DB_PATH)) {
    const seedData = { users: {}, orders: {}, history: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(seedData, null, 2));
  }
}
seed();

export function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getUser(sessionId) {
  const db = readDB();
  if (!db.users[sessionId]) {
    db.users[sessionId] = { createdAt: Date.now(), currentOrder: [], stage: 'idle' };
    writeDB(db);
  }
  return db.users[sessionId];
}

export function setUser(sessionId, userObj) {
  const db = readDB();
  db.users[sessionId] = userObj;
  writeDB(db);
}

export function pushHistory(sessionId, orderObj) {
  const db = readDB();
  if (!db.history[sessionId]) db.history[sessionId] = [];
  db.history[sessionId].push(orderObj);
  writeDB(db);
}

export function getHistory(sessionId) {
  const db = readDB();
  return db.history[sessionId] || [];
}
