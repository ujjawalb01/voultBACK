const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// =========================================================
// REPLACEABLE: App Configuration
// =========================================================

const app = express();

app.use(cors()); // Allows all origins by default. Configure for production.
app.use(express.json()); // Body parser

// Request Logger
app.use((req, res, next) => {

  next();
});

// Mount Routes
app.use('/api/user', userRoutes);
app.use('/api/file', fileRoutes); // Changed to singular to match frontend: /api/file/upload

// Make uploads folder static and force inline disposition so browsers preview instead of download
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, path, stat) => {
        res.set('Content-Disposition', 'inline');
    }
}));

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
