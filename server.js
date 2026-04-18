import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "pascal_db",
  password: "oscar16",
  port: 5432,
});

// Create table if not exists
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50),
      input TEXT,
      output TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Database initialized");
};

initDB();

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("Pascal Backend Running  well That's a great");
});

// GET history
app.get("/api/history", async (req, res) => {
  try {
    const data = await pool.query("SELECT * FROM history ORDER BY id DESC");
    res.json(data.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//post /api/history
app.post("/api/history", async (req, res) => {
  try {
    const { type, input, result } = req.body;

    const query = `
      INSERT INTO history (type, input, result)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [type, input, JSON.stringify(result)];
    const data = await pool.query(query, values);

    res.json(data.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
//get /api/history/:id
app.get("/api/history/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await pool.query(
      "SELECT * FROM history WHERE id = $1",
      [id]
    );

    res.json(data.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//post /api/pascal

app.post("/api/pascal", (req, res) => {
  try {
    const { n } = req.body;
    const num = parseInt(n);

    if (isNaN(num) || num < 0) {
      return res.status(400).json({ error: "Invalid n value" });
    }

    let rows = [];

    for (let i = 0; i <= num; i++) {
      let row = [];
      for (let j = 0; j <= i; j++) {
        if (j === 0 || j === i) {
          row.push(1);
        } else {
          row.push(rows[i - 1][j - 1] + rows[i - 1][j]);
        }
      }
      rows.push(row);
    }

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//∑ POST /api/expand
app.post("/api/expand", (req, res) => {
  try {
    const { expression } = req.body;

    // VERY SIMPLE parser: (x+y)^n only
    const match = expression.match(/\((\w)\+(\w)\)\^(\d+)/);

    if (!match) {
      return res.status(400).json({ error: "Invalid format. Use (x+y)^n" });
    }

    const [, a, b, nStr] = match;
    const n = parseInt(nStr);

    let terms = [];

    const factorial = (x) => (x <= 1 ? 1 : x * factorial(x - 1));
    const comb = (n, r) => factorial(n) / (factorial(r) * factorial(n - r));

    for (let k = 0; k <= n; k++) {
      terms.push({
        coeff: comb(n, k),
        varA: a,
        powA: n - k,
        varB: b,
        powB: k,
      });
    }

    res.json({ terms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE history
app.delete("/api/history", async (req, res) => {
  try {
    await pool.query("DELETE FROM history");
    res.json({ message: "History cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SERVER =================

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});