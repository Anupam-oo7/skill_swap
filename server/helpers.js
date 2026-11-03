/** Small helpers shared by the route files: tokens, login check, text cleanup. */
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/** Create a login token that lasts 7 days. */
const sign = (user) => jwt.sign({ id: user.id }, SECRET, { expiresIn: "7d" });

/** The user fields that are safe to send to the browser (no password hash). */
const pub = (user) => ({ id: user.id, name: user.name, email: user.email, bio: user.bio });

/** Lowercase and trim a skill name so "Python " and "python" are the same skill. */
const clean = (text) =>
  String(text || "")
    .trim()
    .toLowerCase()
    .slice(0, 40);

/** Express middleware: only lets logged-in users through and sets req.userId. */
function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    req.userId = jwt.verify(token, SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: "Please log in again" });
  }
}

module.exports = { SECRET, sign, pub, clean, auth };
