// server/config/db.js - 数据库连接配置
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',           // ← 改了这行
  port: process.env.DB_PORT || 3306,                  // ← 新增这行
  user: process.env.DB_USER || 'root',                // ← 改了这行
  password: process.env.DB_PASSWORD || 'qq138138',    // ← 改了这行
  database: process.env.DB_NAME || 'aichat_db',       // ← 改了这行
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;