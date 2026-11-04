/**
 * Demo students (password for all: demo123). Runs on every start-up and only adds
 * students that are missing, so your own accounts and data are never touched.
 */
const bcrypt = require("bcryptjs");

// [name, bio, skills they teach, skills they want to learn]
const STUDENTS = [
  [
    "Asha Rao",
    "CSE, final year. Plays in the college band.",
    ["guitar", "singing"],
    ["python", "react"],
  ],
  [
    "Rohan Shetty",
    "ISE, 3rd year. Web developer, wants to try photography.",
    ["python", "react"],
    ["photography", "guitar"],
  ],
  [
    "Meera Nayak",
    "Design student with a camera habit.",
    ["photography", "figma"],
    ["python", "excel"],
  ],
  [
    "Kiran Pai",
    "B.Com, 2nd year. Spreadsheet wizard.",
    ["excel", "public speaking"],
    ["figma", "guitar"],
  ],
  [
    "Ananya Hegde",
    "Design, 2nd year. Loves clean interfaces.",
    ["ui design", "figma"],
    ["react", "python"],
  ],
  [
    "Vikram Bhat",
    "CSE, 4th year. College chess champion.",
    ["chess", "java"],
    ["guitar", "public speaking"],
  ],
  [
    "Sneha Kamath",
    "Food tech, 3rd year. Cooks for the whole hostel.",
    ["cooking", "drawing"],
    ["photography", "excel"],
  ],
  [
    "Arjun Kulal",
    "Mech, 2nd year. Football captain, edits match reels.",
    ["football", "video editing"],
    ["python", "figma"],
  ],
  [
    "Pooja Shenoy",
    "English honours. Writes for the college magazine.",
    ["kannada", "content writing"],
    ["react", "singing"],
  ],
  [
    "Nikhil Acharya",
    "AI and ML, 3rd year. Kaggle addict.",
    ["machine learning", "python"],
    ["guitar", "photography"],
  ],
  [
    "Divya Poojary",
    "BBA, 1st year. Dance team member.",
    ["dance", "yoga"],
    ["excel", "public speaking"],
  ],
  [
    "Sanjay Naik",
    "MCA, 1st year. Loves databases.",
    ["sql", "data structures"],
    ["video editing", "chess"],
  ],
  [
    "Riya Dsouza",
    "Psychology, 2nd year. Sings at every fest.",
    ["spanish", "singing"],
    ["python", "drawing"],
  ],
  [
    "Aditya Prabhu",
    "ECE, 3rd year. Makes lo-fi beats.",
    ["piano", "music production"],
    ["react", "sql"],
  ],
  [
    "Fatima Khan",
    "MBA, 1st year. Debate club president.",
    ["public speaking", "resume writing"],
    ["figma", "video editing"],
  ],
  [
    "Manoj Gowda",
    "Civil, 4th year. Tulu and Kannada tutor.",
    ["tulu", "cooking"],
    ["python", "guitar"],
  ],
  [
    "Tanvi Kini",
    "Mass comm, 2nd year. Shoots and edits short films.",
    ["photography", "video editing"],
    ["java", "excel"],
  ],
  [
    "Rahul Salian",
    "CSE, 2nd year. Hackathon regular.",
    ["react", "javascript"],
    ["piano", "photography"],
  ],
  [
    "Shreya Bangera",
    "Physio, 3rd year. State-level badminton player.",
    ["badminton", "swimming"],
    ["python", "ui design"],
  ],
  [
    "Karthik Hebbar",
    "B.Com, 3rd year. Follows the stock market.",
    ["excel", "finance basics"],
    ["guitar", "react"],
  ],
  [
    "Isha Mallya",
    "Architecture, 2nd year. Always sketching.",
    ["drawing", "figma"],
    ["machine learning", "spanish"],
  ],
  [
    "Pranav Joshi",
    "ECE, 2nd year. Plays guitar and chess.",
    ["guitar", "chess"],
    ["sql", "public speaking"],
  ],
  [
    "Lakshmi Iyer",
    "CSE, 3rd year. Competitive programmer.",
    ["python", "data structures"],
    ["dance", "cooking"],
  ],
  [
    "Abhishek Karkera",
    "Marine eng., 2nd year. Swimmer and yoga fan.",
    ["swimming", "yoga"],
    ["java", "photography"],
  ],
];

const COMMENTS = [
  "Patient and clear, I learned a lot.",
  "Fun session, would swap again!",
  "Well prepared and friendly.",
  "Great teacher, explained everything simply.",
];
const RATINGS = [5, 4, 5, 5, 4, 3];

module.exports = function seedDemoData(db) {
  const hash = bcrypt.hashSync("demo123", 10);
  const exists = db.prepare("SELECT 1 FROM users WHERE email = ?");
  const addUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, bio) VALUES (?,?,?,?)",
  );
  const addSkill = db.prepare("INSERT INTO user_skills (user_id, skill, type) VALUES (?,?,?)");
  const added = [];

  for (const [name, bio, offers, wants] of STUDENTS) {
    const email = name.split(" ")[0].toLowerCase() + "@demo.com";
    if (exists.get(email)) continue;
    const id = addUser.run(name, email, hash, bio).lastInsertRowid;
    offers.forEach((skill) => addSkill.run(id, skill, "offer"));
    wants.forEach((skill) => addSkill.run(id, skill, "want"));
    added.push(id);
  }

  // Fake completed swaps between neighbours, so demo profiles show star ratings
  added.forEach((id, i) => {
    const other = added[(i + 1) % added.length];
    if (other === id) return;
    const swap = db
      .prepare(
        "INSERT INTO swap_requests (sender_id, receiver_id, status) VALUES (?,?,'completed')",
      )
      .run(id, other).lastInsertRowid;
    db.prepare(
      "INSERT INTO reviews (request_id, reviewer_id, reviewee_id, rating, comment) VALUES (?,?,?,?,?)",
    ).run(swap, id, other, RATINGS[i % RATINGS.length], COMMENTS[i % COMMENTS.length]);
    db.prepare(
      "INSERT INTO reviews (request_id, reviewer_id, reviewee_id, rating, comment) VALUES (?,?,?,?,?)",
    ).run(swap, other, id, RATINGS[(i + 2) % RATINGS.length], COMMENTS[(i + 1) % COMMENTS.length]);
  });
};
