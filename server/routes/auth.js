/** Signup, login and the logged-in user's profile. */
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { auth, sign, pub } = require("../helpers");

const router = express.Router();

router.post("/signup", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res
      .status(400)
      .json({ error: "Enter your name, email and a password of at least 6 characters" });
  const e = email.trim().toLowerCase();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(e))
    return res.status(409).json({ error: "That email is already registered" });
  const id = db
    .prepare("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)")
    .run(name.trim(), e, bcrypt.hashSync(password, 10)).lastInsertRowid;
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.json({ token: sign(u), user: pub(u) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare("SELECT * FROM users WHERE email = ?").get(
    String(email || "")
      .trim()
      .toLowerCase(),
  );
  if (!u || !bcrypt.compareSync(String(password || ""), u.password_hash))
    return res.status(401).json({ error: "Wrong email or password" });
  res.json({ token: sign(u), user: pub(u) });
});

router.get("/me", auth, (req, res) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!u) return res.status(401).json({ error: "Please log in again" });
  res.json(pub(u));
});

router.put("/me", auth, (req, res) => {
  db.prepare("UPDATE users SET bio = ? WHERE id = ?").run(
    String(req.body.bio || "").slice(0, 200),
    req.userId,
  );
  res.json({ ok: true });
});

module.exports = router;
