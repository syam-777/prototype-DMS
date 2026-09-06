const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findOne } = require('../db/init');
const { createAuditEntry } = require('../services/audit');
const authenticate = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secure-doc-mgmt-prototype-secret-2024';

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    const user = findOne('users', u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    createAuditEntry({
      action: 'LOGIN',
      userId: user.id,
      ipAddress: req.ip,
      details: { message: 'User logged in successfully' }
    });

    res.json({ token, user: tokenPayload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
