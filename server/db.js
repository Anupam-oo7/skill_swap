const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const db = new Database(process.env.DATABASE_PATH || path.join(__dirname, "..", "skillswap.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offer','want')),
  UNIQUE (user_id, skill, type)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES swap_requests(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS swipes (
  swiper_id INTEGER NOT NULL REFERENCES users(id),
  target_id INTEGER NOT NULL REFERENCES users(id),
  direction TEXT NOT NULL CHECK (direction IN ('like','pass')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (swiper_id, target_id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES swap_requests(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewee_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (request_id, reviewer_id)
);
CREATE TABLE IF NOT EXISTS swap_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  offered_skill TEXT DEFAULT '',
  wanted_skill TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Demo data on first run so matches show up straight away
if (db.prepare("SELECT COUNT(*) AS c FROM users").get().c === 0) {
  const hash = bcrypt.hashSync("demo123", 10);
  const addUser = db.prepare("INSERT INTO users (name,email,password_hash,bio) VALUES (?,?,?,?)");
  const addSkill = db.prepare("INSERT INTO user_skills (user_id,skill,type) VALUES (?,?,?)");
  const demo = [
    [
      "Asha Rao",
      "asha@demo.com",
      "Final-year CSE, plays in the college band",
      ["guitar", "singing"],
      ["python", "react"],
    ],
    [
      "Rohan Shetty",
      "rohan@demo.com",
      "Web developer who wants to learn photography",
      ["python", "react"],
      ["photography", "guitar"],
    ],
    [
      "Meera Nayak",
      "meera@demo.com",
      "Design student with a camera habit",
      ["photography", "figma"],
      ["python", "excel"],
    ],
    [
      "Kiran Pai",
      "kiran@demo.com",
      "Commerce student, spreadsheet wizard",
      ["excel", "public speaking"],
      ["figma", "guitar"],
    ],
  ];
  for (const [name, email, bio, offers, wants] of demo) {
    const id = addUser.run(name, email, hash, bio).lastInsertRowid;
    offers.forEach((s) => addSkill.run(id, s, "offer"));
    wants.forEach((s) => addSkill.run(id, s, "want"));
  }
}

module.exports = db;
