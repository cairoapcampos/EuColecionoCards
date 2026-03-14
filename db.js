'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'app.db'));

// Configurações de segurança do banco
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN ('admin', 'user')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Todas as consultas usam parâmetros vinculados (? ou :param)
// para prevenir SQL Injection — nunca concatenar valores do usuário na query.
const stmts = {
  findByUsername: db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?'),
  usernameExists: db.prepare('SELECT 1 FROM users WHERE username = ?'),
  createUser: db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'),
  listUsers: db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'),
  deleteUser: db.prepare("DELETE FROM users WHERE id = ? AND username != 'admin'"),
  updatePassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
};

module.exports = { db, stmts };
