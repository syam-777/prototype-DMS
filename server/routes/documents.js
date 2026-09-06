const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const authenticate = require('../middleware/auth');
const { checkRole, checkDocumentAccess } = require('../middleware/rbac');
const { hashDocument, encryptFile, decryptFile, createSignature } = require('../services/crypto');
const { createAuditEntry } = require('../services/audit');
const { insert, find, findOne, update, upsert, getAll } = require('../db/init');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

// GET / — list documents accessible to the current user
router.get('/', authenticate, (req, res) => {
  try {
    let documents;

    if (req.user.role === 'admin') {
      // Admin sees all non-deleted documents
      documents = find('documents', d => !d.is_deleted).map(d => ({
        ...d,
        access_level: 'admin'
      }));
    } else {
      // Documents uploaded by the user
      const ownDocs = find('documents', d => d.uploaded_by === req.user.id && !d.is_deleted)
        .map(d => ({ ...d, access_level: 'admin' }));

      // Documents shared with the user via document_access
      const accessEntries = find('document_access', a => a.user_id === req.user.id);
      const sharedDocs = [];
      for (const access of accessEntries) {
        const doc = findOne('documents', d => d.id === access.document_id && !d.is_deleted);
        if (doc && doc.uploaded_by !== req.user.id) {
          sharedDocs.push({ ...doc, access_level: access.access_level });
        }
      }

      // Deduplicate by id (own docs take priority)
      const seen = new Set(ownDocs.map(d => d.id));
      documents = [...ownDocs];
      for (const doc of sharedDocs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          documents.push(doc);
        }
      }
    }

    res.json({ documents });
  } catch (err) {
    console.error('Error listing documents:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — upload a new document
router.post('/', authenticate, checkRole('admin', 'investigator'), upload.single('document'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const { title, case_number, category, classification } = req.body;

    const fileBuffer = fs.readFileSync(req.file.path);
    const docHash = hashDocument(fileBuffer);

    const { iv, encrypted } = encryptFile(fileBuffer);
    const encryptedPath = req.file.path + '.enc';

    // Prepend IV to the encrypted data for storage
    const finalBuffer = Buffer.concat([iv, encrypted]);
    fs.writeFileSync(encryptedPath, finalBuffer);
    fs.unlinkSync(req.file.path); // remove plaintext

    const textContent = req.file.mimetype.startsWith('text/') ? fileBuffer.toString('utf8') : req.file.originalname;

    const doc = insert('documents', {
      title,
      case_number,
      category,
      classification: classification || 'confidential',
      uploaded_by: req.user.id,
      current_version: 1,
      content_hash: docHash,
      original_filename: req.file.originalname,
      mime_type: req.file.mimetype,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    insert('document_versions', {
      document_id: doc.id,
      version_number: 1,
      file_path: encryptedPath,
      content_hash: docHash,
      text_content: textContent,
      changed_by: req.user.id,
      change_description: 'Initial upload',
      file_size: finalBuffer.length,
      created_at: new Date().toISOString()
    });

    createAuditEntry({
      action: 'UPLOAD',
      userId: req.user.id,
      documentId: doc.id,
      ipAddress: req.ip,
      details: { filename: req.file.originalname, size: finalBuffer.length }
    });

    res.json({ message: 'Document uploaded successfully', documentId: doc.id });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — get document details with versions, access, and signatures
router.get('/:id', authenticate, checkDocumentAccess('view'), (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);

    const doc = findOne('documents', d => d.id === docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const versions = find('document_versions', v => v.document_id === docId)
      .map(v => ({
        id: v.id,
        version_number: v.version_number,
        content_hash: v.content_hash,
        changed_by: v.changed_by,
        change_description: v.change_description,
        file_size: v.file_size,
        text_content: v.text_content,
        created_at: v.created_at
      }))
      .sort((a, b) => b.version_number - a.version_number);

    // Join access entries with user info
    const accessEntries = find('document_access', a => a.document_id === docId).map(a => {
      const user = findOne('users', u => u.id === a.user_id);
      const granter = findOne('users', u => u.id === a.granted_by);
      return { ...a, user_name: user ? user.full_name : 'Unknown', username: user ? user.username : 'unknown', granted_by_name: granter ? granter.full_name : '-' };
    });

    // Join signatures with user info
    const signatures = find('digital_signatures', s => s.document_id === docId).map(s => {
      const user = findOne('users', u => u.id === s.signer_id);
      return { ...s, username: user ? user.username : 'unknown' };
    });

    res.json({ document: doc, versions, access: accessEntries, signatures });
  } catch (err) {
    console.error('Error getting document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/download/:version? — download a document version
router.get('/:id/download/:version?', authenticate, checkDocumentAccess('view'), (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const versionNum = req.params.version ? parseInt(req.params.version, 10) : null;

    let version;
    if (versionNum) {
      version = findOne('document_versions', v => v.document_id === docId && v.version_number === versionNum);
    } else {
      // Get latest version
      const versions = find('document_versions', v => v.document_id === docId)
        .sort((a, b) => b.version_number - a.version_number);
      version = versions.length > 0 ? versions[0] : null;
    }

    if (!version) return res.status(404).json({ error: 'Version not found' });

    const doc = findOne('documents', d => d.id === docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const encryptedData = fs.readFileSync(version.file_path);
    const iv = encryptedData.subarray(0, 16);
    const data = encryptedData.subarray(16);
    const decrypted = decryptFile(data, undefined, iv);

    createAuditEntry({
      action: 'VIEW',
      userId: req.user.id,
      documentId: docId,
      ipAddress: req.ip,
      details: { version: version.version_number }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`);
    res.setHeader('Content-Type', doc.mime_type);
    res.send(decrypted);
  } catch (err) {
    console.error('Error downloading document:', err);
    res.status(500).json({ error: 'Error reading or decrypting file' });
  }
});

// PUT /:id — upload a new version of a document
router.put('/:id', authenticate, checkDocumentAccess('edit'), upload.single('document'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const docId = parseInt(req.params.id, 10);
    const changeDesc = req.body.change_description || 'New version';

    const fileBuffer = fs.readFileSync(req.file.path);
    const docHash = hashDocument(fileBuffer);

    const { iv, encrypted } = encryptFile(fileBuffer);
    const encryptedPath = req.file.path + '.enc';
    const finalBuffer = Buffer.concat([iv, encrypted]);
    fs.writeFileSync(encryptedPath, finalBuffer);
    fs.unlinkSync(req.file.path);

    const textContent = req.file.mimetype.startsWith('text/') ? fileBuffer.toString('utf8') : req.file.originalname;

    const doc = findOne('documents', d => d.id === docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const newVersion = doc.current_version + 1;

    update('documents', d => d.id === docId, {
      current_version: newVersion,
      content_hash: docHash,
      updated_at: new Date().toISOString()
    });

    insert('document_versions', {
      document_id: docId,
      version_number: newVersion,
      file_path: encryptedPath,
      content_hash: docHash,
      text_content: textContent,
      changed_by: req.user.id,
      change_description: changeDesc,
      file_size: finalBuffer.length,
      created_at: new Date().toISOString()
    });

    createAuditEntry({
      action: 'EDIT',
      userId: req.user.id,
      documentId: docId,
      ipAddress: req.ip,
      details: { newVersion, changeDesc }
    });

    res.json({ message: 'New version uploaded', version: newVersion });
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — soft-delete a document (admin only)
router.delete('/:id', authenticate, checkRole('admin'), (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);

    const result = update('documents', d => d.id === docId, { is_deleted: true });
    if (result === 0) return res.status(404).json({ error: 'Document not found' });

    createAuditEntry({
      action: 'DELETE',
      userId: req.user.id,
      documentId: docId,
      ipAddress: req.ip,
      details: {}
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/share — share a document with another user
router.post('/:id/share', authenticate, (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { userId, accessLevel } = req.body;

    const doc = findOne('documents', d => d.id === docId && !d.is_deleted);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (req.user.role !== 'admin' && doc.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Only admin or uploader can share' });
    }

    if (!['view', 'edit', 'admin'].includes(accessLevel)) {
      return res.status(400).json({ error: 'Invalid access level' });
    }

    upsert(
      'document_access',
      a => a.document_id === docId && a.user_id === userId,
      {
        document_id: docId,
        user_id: userId,
        access_level: accessLevel,
        granted_by: req.user.id,
        granted_at: new Date().toISOString()
      }
    );

    createAuditEntry({
      action: 'SHARE',
      userId: req.user.id,
      documentId: docId,
      ipAddress: req.ip,
      details: { sharedWithUserId: userId, accessLevel }
    });

    res.json({ message: 'Access granted' });
  } catch (err) {
    console.error('Error sharing document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/sign — digitally sign a document
router.post('/:id/sign', authenticate, checkDocumentAccess('view'), (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);

    const doc = findOne('documents', d => d.id === docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const version = findOne('document_versions', v => v.document_id === docId && v.version_number === doc.current_version);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const user = findOne('users', u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const signature = createSignature(doc.content_hash, user.password_hash);

    insert('digital_signatures', {
      document_id: docId,
      version_id: version.id,
      signer_id: req.user.id,
      signature_hash: signature,
      created_at: new Date().toISOString()
    });

    createAuditEntry({
      action: 'SIGN',
      userId: req.user.id,
      documentId: docId,
      ipAddress: req.ip,
      details: { version: doc.current_version }
    });

    res.json({ message: 'Document signed successfully', signature });
  } catch (err) {
    console.error('Error signing document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/versions — list all versions of a document
router.get('/:id/versions', authenticate, checkDocumentAccess('view'), (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);

    const versions = find('document_versions', v => v.document_id === docId)
      .map(v => ({
        id: v.id,
        version_number: v.version_number,
        content_hash: v.content_hash,
        changed_by: v.changed_by,
        change_description: v.change_description,
        file_size: v.file_size,
        created_at: v.created_at
      }))
      .sort((a, b) => b.version_number - a.version_number);

    res.json({ versions });
  } catch (err) {
    console.error('Error listing versions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
