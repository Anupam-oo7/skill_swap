const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
let socket = null,
  chatId = null,
  reqNames = {};
const initials = (name) =>
  String(name)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
let token = localStorage.getItem("token"),
  me = null,
  tab = "matches",
  mode = "login";

async function api(path, method = "GET", body) {
  const r = await fetch("/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

function logout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  localStorage.removeItem("token");
  token = null;
  me = null;
  init();
}

function showAuth() {
  $("#who").innerHTML = "";
  $("#app").innerHTML = `
    <div class="card auth">
      <h3>${mode === "login" ? "Log in" : "Create your account"}</h3>
      <p class="muted">${mode === "login" ? "Welcome back. Pick up your swaps." : "Offer a skill, ask for one, get matched."}</p>
      ${mode === "signup" ? '<input id="name" placeholder="Full name">' : ""}
      <input id="email" type="email" placeholder="Email">
      <input id="password" type="password" placeholder="Password (6+ characters)">
      <div class="err" id="err"></div>
      <div class="row">
        <button onclick="submitAuth()">${mode === "login" ? "Log in" : "Sign up"}</button>
        <button class="ghost" onclick="mode='${mode === "login" ? "signup" : "login"}';showAuth()">${mode === "login" ? "New here? Sign up" : "Have an account? Log in"}</button>
      </div>
    </div>`;
}

async function submitAuth() {
  try {
    const body = { email: $("#email").value, password: $("#password").value };
    if (mode === "signup") body.name = $("#name").value;
    const d = await api("/" + mode, "POST", body);
    token = d.token;
    localStorage.setItem("token", token);
    me = d.user;
    tab = "skills";
    showApp();
  } catch (e) {
    $("#err").textContent = e.message;
  }
}

function showApp() {
  chatId = null;
  $("#who").innerHTML = `${esc(me.name)} <button onclick="logout()">Log out</button>`;
  const tabs = [
    ["matches", "Discover"],
    ["skills", "Profile"],
    ["requests", "Matches"],
  ];
  $("#app").innerHTML =
    `<nav>${tabs.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" onclick="tab='${k}';showApp()">${l}</button>`).join("")}</nav><div id="view"></div>`;
  ({ matches: loadMatches, skills: loadSkills, requests: loadRequests })[tab]();
}

let deck = [];
let swiping = false;

/** Discover tab: load everyone I haven't swiped on yet, best matches first. */
async function loadMatches() {
  deck = await api("/matches");
  renderDeck();
}

function chips(skills, highlight, cls) {
  return (
    skills
      .map(
        (s) => `<span class="chip ${cls} ${highlight.includes(s) ? "hit" : ""}">${esc(s)}</span>`,
      )
      .join("") || '<span class="muted">Nothing listed</span>'
  );
}

function renderDeck() {
  swiping = false;
  if (!deck.length) {
    $("#view").innerHTML =
      `<div class="card empty">You're all caught up. Add more skills in <b>Profile</b>, or check back when new students join.</div>`;
    return;
  }
  const m = deck[0];
  $("#view").innerHTML = `
    <div class="deck">
      <div class="stack">
        ${deck[1] ? '<div class="swipe-card behind"></div>' : ""}
        <div class="swipe-card" id="topCard">
          <span class="stamp like">Swap</span><span class="stamp nope">Pass</span>
          <span class="avatar big">${initials(m.name)}</span>
          <h2>${esc(m.name)}</h2>
          <p class="muted">${esc(m.bio || "No bio yet")}</p>
          ${m.reviews ? `<p>★ ${m.rating.toFixed(1)} from ${m.reviews} review${m.reviews > 1 ? "s" : ""}</p>` : ""}
          ${m.mutual ? '<span class="badge">Two-way swap</span>' : ""}
          <div class="skill-label">Can teach</div><div>${chips(m.offers, m.theyTeach, "")}</div>
          <div class="skill-label">Wants to learn</div><div>${chips(m.wants, m.theyLearn, "want")}</div>
        </div>
      </div>
      <div class="deck-actions">
        <button class="round pass" aria-label="Pass" onclick="swipe('pass')">✕</button>
        <button class="round like" aria-label="Swap skills" onclick="swipe('like')">♥</button>
      </div>
      <p class="muted" style="text-align:center">Drag the card or use the buttons. Highlighted skills match yours.</p>
    </div>`;
  attachDrag($("#topCard"));
}

