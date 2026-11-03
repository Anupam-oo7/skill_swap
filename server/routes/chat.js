/** Real-time chat (Socket.io). A chat opens once a swap request is accepted. */
const jwt = require("jsonwebtoken");
const db = require("../db");
const { SECRET, auth } = require("../helpers");

module.exports = function setupChat(app, io) {
  function chatAccess(userId, requestId) {
    const r = db.prepare("SELECT * FROM swap_requests WHERE id = ?").get(requestId);
    if (!r || !["accepted", "completed"].includes(r.status)) return null;
    return r.sender_id === userId || r.receiver_id === userId ? r : null;
  }
  const MSG_SQL =
    "SELECT m.id, m.sender_id, m.content, m.created_at, u.name AS sender_name FROM messages m JOIN users u ON u.id = m.sender_id";

  app.get("/api/requests/:id/messages", auth, (req, res) => {
    if (!chatAccess(req.userId, req.params.id))
      return res.status(403).json({ error: "Chat opens once a swap is accepted" });
    res.json(db.prepare(MSG_SQL + " WHERE m.request_id = ? ORDER BY m.id").all(req.params.id));
  });

  io.use((socket, next) => {
    try {
      socket.userId = jwt.verify(socket.handshake.auth.token, SECRET).id;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join", (requestId) => {
      if (chatAccess(socket.userId, requestId)) socket.join("req:" + requestId);
    });
    socket.on("message", ({ requestId, content }) => {
      const text = String(content || "")
        .trim()
        .slice(0, 500);
      if (!text || !chatAccess(socket.userId, requestId)) return;
      const id = db
        .prepare("INSERT INTO messages (request_id,sender_id,content) VALUES (?,?,?)")
        .run(requestId, socket.userId, text).lastInsertRowid;
      io.to("req:" + requestId).emit("message", {
        requestId,
        ...db.prepare(MSG_SQL + " WHERE m.id = ?").get(id),
      });
    });
  });
};
