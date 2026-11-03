/**
 * Skill Swap server entry point.
 * Sets up Express + Socket.io, then plugs in the route files.
 */
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// API routes (every URL starts with /api)
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/skills"));
app.use("/api", require("./routes/matches"));
app.use("/api", require("./routes/swipes"));
app.use("/api", require("./routes/requests"));
app.use("/api", require("./routes/reviews"));
require("./routes/chat")(app, io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Skill Swap running at http://localhost:${PORT}`));
