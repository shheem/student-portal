import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ---------- Helpers ----------
const DATA_DIR = path.resolve("data");
const UPLOADS_DIR = path.resolve("uploads");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const readJSON = (fileName) => {
  const p = path.join(DATA_DIR, fileName);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
};

const writeJSON = (fileName, data) => {
  const p = path.join(DATA_DIR, fileName);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
};

// ---------- Student: get grades ----------
app.post("/api/student/grades", (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId required" });

  const students = readJSON("students.json");
  const student = students.find((s) => s.id === studentId);

  if (!student) return res.status(404).json({ error: "Student not found" });

  res.json({
    id: student.id,
    name: student.name,
    grades: student.grades
  });
});

// ---------- Teacher auth (demo only) ----------
const TEACHER_PASSWORD = "admin123"; // später in .env verschieben

app.post("/api/teacher/login", (req, res) => {
  const { password } = req.body;
  if (password === TEACHER_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: "Wrong password" });
});

// ---------- Upload lectures ----------
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const safeName = Date.now() + "-" + file.originalname.replaceAll(" ", "_");
    cb(null, safeName);
  }
});
const upload = multer({ storage });

app.post("/api/teacher/lectures", upload.single("lecture"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const lectures = readJSON("lectures.json");
  lectures.push({
    id: Date.now().toString(),
    title: req.body.title || req.file.originalname,
    fileName: req.file.filename,
    uploadedAt: new Date().toISOString()
  });
  writeJSON("lectures.json", lectures);

  res.json({ ok: true });
});

// ---------- List lectures ----------
app.get("/api/lectures", (_, res) => {
  const lectures = readJSON("lectures.json");
  res.json(lectures);
});

// ---------- Serve uploaded files ----------
app.use("/uploads", express.static(UPLOADS_DIR));
// ---------- Delete lecture ----------
app.delete("/api/teacher/lectures/:id", (req, res) => {
  const { id } = req.params;

  const lectures = readJSON("lectures.json");
  const lecture = lectures.find(l => l.id === id);

  if (!lecture) {
    return res.status(404).json({ error: "Lecture not found" });
  }

  // Datei vom Speicher löschen
  const filePath = path.join(UPLOADS_DIR, lecture.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Eintrag aus JSON löschen
  const updatedLectures = lectures.filter(l => l.id !== id);
  writeJSON("lectures.json", updatedLectures);

  res.json({ ok: true });
});



app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
