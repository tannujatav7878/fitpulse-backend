/**
 * FitPulse - Standalone Website Server
 * Runs the FitPulse fitness tracker as a website in any browser (Chrome, Firefox, Edge, Safari).
 * Tech: Node.js + Express + better-sqlite3 (zero-config local database)
 */
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "fitpulse.db");

const app = express();
app.use(express.json({ limit: "2mb" }));

// ========== DB INIT ==========
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL,
  fitnessGoal TEXT, age INTEGER, weight REAL, height REAL,
  activityLevel TEXT DEFAULT 'moderately_active',
  avatarUrl TEXT, bio TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL, workoutName TEXT NOT NULL, category TEXT,
  duration INTEGER NOT NULL, caloriesBurned INTEGER NOT NULL,
  exercises TEXT, notes TEXT,
  completedAt TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL, title TEXT NOT NULL, description TEXT,
  targetValue REAL NOT NULL, currentValue REAL DEFAULT 0,
  unit TEXT, deadline TEXT, category TEXT,
  completed INTEGER DEFAULT 0, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL, date TEXT NOT NULL,
  workoutsCompleted INTEGER DEFAULT 0, caloriesBurned INTEGER DEFAULT 0,
  minutesActive INTEGER DEFAULT 0, weight REAL, steps INTEGER, mood TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL, title TEXT NOT NULL, description TEXT,
  icon TEXT, unlockedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// ========== AUTH HELPERS ==========