/** Drag the top card left (pass) or right (swap). */
function attachDrag(card) {
  let startX = null;
  card.onpointerdown = (e) => {
    startX = e.clientX;
    card.setPointerCapture(e.pointerId);
    card.style.transition = "none";
  };
  card.onpointermove = (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    card.classList.toggle("liking", dx > 40);
    card.classList.toggle("passing", dx < -40);
  };
  card.onpointerup = (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 110) return swipe(dx > 0 ? "like" : "pass");
    card.style.transition = "";
    card.style.transform = "";
    card.classList.remove("liking", "passing");
  };
}

async function swipe(direction) {
  if (swiping || !deck.length) return;
  swiping = true;
  const m = deck[0],
    card = $("#topCard"),
    sign = direction === "like" ? 1 : -1;
  card.style.transition = "transform .3s";
  card.style.transform = `translateX(${sign * 600}px) rotate(${sign * 25}deg)`;
  try {
    const res = await api("/swipes", "POST", { target_id: m.id, direction });
    deck.shift();
    if (res.matched) showMatch(m, res.requestId);
    else setTimeout(renderDeck, 250);
  } catch (e) {
    alert(e.message);
    renderDeck();
  }
}

/** The "It's a match!" screen. */
function showMatch(m, requestId) {
  reqNames[requestId] = m.name;
  $("#view").innerHTML = `
    <div class="card its-a-match">
      <h2>It's a match!</h2>
      <p>You and ${esc(m.name)} can swap skills.</p>
      <div class="pair"><span class="avatar big">${initials(me.name)}</span><span class="avatar big amber">${initials(m.name)}</span></div>
      <div class="row" style="justify-content:center">
        <button onclick="openChat(${requestId})">Send a message</button>
        <button class="ghost" onclick="renderDeck()">Keep swiping</button>
      </div>
    </div>`;
}

async function loadSkills() {
  const [mine, user, rep] = await Promise.all([api("/skills"), api("/me"), api("/reviews/mine")]);
  const group = (type) =>
    mine
      .filter((s) => s.type === type)
      .map(
        (s) =>
          `<span class="chip ${type}">${esc(s.skill)}<button aria-label="Remove ${esc(s.skill)}" onclick="removeSkill(${s.id})">×</button></span>`,
      )
      .join("") || '<span class="muted">Nothing added yet</span>';
  $("#view").innerHTML = `
    <div class="card"><h3>Your reputation</h3>${
      rep.count
        ? `<div>${stars(rep.avg)} ${rep.avg.toFixed(1)} from ${rep.count} review${rep.count > 1 ? "s" : ""}</div>` +
          rep.reviews
            .map(
              (x) =>
                `<p class="muted">${stars(x.rating)} ${esc(x.reviewer_name)}${x.comment ? ': "' + esc(x.comment) + '"' : ""}</p>`,
            )
            .join("")
        : '<span class="muted">No reviews yet. Finish a swap to get your first one.</span>'
    }</div>
    <div class="card"><h3>About you</h3>
      <div class="row"><input id="bio" value="${esc(user.bio)}" placeholder="One line about you"><button onclick="saveBio()">Save</button></div></div>
    <div class="card"><h3>Skills I can teach</h3><div>${group("offer")}</div>
      <div class="row" style="margin-top:10px"><input id="offer" placeholder="e.g. guitar"><button onclick="addSkill('offer')">Add</button></div></div>
    <div class="card"><h3>Skills I want to learn</h3><div>${group("want")}</div>
      <div class="row" style="margin-top:10px"><input id="want" placeholder="e.g. python"><button onclick="addSkill('want')">Add</button></div></div>`;
}
async function addSkill(type) {
  try {
    await api("/skills", "POST", { skill: $("#" + type).value, type });
    loadSkills();
  } catch (e) {
    alert(e.message);
  }
}
async function removeSkill(id) {
  await api("/skills/" + id, "DELETE");
  loadSkills();
}
async function saveBio() {
  await api("/me", "PUT", { bio: $("#bio").value });
  loadSkills();
}

