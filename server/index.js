const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { initializeDatabase } = require('./db/init');
const authRoutes = require('./routes/auth');
const documentsRoutes = require('./routes/documents');
const auditRoutes = require('./routes/audit');
const searchRoutes = require('./routes/search');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database (no return value needed — routes import db functions directly)
initializeDatabase();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static serving (though files are encrypted, just per instructions)
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', usersRoutes);

// --- Production: Serve React frontend ---
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  console.log('Production mode: Serving React build from client/dist');
  app.use(express.static(clientBuildPath));

  // SPA catch-all: any non-API route serves index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // 404 handler (development mode — frontend runs on separate Vite server)
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`SecureVault Server running on port ${PORT}`);
  if (fs.existsSync(clientBuildPath)) {
    console.log(`Open http://localhost:${PORT} in your browser`);
  } else {
    console.log(`API ready. Start frontend with: cd client && npm run dev`);
  }
});
