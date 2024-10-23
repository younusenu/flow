const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(() => {
    db.run(`CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense'))
    )`);

    db.run(`CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT
    )`);
});
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());
// POST /transactions
app.post('/transactions', (req, res) => {
    const { type, category, amount, date, description } = req.body;
    const stmt = db.prepare("INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)");
    stmt.run(type, category, amount, date, description, function(err) {
        if (err) return res.status(400).send(err.message);
        res.status(201).json({ id: this.lastID });
    });
    stmt.finalize();
});

// GET /transactions
app.get('/transactions', (req, res) => {
    db.all("SELECT * FROM transactions", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.json(rows);
    });
});

// GET /transactions/:id
app.get('/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM transactions WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).send(err.message);
        if (!row) return res.status(404).send('Transaction not found');
        res.json(row);
    });
});

// PUT /transactions/:id
app.put('/transactions/:id', (req, res) => {
    const { id } = req.params;
    const { type, category, amount, date, description } = req.body;
    const stmt = db.prepare("UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?");
    stmt.run(type, category, amount, date, description, id, function(err) {
        if (err) return res.status(400).send(err.message);
        if (this.changes === 0) return res.status(404).send('Transaction not found');
        res.send('Transaction updated');
    });
    stmt.finalize();
});

// DELETE /transactions/:id
app.delete('/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM transactions WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).send(err.message);
        if (this.changes === 0) return res.status(404).send('Transaction not found');
        res.send('Transaction deleted');
    });
});

// GET /summary
app.get('/summary', (req, res) => {
    db.all("SELECT type, SUM(amount) as total FROM transactions GROUP BY type", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        const summary = {
            totalIncome: rows.find(row => row.type === 'income')?.total || 0,
            totalExpenses: rows.find(row => row.type === 'expense')?.total || 0,
            balance: (rows.find(row => row.type === 'income')?.total || 0) - (rows.find(row => row.type === 'expense')?.total || 0)
        };
        res.json(summary);
    });
});

