const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { insert, getAll } = require('../db/init');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

/**
 * Create a hash-chained audit log entry.
 */
function createAuditEntry({ action, userId, documentId, ipAddress, details }) {
  const allEntries = getAll('audit_log');
  const lastEntry = allEntries.length > 0 ? allEntries[allEntries.length - 1] : null;
  const prevHash = lastEntry ? lastEntry.entry_hash : 'GENESIS';

  const timestamp = new Date().toISOString();
  const detailsStr = details ? JSON.stringify(details) : '{}';
  const dataString = `${prevHash}|${action}|${userId}|${documentId || ''}|${timestamp}|${detailsStr}`;

  const entryHash = crypto.createHash('sha256').update(dataString).digest('hex');

  const record = insert('audit_log', {
    prev_hash: prevHash,
    action,
    user_id: userId,
    document_id: documentId || null,
    ip_address: ipAddress,
    details: detailsStr,
    timestamp,
    entry_hash: entryHash
  });

  return record.id;
}

/**
 * Verify the integrity of the audit chain.
 * Reads DIRECTLY from the database file on disk (not memory)
 * so it can detect if someone tampered with the file.
 */
function verifyAuditChain() {
  // Read directly from disk to detect file-level tampering
  let entries;
  try {
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    entries = (raw.db.audit_log || []).sort((a, b) => a.id - b.id);
  } catch (err) {
    return { valid: false, entries: 0, brokenAt: null, error: 'Cannot read database file' };
  }

  let expectedPrevHash = 'GENESIS';

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (entry.prev_hash !== expectedPrevHash) {
      return { valid: false, entries: entries.length, brokenAt: entry.id };
    }

    const dataString = `${entry.prev_hash}|${entry.action}|${entry.user_id}|${entry.document_id || ''}|${entry.timestamp}|${entry.details}`;
    const computedHash = crypto.createHash('sha256').update(dataString).digest('hex');

    if (computedHash !== entry.entry_hash) {
      return { valid: false, entries: entries.length, brokenAt: entry.id };
    }

    expectedPrevHash = entry.entry_hash;
  }

  return { valid: true, entries: entries.length, brokenAt: null };
}

module.exports = {
  createAuditEntry,
  verifyAuditChain
};