/** Matches tab: everyone I've matched with, with chat, "mark as done" and reviews. */
async function loadRequests() {
  const { me: myId, requests } = await api("/requests");
  const matches = requests.filter((r) => r.status === "accepted" || r.status === "completed");
  reqNames = Object.fromEntries(
    matches.map((r) => [r.id, r.sender_id === myId ? r.receiver_name : r.sender_name]),
  );
  $("#view").innerHTML = matches.length
    ? matches
        .map((r) => {
          const other = reqNames[r.id],
            iAmSender = r.sender_id === myId;
          const iTeach = iAmSender ? r.offered_skill : r.wanted_skill;
          const theyTeach = iAmSender ? r.wanted_skill : r.offered_skill;
          const done = r.status === "completed";
          return `<div class="card">
          <div class="person"><span class="avatar">${initials(other)}</span><h3>${esc(other)}</h3>
            <span class="status ${r.status}">${done ? "swap done" : "matched"}</span></div>
          <div class="muted">You teach: ${esc(iTeach || "anything")}. They teach: ${esc(theyTeach || "anything")}.</div>
          <div class="row" style="margin-top:10px">
            <button onclick="openChat(${r.id})">Message</button>
            ${done ? (r.reviewed ? '<span class="muted">You reviewed this swap</span>' : "") : `<button class="ghost" onclick="setStatus(${r.id},'completed')">Mark swap as done</button>`}
          </div>
          ${done && !r.reviewed ? reviewForm(r.id) : ""}
        </div>`;
        })
        .join("")
    : `<div class="card empty">No matches yet. Swipe right on people in <b>Discover</b>. When they swipe right on you too, it's a match.</div>`;
}

const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
function reviewForm(id) {
  return `<div class="row" style="margin-top:10px">
    <select id="rate${id}" aria-label="Rating"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Okay</option><option value="2">2 - Poor</option><option value="1">1 - Bad</option></select>
    <input id="cmt${id}" placeholder="How was the session?">
    <button onclick="submitReview(${id})">Submit review</button></div>`;
}
async function submitReview(id) {
  try {
    await api("/reviews", "POST", {
      request_id: id,
      rating: $("#rate" + id).value,
      comment: $("#cmt" + id).value,
    });
    loadRequests();
  } catch (e) {
    alert(e.message);
  }
}
function connectSocket() {
  if (socket) return;
  socket = io({ auth: { token } });
  socket.on("connect", () => {
    if (chatId) socket.emit("join", chatId);
  });
  socket.on("message", (m) => {
    if (m.requestId == chatId) addMsg(m);
  });
}
async function openChat(id) {
  try {
    const msgs = await api("/requests/" + id + "/messages");
    chatId = id;
    connectSocket();
    socket.emit("join", id);
    $("#view").innerHTML = `<div class="card">
      <div class="person"><button class="ghost" onclick="tab='requests';showApp()">Back</button><span class="avatar">${initials(reqNames[id])}</span><h3>Chat with ${esc(reqNames[id])}</h3></div>
      <div id="chat" class="chat" aria-live="polite"></div>
      <div class="row"><input id="chatMsg" placeholder="Type a message" onkeydown="if(event.key==='Enter')sendMsg()"><button onclick="sendMsg()">Send</button></div></div>`;
    msgs.forEach(addMsg);
    $("#chatMsg").focus();
  } catch (e) {
    alert(e.message);
  }
}
function addMsg(m) {
  const box = $("#chat");
  if (!box) return;
  const mine = m.sender_id === me.id;
  const time = new Date(m.created_at.replace(" ", "T") + "Z").toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  box.insertAdjacentHTML(
    "beforeend",
    `<div class="msg ${mine ? "mine" : ""}"><div>${esc(m.content)}</div><small>${mine ? "You" : esc(m.sender_name)}, ${time}</small></div>`,
  );
  box.scrollTop = box.scrollHeight;
}
function sendMsg() {
  const i = $("#chatMsg"),
    v = i.value.trim();
  if (!v) return;
  socket.emit("message", { requestId: chatId, content: v });
  i.value = "";
}
async function setStatus(id, status) {
  try {
    await api("/requests/" + id, "PATCH", { status });
    loadRequests();
  } catch (e) {
    alert(e.message);
  }
}

async function init() {
  if (!token) return showAuth();
  try {
    me = await api("/me");
    showApp();
  } catch {
    logout();
  }
}
init();
