const express = require('express');
const authenticate = require('../middleware/auth');
const { getAll } = require('../db/init');

const router = express.Router();

// GET / — list all users (without password hashes)
router.get('/', authenticate, (req, res) => {
  try {
    const users = getAll('users').map(u => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      department: u.department
    }));
    res.json({ users });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
