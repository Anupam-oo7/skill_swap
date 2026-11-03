/** Match suggestions: who can teach me, and who wants what I offer. */
const express = require("express");
const db = require("../db");
const { auth } = require("../helpers");

const router = express.Router();

// Score = skills they can teach me + skills they want that I offer, with a bonus for two-way swaps
router.get("/matches", auth, (req, res) => {
  const by = {};
  for (const r of db.prepare("SELECT user_id, skill, type FROM user_skills").all()) {
    by[r.user_id] = by[r.user_id] || { offer: [], want: [] };
    by[r.user_id][r.type].push(r.skill);
  }
  const me = by[req.userId] || { offer: [], want: [] };
  const rt = {};
  for (const r of db
    .prepare(
      "SELECT reviewee_id AS id, AVG(rating) AS avg, COUNT(*) AS count FROM reviews GROUP BY reviewee_id",
    )
    .all())
    rt[r.id] = r;
  const matches = db
    .prepare(
      "SELECT id, name, bio FROM users WHERE id != ? AND id NOT IN (SELECT target_id FROM swipes WHERE swiper_id = ?)",
    )
    .all(req.userId, req.userId)
    .map((u) => {
      const s = by[u.id] || { offer: [], want: [] };
      const theyTeach = s.offer.filter((x) => me.want.includes(x));
      const theyLearn = s.want.filter((x) => me.offer.includes(x));
      const mutual = theyTeach.length > 0 && theyLearn.length > 0;
      const score = theyTeach.length + theyLearn.length + (mutual ? 3 : 0);
      return {
        ...u,
        offers: s.offer,
        wants: s.want,
        theyTeach,
        theyLearn,
        mutual,
        score,
        rating: rt[u.id]?.avg || 0,
        reviews: rt[u.id]?.count || 0,
      };
    })

    .sort((a, b) => b.score - a.score || b.rating - a.rating);
  res.json(matches);
});

module.exports = router;
