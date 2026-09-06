/**
 * Database Layer - Pure JavaScript JSON-based storage
 * Uses in-memory data structures with JSON file persistence
 * No native dependencies required
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

// Auto-increment ID counters
let counters = {
  users: 0,
  documents: 0,
  document_versions: 0,
  document_access: 0,
  audit_log: 0,
  digital_signatures: 0
};

// In-memory database
let db = {
  users: [],
  documents: [],
  document_versions: [],
  document_access: [],
  audit_log: [],
  digital_signatures: []
};

/**
 * Save database to disk
 */
function saveDB() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify({ counters, db }, null, 2));
}

/**
 * Load database from disk
 */
function loadDB() {
  if (fs.existsSync(DB_PATH)) {
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    counters = raw.counters;
    db = raw.db;
    return true;
  }
  return false;
}

/**
 * Insert a record into a table, auto-incrementing the id
 */
function insert(table, record) {
  counters[table]++;
  const newRecord = { id: counters[table], ...record };
  db[table].push(newRecord);
  saveDB();
  return newRecord;
}

/**
 * Find records by filter function
 */
function find(table, filterFn) {
  return db[table].filter(filterFn);
}

/**
 * Find a single record
 */
function findOne(table, filterFn) {
  return db[table].find(filterFn);
}

/**
 * Update records matching a filter
 */
function update(table, filterFn, updateObj) {
  let updated = 0;
  db[table] = db[table].map(record => {
    if (filterFn(record)) {
      updated++;
      return { ...record, ...updateObj };
    }
    return record;
  });
  if (updated > 0) saveDB();
  return updated;
}

/**
 * Upsert - insert or update based on a unique key check
 */
function upsert(table, matchFn, record) {
  const existing = findOne(table, matchFn);
  if (existing) {
    update(table, matchFn, record);
    return { ...existing, ...record };
  } else {
    return insert(table, record);
  }
}

/**
 * Get all records from a table
 */
function getAll(table) {
  return db[table];
}

/**
 * Full-text search across document versions
 */
function searchDocuments(query, accessibleDocIds) {
  const lowerQuery = query.toLowerCase();
  const results = [];

  db.document_versions.forEach(version => {
    if (!accessibleDocIds.includes(version.document_id)) return;

    const textContent = (version.text_content || '').toLowerCase();
    const doc = findOne('documents', d => d.id === version.document_id);
    if (!doc || doc.is_deleted) return;

    const title = (doc.title || '').toLowerCase();
    const caseNum = (doc.case_number || '').toLowerCase();

    if (textContent.includes(lowerQuery) || title.includes(lowerQuery) || caseNum.includes(lowerQuery)) {
      // Create a snippet around the match
      const idx = textContent.indexOf(lowerQuery);
      let snippet = '';
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(textContent.length, idx + lowerQuery.length + 40);
        snippet = (start > 0 ? '...' : '') +
          version.text_content.substring(start, idx) +
          '<b>' + version.text_content.substring(idx, idx + query.length) + '</b>' +
          version.text_content.substring(idx + query.length, end) +
          (end < textContent.length ? '...' : '');
      }

      results.push({
        version_id: version.id,
        document_id: version.document_id,
        title: doc.title,
        case_number: doc.case_number,
        category: doc.category,
        classification: doc.classification,
        snippet: snippet || version.text_content.substring(0, 100)
      });
    }
  });

  // Deduplicate by document_id, keep latest version match
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.document_id)) return false;
    seen.add(r.document_id);
    return true;
  });
}

/**
 * Hash a document buffer
 */
