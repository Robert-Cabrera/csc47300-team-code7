const express = require('express');
require('dotenv').config({ path: './backend/keys.env' });

const app = express();
const PORT = 3000;

const path = require('path');
app.use(express.json());

// Import route modules
const authRoutes = require('./routes/auth');
const crashCourseRoutes = require('./routes/crashCourse');
const summaryRoutes = require('./routes/summary');

// Use routes
app.use('/api', authRoutes);
app.use('/api/crash-course', crashCourseRoutes);
app.use('/api/summary', summaryRoutes);

// Serve favicon specifically BEFORE static files
const faviconPath = path.join(__dirname, '..', 'frontend', 'assets', 'favicon.ico');
app.get('/favicon.ico', (req, res) => {
    res.sendFile(faviconPath, (err) => {
        if (err) {
            res.status(404).send('Favicon not found');
        }
    });
});

// Serve /data/* from backend/data_objects (makes users.json fetchable in browser)
app.use('/data', express.static(path.join(__dirname, 'data_objects')));

// Serve everything from frontend folder so all folders are accessible
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/index.html`);
});
