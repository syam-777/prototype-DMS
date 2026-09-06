const express = require('express');
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const { verifyAuditChain } = require('../services/audit');
const { find, findOne, getAll } = require('../db/init');

const router = express.Router();

// GET / — list audit log entries
router.get('/', authenticate, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;

    let logs;

    if (req.user.role === 'admin') {
      // Admin sees all audit entries
      logs = getAll('audit_log');
    } else {
      // Non-admin sees entries related to their actions or their documents
      const userId = req.user.id;

      // Get document IDs the user has access to
      const accessDocIds = find('document_access', a => a.user_id === userId).map(a => a.document_id);
      const ownDocIds = find('documents', d => d.uploaded_by === userId).map(d => d.id);
      const relevantDocIds = new Set([...accessDocIds, ...ownDocIds]);

      logs = find('audit_log', entry =>
        entry.user_id === userId || relevantDocIds.has(entry.document_id)
      );
    }

    // Sort by id descending, then apply pagination
    logs = logs
      .sort((a, b) => b.id - a.id)
      .slice(offset, offset + limit);

    // Join user full_name
    logs = logs.map(entry => {
      const user = findOne('users', u => u.id === entry.user_id);
      return { ...entry, full_name: user ? user.full_name : null };
    });

    res.json({ logs });
  } catch (err) {
    console.error('Error listing audit logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /verify — verify audit chain integrity (admin only)
router.get('/verify', authenticate, checkRole('admin'), (req, res) => {
  try {
    const result = verifyAuditChain();
    res.json(result);
  } catch (err) {
    console.error('Error verifying audit chain:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
