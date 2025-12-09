import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// ---------------------------------------------------------
// DATABASE CONNECTION (UPDATE THESE VALUES)
// ---------------------------------------------------------
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // <--- CHANGE THIS IF NEEDED
  password: '', // <--- CHANGE THIS IF NEEDED
  database: 'trellogen'
});

db.connect(err => {
  if (err) {
    console.error('❌ DB Connection Failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL DB');
});

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------

// --- Boards ---
app.get('/api/boards', (req, res) => {
  db.query('SELECT * FROM boards', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.post('/api/boards', (req, res) => {
  const { id, title, background } = req.body;
  db.query('INSERT INTO boards (id, title, background) VALUES (?, ?, ?)', 
    [id, title, background], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ id, title, background });
  });
});

app.put('/api/boards/:id', (req, res) => {
  const { title } = req.body;
  db.query('UPDATE boards SET title = ? WHERE id = ?', [title, req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

// --- Columns ---
app.get('/api/boards/:id/columns', (req, res) => {
  db.query('SELECT * FROM columns WHERE board_id = ? ORDER BY col_order ASC', 
    [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    // Convert snake_case to camelCase for frontend
    const formatted = results.map(c => ({
        id: c.id, boardId: c.board_id, title: c.title, order: c.col_order
    }));
    res.json(formatted);
  });
});

app.post('/api/columns', (req, res) => {
  const { title, boardId } = req.body;
  const id = `col-${Date.now()}`;
  const order = 99; // Simplified: append to end
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
app.listen(3001, () => {
  console.log('🚀 Backend running at http://localhost:3001');
});