/** Swap requests: send, accept, decline and mark as done. */
const express = require("express");
const db = require("../db");
const { auth, clean } = require("../helpers");

const router = express.Router();

router.post("/requests", auth, (req, res) => {
  const { receiver_id, offered_skill, wanted_skill, message } = req.body;
  if (
    !db.prepare("SELECT 1 FROM users WHERE id = ?").get(receiver_id) ||
    receiver_id === req.userId
  )
    return res.status(400).json({ error: "Invalid user" });
  db.prepare(
    "INSERT INTO swap_requests (sender_id,receiver_id,offered_skill,wanted_skill,message) VALUES (?,?,?,?,?)",
  ).run(
    req.userId,
    receiver_id,
    clean(offered_skill),
    clean(wanted_skill),
    String(message || "").slice(0, 300),
  );
  res.json({ ok: true });
});

router.get("/requests", auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, s.name AS sender_name, v.name AS receiver_name,
              (SELECT COUNT(*) FROM reviews rv WHERE rv.request_id = r.id AND rv.reviewer_id = ?) AS reviewed
       FROM swap_requests r
       JOIN users s ON s.id = r.sender_id
       JOIN users v ON v.id = r.receiver_id
       WHERE r.sender_id = ? OR r.receiver_id = ?
       ORDER BY r.id DESC`,
    )
    .all(req.userId, req.userId, req.userId);
  res.json({ me: req.userId, requests: rows });
});

router.patch("/requests/:id", auth, (req, res) => {
  const r = db.prepare("SELECT * FROM swap_requests WHERE id = ?").get(req.params.id);
  const st = req.body.status;
  if (!r) return res.status(404).json({ error: "Request not found" });
  const isReceiver = r.receiver_id === req.userId;
  const isParty = isReceiver || r.sender_id === req.userId;
  const allowed =
    (isReceiver && r.status === "pending" && ["accepted", "rejected"].includes(st)) ||
    (isParty && r.status === "accepted" && st === "completed");
  if (!allowed) return res.status(403).json({ error: "You can't make that change" });
  db.prepare("UPDATE swap_requests SET status = ? WHERE id = ?").run(st, r.id);
  res.json({ ok: true });
});

module.exports = router;