function hashDocument(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Seed the database with demo data
 */
function seedDatabase() {
  console.log('  Seeding database with demo data...');

  // Create users
  const admin = insert('users', {
    username: 'admin',
    password_hash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    full_name: 'Admin',
    department: 'System Administration',
    created_at: new Date().toISOString()
  });

  const investigator = insert('users', {
    username: 'investigator',
    password_hash: bcrypt.hashSync('invest123', 10),
    role: 'investigator',
    full_name: 'Det. Rajesh Kumar',
    department: 'Crime Investigation Unit',
    created_at: new Date().toISOString()
  });

  const officer = insert('users', {
    username: 'officer',
    password_hash: bcrypt.hashSync('officer123', 10),
    role: 'officer',
    full_name: 'SI Priya Sharma',
    department: 'Central Police Station',
    created_at: new Date().toISOString()
  });

  const legal = insert('users', {
    username: 'legal',
    password_hash: bcrypt.hashSync('legal123', 10),
    role: 'legal',
    full_name: 'Adv. Amit Patel',
    department: 'District Court',
    created_at: new Date().toISOString()
  });

  // Document 1: FIR
  const fir_text = 'FIRST INFORMATION REPORT (FIR)\nCase Number: 2024-CR-0042\nDate: 15th March 2024\n\nComplainant: Mr. Suresh Verma, age 45, residing at 12 MG Road, Bangalore.\n\nDetails: The complainant reports that on the night of 14th March 2024, at approximately 11:30 PM, an unknown suspect was spotted fleeing from the premises of Verma Electronics store at MG Road. The store was found broken into with goods worth approximately Rs. 5,00,000 stolen including laptops, mobile phones, and cash from the register. CCTV footage shows a blue van (registration partially visible: KA-01-XX-XXXX) near the premises. Witness Ramesh (security guard) confirms seeing a suspicious individual near the back entrance at 10:45 PM.\n\nAction Taken: Case registered under Sections 380, 457 IPC. Investigation team dispatched to the scene. Forensic team alerted for evidence collection.';

  const fir_hash = hashDocument(Buffer.from(fir_text));
  const doc1 = insert('documents', {
    title: 'FIR #2024-CR-0042',
    case_number: '2024-CR-0042',
    category: 'fir',
    classification: 'confidential',
    uploaded_by: investigator.id,
    current_version: 1,
    content_hash: fir_hash,
    original_filename: 'fir_0042.txt',
    mime_type: 'text/plain',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  insert('document_versions', {
    document_id: doc1.id,
    version_number: 1,
    file_path: 'seed_fir',
    content_hash: fir_hash,
    text_content: fir_text,
    changed_by: investigator.id,
    change_description: 'Initial FIR filing',
    file_size: Buffer.from(fir_text).length,
    created_at: new Date().toISOString()
  });

  // Document 2: Witness Statement
  const witness_text = 'WITNESS STATEMENT\nCase Number: 2024-CR-0042\nWitness: Ramesh Kumar (Security Guard)\nDate: 16th March 2024\n\nI, Ramesh Kumar, age 32, employed as a security guard at MG Road Commercial Complex, hereby state:\n\nOn the night of 14th March 2024, I was on duty at the complex from 8:00 PM. At approximately 10:00 PM, I noticed a blue van parked near the service entrance of Block B. The van had tinted windows and I could not see inside clearly. At around 10:45 PM, I saw a tall individual (approximately 5\'10", wearing dark clothing and a cap) walking quickly from the direction of Verma Electronics towards the blue van. The individual was carrying a large bag. I called out but the individual quickened their pace. The blue van departed shortly after at high speed heading towards the Ring Road.\n\nI confirm this statement is true to the best of my knowledge.\n\nSigned: Ramesh Kumar\nWitnessed by: SI Priya Sharma, Badge #4521';

  const witness_hash = hashDocument(Buffer.from(witness_text));
  const doc2 = insert('documents', {
    title: 'Witness Statement - Ramesh Kumar',
    case_number: '2024-CR-0042',
    category: 'statement',
    classification: 'restricted',
    uploaded_by: investigator.id,
    current_version: 1,
    content_hash: witness_hash,
    original_filename: 'statement_ramesh.txt',
    mime_type: 'text/plain',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  insert('document_versions', {
    document_id: doc2.id,
    version_number: 1,
    file_path: 'seed_witness',
    content_hash: witness_hash,
    text_content: witness_text,
    changed_by: investigator.id,
    change_description: 'Initial witness statement recording',
    file_size: Buffer.from(witness_text).length,
    created_at: new Date().toISOString()
  });

  // Document 3: Court Order
  const court_text = 'ORDER OF THE DISTRICT COURT\nCase Number: 2024-CR-0042\nDate: 18th March 2024\n\nBefore: Hon\'ble Magistrate R.K. Joshi\n\nIn the matter of: State vs Unknown (FIR No. 2024-CR-0042)\n\nORDER: Upon reviewing the application filed by the Investigation Officer (Det. Rajesh Kumar, Crime Investigation Unit) and the supporting evidence including CCTV footage analysis and witness statements, this Court is satisfied that there exists reasonable grounds to believe that evidence pertinent to the case may be found at the premises located at 42 Park Street, Koramangala, Bangalore.\n\nAccordingly, a SEARCH WARRANT is hereby granted under Section 93 CrPC, authorizing the Investigation Officer and team to conduct a search of the aforementioned premises between 6:00 AM and 8:00 PM on any day within the next seven (7) days from the date of this order.\n\nThe search must be conducted in the presence of two independent witnesses. All seized items must be documented and sealed per procedure.\n\nSigned: Magistrate R.K. Joshi\nDistrict Court, Bangalore';

  const court_hash = hashDocument(Buffer.from(court_text));
  const doc3 = insert('documents', {
    title: 'Search Warrant Order',
    case_number: '2024-CR-0042',
    category: 'court_order',
    classification: 'confidential',
    uploaded_by: legal.id,
    current_version: 1,
    content_hash: court_hash,
    original_filename: 'warrant_order.txt',
    mime_type: 'text/plain',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  insert('document_versions', {
    document_id: doc3.id,
    version_number: 1,
    file_path: 'seed_court',
    content_hash: court_hash,
    text_content: court_text,
    changed_by: legal.id,
    change_description: 'Court order issued',
    file_size: Buffer.from(court_text).length,
    created_at: new Date().toISOString()
  });

  // Access grants
  insert('document_access', {
    document_id: doc1.id, user_id: officer.id, access_level: 'view',
    granted_by: investigator.id, granted_at: new Date().toISOString()
  });
  insert('document_access', {
    document_id: doc1.id, user_id: legal.id, access_level: 'view',
    granted_by: investigator.id, granted_at: new Date().toISOString()
  });
  insert('document_access', {
    document_id: doc1.id, user_id: investigator.id, access_level: 'edit',
    granted_by: investigator.id, granted_at: new Date().toISOString()
  });
  insert('document_access', {
    document_id: doc2.id, user_id: officer.id, access_level: 'view',
    granted_by: investigator.id, granted_at: new Date().toISOString()
  });
  insert('document_access', {
    document_id: doc2.id, user_id: investigator.id, access_level: 'edit',
    granted_by: investigator.id, granted_at: new Date().toISOString()
  });

  // Seed audit log entries (hash-chained)
  const { createAuditEntry } = require('../services/audit');
  createAuditEntry({ action: 'UPLOAD', userId: investigator.id, documentId: doc1.id, ipAddress: '127.0.0.1', details: { filename: 'fir_0042.txt' } });
  createAuditEntry({ action: 'UPLOAD', userId: investigator.id, documentId: doc2.id, ipAddress: '127.0.0.1', details: { filename: 'statement_ramesh.txt' } });
  createAuditEntry({ action: 'UPLOAD', userId: legal.id, documentId: doc3.id, ipAddress: '127.0.0.1', details: { filename: 'warrant_order.txt' } });

  console.log('  ✓ Seeded 4 users, 3 documents, audit entries');
}

/**
 * Initialize the database
 */
function initializeDatabase() {
  console.log('Initializing database...');
  const loaded = loadDB();
  if (loaded) {
    console.log('  ✓ Loaded existing database');
  } else {
    console.log('  Creating new database...');
    seedDatabase();
  }
  console.log(`  Database ready: ${db.users.length} users, ${db.documents.length} documents, ${db.audit_log.length} audit entries`);
}

module.exports = {
  initializeDatabase,
  insert,
  find,
  findOne,
  update,
  upsert,
  getAll,
  searchDocuments,
  hashDocument,
  saveDB,
  get db() { return db; },
  get counters() { return counters; }
};
