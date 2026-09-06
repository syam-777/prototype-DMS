const crypto = require('crypto');
const { insert, getAll } = require('../db/init');

/**
 * Create a hash-chained audit log entry.
 * No db parameter needed — imports db functions directly.
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
 * No db parameter needed — imports db functions directly.
 */
function verifyAuditChain() {
  const entries = getAll('audit_log').sort((a, b) => a.id - b.id);
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
