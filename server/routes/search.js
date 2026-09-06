const express = require('express');
const authenticate = require('../middleware/auth');
const { createAuditEntry } = require('../services/audit');
const { find, searchDocuments } = require('../db/init');

const router = express.Router();

// GET /?q= — full-text search across documents
router.get('/', authenticate, (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query "q" is required' });
    }

    // Find all document IDs the user has access to
    let accessibleDocIds = [];
    if (req.user.role === 'admin') {
      accessibleDocIds = find('documents', d => !d.is_deleted).map(d => d.id);
    } else {
      // Documents uploaded by the user
      const ownDocIds = find('documents', d => d.uploaded_by === req.user.id && !d.is_deleted).map(d => d.id);

      // Documents shared with the user
      const accessEntries = find('document_access', a => a.user_id === req.user.id);
      const sharedDocIds = accessEntries
        .map(a => a.document_id)
        .filter(docId => {
          const doc = find('documents', d => d.id === docId && !d.is_deleted);
          return doc.length > 0;
        });

      accessibleDocIds = [...new Set([...ownDocIds, ...sharedDocIds])];
    }

    if (accessibleDocIds.length === 0) {
      return res.json({ results: [] });
    }

    const results = searchDocuments(q, accessibleDocIds);

    createAuditEntry({
      action: 'SEARCH',
      userId: req.user.id,
      ipAddress: req.ip,
      details: { query: q, resultsCount: results.length }
    });

    res.json({ results });
  } catch (err) {
    console.error('Error searching documents:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