const SECRET = "fitpulse-secret-key-change-in-production";
function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pwd, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(pwd, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(pwd, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
}
function generateToken(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

// ========== STATIC DATA ==========
const WORKOUT_PLANS = [
  { id: 1, name: "Beginner Full Body", description: "Perfect for those starting their fitness journey", level: "beginner", duration: 4, category: "strength", isPremium: false, exercises: ["Push-ups", "Squats", "Plank", "Lunges", "Jumping Jacks"] },
  { id: 2, name: "HIIT Fat Burner", description: "High-intensity interval training to torch calories", level: "intermediate", duration: 6, category: "cardio", isPremium: false, exercises: ["Burpees", "Mountain Climbers", "Jump Squats", "High Knees", "Box Jumps"] },
  { id: 3, name: "Advanced Strength", description: "Build serious muscle with progressive overload", level: "advanced", duration: 8, category: "strength", isPremium: true, exercises: ["Deadlift", "Bench Press", "Pull-ups", "Overhead Press", "Rows"] },
  { id: 4, name: "Yoga & Flexibility", description: "Improve flexibility and mindfulness", level: "beginner", duration: 4, category: "flexibility", isPremium: false, exercises: ["Sun Salutation", "Warrior Pose", "Child's Pose", "Downward Dog", "Pigeon Pose"] },
  { id: 5, name: "5K Runner Plan", description: "Train to run your first 5K", level: "intermediate", duration: 8, category: "cardio", isPremium: true, exercises: ["Easy Run", "Interval Run", "Long Run", "Recovery Walk", "Strides"] },
];
const EXERCISES = [
  { id: 1, name: "Push-ups", category: "strength", muscleGroup: "chest", difficulty: "beginner", description: "Classic upper body exercise targeting chest, shoulders, and triceps", instructions: ["Start in plank position", "Lower chest to floor", "Push back up"], caloriesPerMinute: 7, equipment: "none" },
  { id: 2, name: "Squats", category: "strength", muscleGroup: "legs", difficulty: "beginner", description: "Fundamental lower body exercise", instructions: ["Stand feet shoulder-width apart", "Lower hips back and down", "Return to standing"], caloriesPerMinute: 8, equipment: "none" },
  { id: 3, name: "Deadlift", category: "strength", muscleGroup: "back", difficulty: "intermediate", description: "Full body compound movement", instructions: ["Stand with bar over feet", "Hinge at hips to grip bar", "Drive through heels to stand"], caloriesPerMinute: 9, equipment: "barbell" },
  { id: 4, name: "Plank", category: "strength", muscleGroup: "core", difficulty: "beginner", description: "Core stability exercise", instructions: ["Get into forearm position", "Keep body straight", "Hold the position"], caloriesPerMinute: 5, equipment: "none" },
  { id: 5, name: "Burpees", category: "cardio", muscleGroup: "full body", difficulty: "intermediate", description: "High intensity full body exercise", instructions: ["Start standing", "Jump down to push-up", "Jump back up with arms overhead"], caloriesPerMinute: 12, equipment: "none" },
  { id: 6, name: "Pull-ups", category: "strength", muscleGroup: "back", difficulty: "intermediate", description: "Upper body pulling exercise", instructions: ["Hang from bar", "Pull chest to bar", "Lower with control"], caloriesPerMinute: 8, equipment: "pull-up bar" },
  { id: 7, name: "Running", category: "cardio", muscleGroup: "legs", difficulty: "beginner", description: "Classic cardiovascular exercise", instructions: ["Warm up with walk", "Maintain steady pace", "Cool down"], caloriesPerMinute: 10, equipment: "none" },
  { id: 8, name: "Bench Press", category: "strength", muscleGroup: "chest", difficulty: "intermediate", description: "Horizontal pushing exercise", instructions: ["Lie on bench", "Lower bar to chest", "Press up"], caloriesPerMinute: 8, equipment: "barbell" },
  { id: 9, name: "Mountain Climbers", category: "cardio", muscleGroup: "core", difficulty: "beginner", description: "Dynamic core and cardio exercise", instructions: ["Start in plank", "Drive knees alternately to chest", "Keep core tight"], caloriesPerMinute: 10, equipment: "none" },
  { id: 10, name: "Lunges", category: "strength", muscleGroup: "legs", difficulty: "beginner", description: "Single leg lower body exercise", instructions: ["Step forward", "Lower back knee", "Return to start"], caloriesPerMinute: 7, equipment: "none" },
  { id: 11, name: "Overhead Press", category: "strength", muscleGroup: "shoulders", difficulty: "intermediate", description: "Vertical pushing exercise", instructions: ["Hold bar at shoulders", "Press overhead", "Lower with control"], caloriesPerMinute: 8, equipment: "barbell" },
  { id: 12, name: "Jump Rope", category: "cardio", muscleGroup: "full body", difficulty: "beginner", description: "Cardio skipping exercise", instructions: ["Hold handles", "Jump over rope", "Maintain rhythm"], caloriesPerMinute: 11, equipment: "jump rope" },
];

// ========== DEMO SEED ==========
function seedDemo() {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("demo@fitpulse.app");
  if (existing) return;
  const result = db.prepare(`INSERT INTO users (name, email, passwordHash, fitnessGoal, age, weight, height, activityLevel, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "Demo Athlete", "demo@fitpulse.app", hashPassword("demo123"),
    "build_muscle", 28, 75, 178, "very_active", "Loving the FitPulse journey!"
  );
  const uid = result.lastInsertRowid;
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    db.prepare(`INSERT INTO workouts (userId, workoutName, category, duration, caloriesBurned, exercises, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uid, ["HIIT Fat Burner", "Beginner Full Body", "Yoga & Flexibility", "5K Runner Plan", "Advanced Strength"][i],
      ["cardio", "strength", "flexibility", "cardio", "strength"][i],
      30 + i * 5, 250 + i * 50, JSON.stringify(["Squats", "Push-ups"]), d.toISOString()
    );
    db.prepare(`INSERT INTO progress (userId, date, workoutsCompleted, caloriesBurned, minutesActive, weight, steps, mood)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      uid, d.toISOString().split("T")[0], 1, 250 + i * 50, 30 + i * 5, 75, 8000 + i * 500, "great"
    );
  }
  db.prepare(`INSERT INTO goals (userId, title, description, targetValue, currentValue, unit, deadline, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uid, "Run 50km this month", "Build cardio endurance", 50, 18, "km",
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], "cardio"
  );
  console.log("✓ Seeded demo account: demo@fitpulse.app / demo123");
}
seedDemo();

// ========== AUTH ROUTES ==========
app.post("/api/auth/register", (req, res) => {
  try {
    const { name, email, password, fitnessGoal, age, weight, height, activityLevel } = req.body;
    if (!name || !email || !password || !fitnessGoal)
      return res.status(400).json({ error: "Missing required fields", message: "name, email, password, fitnessGoal are required" });
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) return res.status(409).json({ error: "Email already exists", message: "An account with this email already exists" });
    const result = db.prepare(`INSERT INTO users (name, email, passwordHash, fitnessGoal, age, weight, height, activityLevel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(name, email, hashPassword(password), fitnessGoal, age, weight, height, activityLevel || "moderately_active");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json({
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, fitnessGoal: user.fitnessGoal, age: user.age, weight: user.weight, height: user.height, activityLevel: user.activityLevel, createdAt: user.createdAt },
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing fields", message: "Email and password required" });
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !verifyPassword(password, user.passwordHash))
      return res.status(401).json({ error: "Invalid credentials", message: "Email or password is incorrect" });
    return res.json({
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, fitnessGoal: user.fitnessGoal, age: user.age, weight: user.weight, height: user.height, activityLevel: user.activityLevel, createdAt: user.createdAt },
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

app.post("/api/auth/forgot-password", (req, res) => {
  return res.json({ message: "If an account exists, a reset link has been sent." });
});

// ========== USER ROUTES ==========
app.get("/api/users/profile", (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  delete user.passwordHash;
  return res.json(user);
});

app.put("/api/users/profile", (req, res) => {
  const { userId, name, age, weight, height, activityLevel, fitnessGoal, bio } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const fields = [], vals = [];
  for (const [k, v] of Object.entries({ name, age, weight, height, activityLevel, fitnessGoal, bio }))
    if (v !== undefined) { fields.push(`${k} = ?`); vals.push(v); }
  fields.push("updatedAt = CURRENT_TIMESTAMP");
  vals.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...vals);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  delete user.passwordHash;
  return res.json(user);
});

app.get("/api/users/stats", (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const workouts = db.prepare("SELECT * FROM workouts WHERE userId = ?").all(userId);
  const totalWorkouts = workouts.length;
  const totalCaloriesBurned = workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
  const totalMinutes = workouts.reduce((s, w) => s + (w.duration || 0), 0);
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const thisWeekWorkouts = workouts.filter(w => w.completedAt && new Date(w.completedAt) >= weekStart);
  const thisWeekCalories = thisWeekWorkouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
  let bmi = null, bmiCategory = null;
  if (user?.weight && user?.height) {
    const hM = user.height / 100;
    bmi = parseFloat((user.weight / (hM * hM)).toFixed(1));
    bmiCategory = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
  }
  const progress = db.prepare("SELECT * FROM progress WHERE userId = ? ORDER BY date DESC").all(userId);
  let currentStreak = 0, streak = 0;
  const sortedDates = progress.map(p => p.date).sort((a, b) => b.localeCompare(a));
  for (let i = 0; i < sortedDates.length; i++) {
    const ed = new Date(); ed.setDate(ed.getDate() - i);
    if (sortedDates[i] === ed.toISOString().split("T")[0]) { streak++; if (i <= 1) currentStreak = streak; }
    else break;
  }
  return res.json({ totalWorkouts, totalCaloriesBurned, totalMinutes, currentStreak, longestStreak: streak, thisWeekWorkouts: thisWeekWorkouts.length, thisWeekCalories, bmi, bmiCategory });
});

app.put("/api/users/change-email", (req, res) => {
  const { userId, newEmail, password } = req.body;
  if (!userId || !newEmail || !password) return res.status(400).json({ error: "userId, newEmail and password required" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!verifyPassword(password, user.passwordHash))
    return res.status(401).json({ error: "Incorrect password", message: "Current password is incorrect" });
  const taken = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(newEmail, userId);
  if (taken) return res.status(409).json({ error: "Email taken", message: "This email is already in use" });
  db.prepare("UPDATE users SET email = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(newEmail, userId);
  return res.json({ id: userId, email: newEmail, name: user.name });
});

app.put("/api/users/change-password", (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) return res.status(400).json({ error: "userId, currentPassword and newPassword required" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!verifyPassword(currentPassword, user.passwordHash))
    return res.status(401).json({ error: "Incorrect password", message: "Current password is incorrect" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Weak password", message: "Password must be at least 6 characters" });
  db.prepare("UPDATE users SET passwordHash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(hashPassword(newPassword), userId);
  return res.json({ message: "Password changed successfully" });
});

// ========== WORKOUT ROUTES ==========
app.get("/api/workouts", (req, res) => {
  const userId = parseInt(req.query.userId);
  const limit = parseInt(req.query.limit) || 20;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const ws = db.prepare("SELECT * FROM workouts WHERE userId = ? ORDER BY createdAt DESC LIMIT ?").all(userId, limit);
  return res.json(ws.map(w => ({ ...w, exercises: w.exercises ? JSON.parse(w.exercises) : [] })));
});

app.post("/api/workouts", (req, res) => {
  const { userId, workoutName, category, duration, caloriesBurned, exercises, notes, completedAt } = req.body;
  if (!userId || !workoutName || !duration || caloriesBurned === undefined)
    return res.status(400).json({ error: "Missing required fields" });
  const result = db.prepare(`INSERT INTO workouts (userId, workoutName, category, duration, caloriesBurned, exercises, notes, completedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, workoutName, category, duration, caloriesBurned,
    JSON.stringify(exercises || []), notes, completedAt || new Date().toISOString());
  const w = db.prepare("SELECT * FROM workouts WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json({ ...w, exercises: w.exercises ? JSON.parse(w.exercises) : [] });
});

app.get("/api/workouts/:id", (req, res) => {
  const w = db.prepare("SELECT * FROM workouts WHERE id = ?").get(parseInt(req.params.id));
  if (!w) return res.status(404).json({ error: "Workout not found" });
  return res.json({ ...w, exercises: w.exercises ? JSON.parse(w.exercises) : [] });
});

app.put("/api/workouts/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { workoutName, duration, caloriesBurned, notes } = req.body;
  const fields = [], vals = [];
  for (const [k, v] of Object.entries({ workoutName, duration, caloriesBurned, notes }))
    if (v !== undefined) { fields.push(`${k} = ?`); vals.push(v); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE workouts SET ${fields.join(", ")} WHERE id = ?`).run(...vals); }
  const w = db.prepare("SELECT * FROM workouts WHERE id = ?").get(id);
  return res.json({ ...w, exercises: w.exercises ? JSON.parse(w.exercises) : [] });
});

app.delete("/api/workouts/:id", (req, res) => {
  db.prepare("DELETE FROM workouts WHERE id = ?").run(parseInt(req.params.id));
  return res.json({ message: "Workout deleted successfully" });
});

// ========== EXERCISES & PLANS ==========
app.get("/api/exercises", (req, res) => {
  const { category, search } = req.query;
  let r = EXERCISES;
  if (category) r = r.filter(e => e.category === category);
  if (search) r = r.filter(e => e.name.toLowerCase().includes(String(search).toLowerCase()));
  return res.json(r);
});
app.get("/api/plans", (req, res) => res.json(WORKOUT_PLANS));

// ========== GOALS ==========
app.get("/api/goals", (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const gs = db.prepare("SELECT * FROM goals WHERE userId = ? ORDER BY createdAt DESC").all(userId);
  return res.json(gs.map(g => ({ ...g, completed: g.completed === 1 })));
});

app.post("/api/goals", (req, res) => {
  const { userId, title, description, targetValue, currentValue, unit, deadline, category } = req.body;
  if (!userId || !title || targetValue === undefined) return res.status(400).json({ error: "Missing required fields" });
  const r = db.prepare(`INSERT INTO goals (userId, title, description, targetValue, currentValue, unit, deadline, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, title, description, targetValue, currentValue || 0, unit, deadline, category);
  const g = db.prepare("SELECT * FROM goals WHERE id = ?").get(r.lastInsertRowid);
  return res.status(201).json({ ...g, completed: g.completed === 1 });
});

app.put("/api/goals/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { currentValue, completed, title, targetValue } = req.body;
  const fields = [], vals = [];
  if (currentValue !== undefined) { fields.push("currentValue = ?"); vals.push(currentValue); }
  if (completed !== undefined) { fields.push("completed = ?"); vals.push(completed ? 1 : 0); }
  if (title !== undefined) { fields.push("title = ?"); vals.push(title); }
  if (targetValue !== undefined) { fields.push("targetValue = ?"); vals.push(targetValue); }
  if (fields.length) { vals.push(id); db.prepare(`UPDATE goals SET ${fields.join(", ")} WHERE id = ?`).run(...vals); }
  const g = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
  return res.json({ ...g, completed: g.completed === 1 });
});

// ========== ACHIEVEMENTS ==========
app.get("/api/achievements", (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  return res.json(db.prepare("SELECT * FROM achievements WHERE userId = ? ORDER BY unlockedAt DESC").all(userId));
});

// ========== PROGRESS ==========
app.get("/api/progress", (req, res) => {
  const userId = parseInt(req.query.userId);
  const days = parseInt(req.query.days) || 30;
  if (!userId) return res.status(400).json({ error: "userId required" });
  return res.json(db.prepare("SELECT * FROM progress WHERE userId = ? ORDER BY date DESC LIMIT ?").all(userId, days));
});

app.post("/api/progress", (req, res) => {
  const { userId, date, workoutsCompleted, caloriesBurned, minutesActive, weight, steps, mood } = req.body;
  if (!userId || !date || workoutsCompleted === undefined) return res.status(400).json({ error: "Missing required fields" });
  const r = db.prepare(`INSERT INTO progress (userId, date, workoutsCompleted, caloriesBurned, minutesActive, weight, steps, mood)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(userId, date, workoutsCompleted, caloriesBurned, minutesActive, weight, steps, mood);
  return res.status(201).json(db.prepare("SELECT * FROM progress WHERE id = ?").get(r.lastInsertRowid));
});

app.get("/api/progress/summary", (req, res) => {
  const userId = parseInt(req.query.userId);
  if (!userId) return res.status(400).json({ error: "userId required" });
  const workouts = db.prepare("SELECT * FROM workouts WHERE userId = ? ORDER BY completedAt DESC LIMIT 50").all(userId);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyCalories = days.map(day => ({ day, calories: 0 }));
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6);
  workouts.forEach(w => {
    if (!w.completedAt) return;
    const wd = new Date(w.completedAt);
    if (wd >= weekStart) weeklyCalories[wd.getDay()].calories += w.caloriesBurned || 0;
  });
  const monthlyWorkouts = [{ week: "Week 1", count: 0 }, { week: "Week 2", count: 0 }, { week: "Week 3", count: 0 }, { week: "Week 4", count: 0 }];
  workouts.forEach(w => {
    if (!w.completedAt) return;
    const ago = Math.floor((now.getTime() - new Date(w.completedAt).getTime()) / 86400000);
    if (ago < 28) { const wi = Math.floor(ago / 7); if (wi < 4) monthlyWorkouts[3 - wi].count++; }
  });
  const totalThisMonth = workouts.filter(w => {
    if (!w.completedAt) return false;
    const wd = new Date(w.completedAt);
    return wd.getMonth() === now.getMonth() && wd.getFullYear() === now.getFullYear();
  }).length;
  const avgCalories = workouts.length > 0 ? Math.floor(workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0) / workouts.length) : 0;
  return res.json({ weeklyCalories, monthlyWorkouts, totalThisMonth, averageCaloriesPerWorkout: avgCalories });
});

// ========== HEALTH ==========
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ========== STATIC WEB APP ==========
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════════════════╗`);
  console.log(`  ║                                                   ║`);
  console.log(`  ║   FitPulse Website is running!                    ║`);
  console.log(`  ║                                                   ║`);
  console.log(`  ║   Open in browser:                                ║`);
  console.log(`  ║   → http://localhost:${PORT}                          ║`);
  console.log(`  ║                                                   ║`);
  console.log(`  ║   Demo account:                                   ║`);
  console.log(`  ║   email:    demo@fitpulse.app                     ║`);
  console.log(`  ║   password: demo123                               ║`);
  console.log(`  ║                                                   ║`);
  console.log(`  ╚═══════════════════════════════════════════════════╝\n`);
});
