/** Skills a user can teach (offer) or wants to learn (want). */
const express = require("express");
const db = require("../db");
const { auth, clean } = require("../helpers");

const router = express.Router();

router.get("/skills", auth, (req, res) => {
  res.json(
    db
      .prepare("SELECT id, skill, type FROM user_skills WHERE user_id = ? ORDER BY id")
      .all(req.userId),
  );
});

router.post("/skills", auth, (req, res) => {
  const skill = clean(req.body.skill);
  const type = req.body.type;
  if (!skill || !["offer", "want"].includes(type))
    return res.status(400).json({ error: "Enter a skill name" });
  db.prepare("INSERT OR IGNORE INTO user_skills (user_id,skill,type) VALUES (?,?,?)").run(
    req.userId,
    skill,
    type,
  );
  res.json({ ok: true });
});

router.delete("/skills/:id", auth, (req, res) => {
  db.prepare("DELETE FROM user_skills WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;
