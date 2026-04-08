// server/routes/user.js - 用户资料路由
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

const router = express.Router();
const JWT_SECRET = 'your-super-secret-jwt-key-12345';

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = 'avatar_' + req.user.userId + '_' + Date.now() + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 jpg/png/gif/webp 格式'));
    }
  }
});

// Token 验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未授权' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token 无效或已过期' });
    }
    req.user = user;
    next();
  });
};

// 所有路由都需要认证
router.use(authenticateToken);

// 获取用户资料
router.get('/profile', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, nickname, avatar FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      avatar: user.avatar || null
    });
  } catch (error) {
    console.error('获取资料错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新昵称
router.put('/profile', async (req, res) => {
  try {
    const { nickname } = req.body;

    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ message: '昵称不能为空' });
    }

    if (nickname.trim().length > 20) {
      return res.status(400).json({ message: '昵称不能超过20个字符' });
    }

    await pool.query(
      'UPDATE users SET nickname = ? WHERE id = ?',
      [nickname.trim(), req.user.userId]
    );

    res.json({
      message: '昵称更新成功',
      nickname: nickname.trim()
    });
  } catch (error) {
    console.error('更新昵称错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 上传头像
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择图片' });
    }

    // 删除旧头像文件
    const [users] = await pool.query(
      'SELECT avatar FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length > 0 && users[0].avatar) {
      const oldPath = users[0].avatar;
      // 从 URL 提取文件名
      const oldFileName = oldPath.split('/').pop();
      const oldFilePath = path.join(uploadDir, oldFileName);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const avatarUrl = '/uploads/avatars/' + req.file.filename;

    await pool.query(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatarUrl, req.user.userId]
    );

    res.json({
      message: '头像更新成功',
      avatar: avatarUrl
    });
  } catch (error) {
    console.error('上传头像错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;