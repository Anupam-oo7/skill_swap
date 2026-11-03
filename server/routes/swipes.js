/** Swipes: like or pass on a person. When two people like each other it becomes a match. */
const express = require("express");
const db = require("../db");
const { auth } = require("../helpers");

const router = express.Router();

// For demos: the seeded @demo.com students always like you back, so you can see the match screen.
// Set to false when real students are using the app.
const DEMO_AUTO_LIKE_BACK = true;

const skillsOf = (userId, type) =>
  db
    .prepare("SELECT skill FROM user_skills WHERE user_id = ? AND type = ?")
    .all(userId, type)
    .map((r) => r.skill);

router.post("/swipes", auth, (req, res) => {
  const { target_id, direction } = req.body;
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(target_id);
  if (!target || target.id === req.userId || !["like", "pass"].includes(direction))
    return res.status(400).json({ error: "Invalid swipe" });

  db.prepare("INSERT OR REPLACE INTO swipes (swiper_id, target_id, direction) VALUES (?,?,?)").run(
    req.userId,
    target.id,
    direction,
  );
  if (direction === "pass") return res.json({ matched: false });

  const likedBack =
    db
      .prepare("SELECT 1 FROM swipes WHERE swiper_id = ? AND target_id = ? AND direction = 'like'")
      .get(target.id, req.userId) ||
    (DEMO_AUTO_LIKE_BACK && target.email.endsWith("@demo.com"));
  if (!likedBack) return res.json({ matched: false });

  // A match is stored as an accepted swap request (sender = them, receiver = me)
  const existing = db
    .prepare(
      `SELECT id FROM swap_requests WHERE status IN ('accepted','completed')
       AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`,
    )
    .get(req.userId, target.id, target.id, req.userId);
  if (existing) return res.json({ matched: true, requestId: existing.id });

  const theyTeachMe =
    skillsOf(target.id, "offer").filter((s) => skillsOf(req.userId, "want").includes(s))[0] || "";
  const iTeachThem =
    skillsOf(target.id, "want").filter((s) => skillsOf(req.userId, "offer").includes(s))[0] || "";
  const requestId = db
    .prepare(
      "INSERT INTO swap_requests (sender_id, receiver_id, offered_skill, wanted_skill, status) VALUES (?,?,?,?, 'accepted')",
    )
    .run(target.id, req.userId, theyTeachMe, iTeachThem).lastInsertRowid;
  res.json({ matched: true, requestId });
});

module.exports = router;
