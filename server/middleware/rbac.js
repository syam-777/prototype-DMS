const { findOne } = require('../db/init');
const { createAuditEntry } = require('../services/audit');

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
    }
    next();
  };
}

function checkDocumentAccess(requiredLevel) {
  return (req, res, next) => {
    const documentId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin allows everything
    if (userRole === 'admin') {
      return next();
    }

    // Check if user uploaded the document
    const doc = findOne('documents', d => d.id === documentId && !d.is_deleted);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.uploaded_by === userId) {
      return next();
    }

    // Check document_access table
    const access = findOne('document_access', a => a.document_id === documentId && a.user_id === userId);

    let hasAccess = false;
    if (access) {
      if (access.access_level === 'admin') hasAccess = true;
      else if (access.access_level === 'edit' && ['view', 'edit'].includes(requiredLevel)) hasAccess = true;
      else if (access.access_level === 'view' && requiredLevel === 'view') hasAccess = true;
    }

    if (hasAccess) {
      return next();
    }

    // Deny with 403 + AUDIT
    createAuditEntry({
      action: 'ACCESS_DENIED',
      userId,
      documentId,
      ipAddress: req.ip,
      details: { requiredLevel, actualAccess: access ? access.access_level : 'none' }
    });

    return res.status(403).json({ error: 'Forbidden: Insufficient access to document' });
  };
}

module.exports = {
  checkRole,
  checkDocumentAccess
};
