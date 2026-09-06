# SecureVault — Secure Digital Document Management System

A secure document-management system for police, courts, and investigators to digitise and centralise legal/investigation documents with role-based access, tamper-evident audit logging, versioning, encryption, and full-text search.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- 🔐 **Role-Based Access Control** — 4 roles: Admin, Investigator, Officer, Legal
- 📄 **Document Versioning** — Full version history with change tracking
- 🔍 **Full-Text Search** — Search across document content instantly
- 🔗 **Tamper-Evident Audit Log** — Hash-chained (SHA-256) immutable record of every action
- 🔒 **AES-256 Encryption** — All files encrypted at rest
- ✍️ **Digital Signatures** — HMAC-SHA256 document signing
- 📊 **Professional Dashboard** — Stats, recent activity, quick actions
- 🏷️ **Classification Levels** — Public, Confidential, Restricted, Top Secret

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | JSON file storage (pure JS) |
| Search | In-memory full-text search |
| Auth | JWT + bcrypt |
| Encryption | AES-256-CBC + SHA-256 |

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher

### Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/secure-doc-manager.git
cd secure-doc-manager

# Install all dependencies
npm run install-all

# Start both servers (development)
npm run dev
```

Or manually:

```bash
# Terminal 1 — Backend (port 5000)
cd server
npm install
npm start

# Terminal 2 — Frontend (port 5173)
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Production Build & Run

```bash
# Build frontend + start server (serves everything from port 5000)
npm run build
npm start
```

Open **http://localhost:5000** in your browser.

## Demo Accounts

| Username | Password | Role | Access Level |
|----------|----------|------|-------------|
| admin | admin123 | Admin | Full system access |
| investigator | invest123 | Investigator | Upload, edit, share documents |
| officer | officer123 | Officer | View assigned documents only |
| legal | legal123 | Legal | View shared legal documents |

## Project Structure

```
secure-doc-manager/
├── server/                 # Express backend
│   ├── db/init.js          # Database layer (JSON storage + seeding)
│   ├── services/
│   │   ├── audit.js        # Hash-chained audit logging
│   │   └── crypto.js       # AES-256, SHA-256, HMAC
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication
│   │   └── rbac.js         # Role-based access control
│   ├── routes/
│   │   ├── auth.js         # Login, profile
│   │   ├── documents.js    # CRUD, versioning, sharing, signing
│   │   ├── audit.js        # Audit log, chain verification
│   │   ├── search.js       # Full-text search
│   │   └── users.js        # User listing
│   └── index.js            # Server entrypoint
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # 7 pages
│       ├── components/     # Shared UI components
│       ├── contexts/       # Auth context
│       └── utils/          # API client
├── package.json            # Root scripts
└── README.md
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/login | User login | ❌ |
| GET | /api/auth/me | Current user profile | ✅ |
| GET | /api/documents | List accessible documents | ✅ |
| POST | /api/documents | Upload new document | ✅ Admin/Investigator |
| GET | /api/documents/:id | Document details + versions | ✅ |
| PUT | /api/documents/:id | Upload new version | ✅ Edit access |
| DELETE | /api/documents/:id | Soft delete | ✅ Admin |
| POST | /api/documents/:id/share | Grant access | ✅ Owner/Admin |
| POST | /api/documents/:id/sign | Digital signature | ✅ |
| GET | /api/search?q=term | Full-text search | ✅ |
| GET | /api/audit | Audit log entries | ✅ |
| GET | /api/audit/verify | Verify chain integrity | ✅ Admin |
| GET | /api/users | List users | ✅ |

## Security Features

### Hash-Chained Audit Log
Every action creates an audit entry where:
```
entry_hash = SHA256(prev_hash | action | userId | documentId | timestamp | details)
```
If any entry is tampered with, the chain verification will detect it.

### AES-256 Encryption at Rest
All uploaded files are encrypted with AES-256-CBC. The IV is prepended to the encrypted file. Decryption happens on-the-fly when downloading.

### Role-Based Access Control
Access is enforced at route level, document level, and UI level.

## Deployment

### Deploy to Render.com (Free)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Deploy!

### Deploy to Railway.app

1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. It auto-detects and deploys

## License

MIT License — free to use, modify, and distribute.
