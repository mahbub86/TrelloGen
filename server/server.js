import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------
// DATABASE CONNECTION
// ---------------------------------------------------------
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Ensure this matches your MySQL password
  database: 'trellogen',
  multipleStatements: true 
});

db.connect(err => {
  if (err) {
    console.error('❌ DB Connection Failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL DB');

  // Initialize board_members table
  const initMembersSql = `
    CREATE TABLE IF NOT EXISTS board_members (
      board_id VARCHAR(50),
      user_id VARCHAR(50),
      role VARCHAR(20) DEFAULT 'member',
      PRIMARY KEY (board_id, user_id)
    );
  `;
  db.query(initMembersSql, (err) => {
    if (err) console.error("Error creating board_members table:", err);
  });

  // Auto-migration: Add owner_id to boards if missing
  const checkColumnSql = `
    SELECT count(*) as count 
    FROM information_schema.columns 
    WHERE table_schema = 'trellogen' 
    AND table_name = 'boards' 
    AND column_name = 'owner_id';
  `;
  
  db.query(checkColumnSql, (err, results) => {
      if(!err && results[0].count === 0) {
          console.log("Migrating DB: Adding owner_id to boards table...");
          db.query("ALTER TABLE boards ADD COLUMN owner_id VARCHAR(50)", (alterErr) => {
              if(alterErr) console.error("Migration failed:", alterErr);
              else console.log("Migration successful.");
          });
      }
  });
});

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------

// --- Boards ---
app.get('/api/boards', (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
  }

  // Logic: Select boards where:
  // 1. User is Owner (owner_id)
  // 2. OR User is a Member (board_members)
  // 3. OR User is assigned to a Task in that board (JSON_CONTAINS in tasks)
  const sql = `
    SELECT DISTINCT b.* 
    FROM boards b 
    LEFT JOIN board_members bm ON b.id = bm.board_id 
    LEFT JOIN columns c ON b.id = c.board_id
    LEFT JOIN tasks t ON c.id = t.column_id
    WHERE 
      b.owner_id = ? 
      OR bm.user_id = ?
      OR (t.assignee_ids IS NOT NULL AND JSON_CONTAINS(t.assignee_ids, JSON_QUOTE(?)))
  `;

  db.query(sql, [userId, userId, userId], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.post('/api/boards', (req, res) => {
  const { id, title, background, ownerId } = req.body;
  
  // 1. Create Board with owner_id
  db.query('INSERT INTO boards (id, title, background, owner_id) VALUES (?, ?, ?, ?)', 
    [id, title, background, ownerId], (err) => {
    if (err) return res.status(500).send(err);

    // 2. Create Default Columns
    const defaultCols = ['TO DO', 'IN PROGRESS', 'COMPLETE'];
    const values = defaultCols.map((colTitle, index) => [
      `col-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`, 
      id,        
      colTitle,  
      index      
    ]);

    db.query('INSERT INTO columns (id, board_id, title, col_order) VALUES ?', [values], (err) => {
      if (err) console.error("Failed to create default columns", err);
      res.json({ id, title, background, ownerId });
    });
  });
});

app.put('/api/boards/:id', (req, res) => {
  const { title } = req.body;
  db.query('UPDATE boards SET title = ? WHERE id = ?', [title, req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

app.delete('/api/boards/:id', (req, res) => {
  console.log(`Deleting board ${req.params.id}`);
  db.query('DELETE FROM boards WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

// Share Board Endpoint
app.post('/api/boards/:id/share', (req, res) => {
  const boardId = req.params.id;
  const { email } = req.body;

  db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    const userId = results[0].id;

    db.query('INSERT IGNORE INTO board_members (board_id, user_id) VALUES (?, ?)', [boardId, userId], (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'User added to board' });
    });
  });
});

// --- Columns ---
app.get('/api/boards/:id/columns', (req, res) => {
  db.query('SELECT * FROM columns WHERE board_id = ? ORDER BY col_order ASC', 
    [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    const formatted = results.map(c => ({
        id: c.id, boardId: c.board_id, title: c.title, order: c.col_order
    }));
    res.json(formatted);
  });
});

app.post('/api/columns', (req, res) => {
  const { title, boardId } = req.body;
  const id = `col-${Date.now()}`;
  const order = 99; 
  db.query('INSERT INTO columns (id, board_id, title, col_order) VALUES (?, ?, ?, ?)', 
    [id, boardId, title, order], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ id, boardId, title, order });
  });
});

app.put('/api/columns/:id', (req, res) => {
  const { title } = req.body;
  db.query('UPDATE columns SET title = ? WHERE id = ?', [title, req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

app.delete('/api/columns/:id', (req, res) => {
  db.query('DELETE FROM columns WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

// --- Tasks ---
app.get('/api/boards/:id/tasks', (req, res) => {
  const sql = `
    SELECT t.* FROM tasks t 
    JOIN columns c ON t.column_id = c.id 
    WHERE c.board_id = ?`;
    
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    
    const formatted = results.map(t => ({
        id: t.id,
        columnId: t.column_id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        subtasks: typeof t.subtasks === 'string' ? JSON.parse(t.subtasks || '[]') : t.subtasks,
        comments: typeof t.comments === 'string' ? JSON.parse(t.comments || '[]') : t.comments,
        assigneeIds: typeof t.assignee_ids === 'string' ? JSON.parse(t.assignee_ids || '[]') : t.assignee_ids,
        startDate: t.start_date,
        dueDate: t.due_date,
        createdAt: t.created_at
    }));
    res.json(formatted);
  });
});

// Search Endpoint
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  
  const searchTerm = `%${q}%`;
  // Note: For search, we might want to also filter by user permission in a real app
  const sql = `
    SELECT t.*, c.board_id, b.title as board_title 
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    WHERE t.title LIKE ? OR t.description LIKE ?
    LIMIT 20
  `;
  
  db.query(sql, [searchTerm, searchTerm], (err, results) => {
    if (err) return res.status(500).send(err);
    
    const formatted = results.map(t => ({
        id: t.id,
        columnId: t.column_id,
        boardId: t.board_id,
        boardTitle: t.board_title,
        title: t.title,
        description: t.description,
        priority: t.priority,
        subtasks: typeof t.subtasks === 'string' ? JSON.parse(t.subtasks || '[]') : t.subtasks,
        comments: typeof t.comments === 'string' ? JSON.parse(t.comments || '[]') : t.comments,
        assigneeIds: typeof t.assignee_ids === 'string' ? JSON.parse(t.assignee_ids || '[]') : t.assignee_ids,
        startDate: t.start_date,
        dueDate: t.due_date,
        createdAt: t.created_at
    }));
    res.json(formatted);
  });
});

app.post('/api/tasks', (req, res) => {
  const t = req.body;
  const sql = `INSERT INTO tasks (id, column_id, title, description, priority, subtasks, comments, assignee_ids, start_date, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
      t.id, t.columnId, t.title, t.description, t.priority, 
      JSON.stringify(t.subtasks), JSON.stringify(t.comments), JSON.stringify(t.assigneeIds),
      t.startDate || null, t.dueDate || null, t.createdAt
  ];
  db.query(sql, values, (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const t = req.body;
  const sql = `UPDATE tasks SET title=?, description=?, priority=?, subtasks=?, assignee_ids=?, start_date=?, due_date=? WHERE id=?`;
  const values = [
      t.title, t.description, t.priority, 
      JSON.stringify(t.subtasks), JSON.stringify(t.assigneeIds),
      t.startDate || null, t.dueDate || null, req.params.id
  ];
  db.query(sql, values, (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

app.post('/api/tasks/:id/reorder', (req, res) => {
  const { targetColumnId } = req.body;
  db.query('UPDATE tasks SET column_id = ? WHERE id = ?', [targetColumnId, req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.query('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

// --- Auth ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  const id = `user-${Date.now()}`;
  const initials = name.substring(0, 2).toUpperCase();
  
  db.query('INSERT INTO users (id, name, email, password_hash, initials) VALUES (?, ?, ?, ?, ?)',
    [id, name, email, password, initials], (err) => {
      if (err) return res.status(400).json({ message: 'Email likely exists' });
      res.json({ id, name, email, passwordHash: password, initials });
    });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ? AND password_hash = ?', [email, password], (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const u = results[0];
    res.json({ id: u.id, name: u.name, email: u.email, passwordHash: u.password_hash, initials: u.initials, avatarUrl: u.avatar_url });
  });
});

// --- Users ---
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).send(err);
    const formatted = results.map(u => ({
        id: u.id, name: u.name, email: u.email, initials: u.initials, avatarUrl: u.avatar_url
    }));
    res.json(formatted);
  });
});

app.get('/api/users/lookup', (req, res) => {
    const { email } = req.query;
    db.query('SELECT id, name, email, initials, avatar_url as avatarUrl FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      res.json(results[0]);
    });
});

app.put('/api/users/:id', (req, res) => {
  const { name, passwordHash, avatarUrl } = req.body;
  db.query('UPDATE users SET name=?, password_hash=?, avatar_url=? WHERE id=?', 
    [name, passwordHash, avatarUrl, req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

// ---------------------------------------------------------
// START SERVER
// ---------------------------------------------------------
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});