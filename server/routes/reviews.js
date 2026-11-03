/** Ratings and reviews after a completed swap. */
const express = require("express");
const db = require("../db");
const { auth } = require("../helpers");

const router = express.Router();

router.post("/reviews", auth, (req, res) => {
  const { request_id, rating, comment } = req.body;
  const r = db.prepare("SELECT * FROM swap_requests WHERE id = ?").get(request_id);
  const n = Number(rating);
  if (!r || r.status !== "completed" || ![r.sender_id, r.receiver_id].includes(req.userId))
    return res.status(403).json({ error: "You can only review swaps you have completed" });
  if (!Number.isInteger(n) || n < 1 || n > 5)
    return res.status(400).json({ error: "Choose a rating from 1 to 5" });
  const other = r.sender_id === req.userId ? r.receiver_id : r.sender_id;
  try {
    db.prepare(
      "INSERT INTO reviews (request_id,reviewer_id,reviewee_id,rating,comment) VALUES (?,?,?,?,?)",
    ).run(r.id, req.userId, other, n, String(comment || "").slice(0, 300));
  } catch {
    return res.status(409).json({ error: "You already reviewed this swap" });
  }
  res.json({ ok: true });
});

router.get("/reviews/mine", auth, (req, res) => {
  const reviews = db
    .prepare(
      "SELECT v.rating, v.comment, u.name AS reviewer_name FROM reviews v JOIN users u ON u.id = v.reviewer_id WHERE v.reviewee_id = ? ORDER BY v.id DESC",
    )
    .all(req.userId);
  const avg = reviews.length ? reviews.reduce((a, x) => a + x.rating, 0) / reviews.length : 0;
  res.json({ avg, count: reviews.length, reviews });
});

module.exports = router;
