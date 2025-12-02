import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: './backend/keys.env' });

const app = express();
const PORT = 3000;

// Increase payload size limit for profile pictures (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


// UTILITY FUNCTIONS
function resolveRouteModule(name: string) {
  const candidates = [
    path.join(__dirname, 'routes', `${name}.js`),
    path.join(__dirname, '..', 'dist', 'routes', `${name}.js`),
    path.join(__dirname, '..', 'routes', `${name}.js`),
  ];

  const load = (p: string) => {
    const mod = require(p);
    const router = mod?.default ?? mod?.router ?? mod;
    // Express Router is a function (middleware) or has .use/.handle
    if (typeof router === 'function' || (router && typeof router.use === 'function')) {
      return router;
    }
    throw new TypeError(`Route "${name}" at "${p}" did not export an Express router/middleware`);
  };

  for (const c of candidates) {
    if (fs.existsSync(c)) return load(c);
  }

  // Fallback to relative require (may throw if missing)
  return load(`./routes/${name}`);
}

function findFrontendDir() {
  const candidates = [
    path.join(__dirname, '..', 'frontend'),        // when running source server
    path.join(__dirname, '..', '..', 'frontend'),  // when running compiled server (backend/dist)
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return path.join(__dirname, '..', 'frontend');
}

function findReactDir() {
  const candidates = [
    path.join(__dirname, '..', 'react', 'dist'),        // when running from backend/dist
    path.join(__dirname, '..', '..', 'react', 'dist'),  // edge case
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}


// ! CHECKMARK 1.6: Import routes 
// Import routes using resolver (each route should `export default router`)
const authRoutes = resolveRouteModule('auth');
const crashCourseRoutes = resolveRouteModule('crashCourse');
const summaryRoutes = resolveRouteModule('summary');
const practiceTestRoutesModule = resolveRouteModule('practiceTest');
const practiceTestRoutes = practiceTestRoutesModule.default || practiceTestRoutesModule;
const submitQuestionRoutes = resolveRouteModule('submitQuestion');

// ! CHECKMARK 1.6: Use /api prefix for all API routes
app.use('/api', authRoutes);
app.use('/api/crash-course', crashCourseRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/practice-test', practiceTestRoutes);
app.use('/api', submitQuestionRoutes);

// Serve favicon specifically BEFORE static files
const frontendDir = findFrontendDir();
const faviconPath = path.join(frontendDir, 'assets', 'favicon.ico');

app.get('/favicon.ico', (req, res) => {
  res.sendFile(faviconPath, (err) => {
    if (err) res.status(404).send('Favicon not found');
  });
});

// Serve React app at /react route (this is to serve the React at the same time as the Node.js server)
const reactDir = findReactDir();
if (reactDir) {
  app.use('/react/assets', express.static(path.join(reactDir, 'assets')));
  app.get(/^\/react($|\/)/u, (req, res) => {
    res.sendFile(path.join(reactDir, 'index.html'));
  });
  console.log('React app running!');
} else {
  console.warn('React build not found at react/dist');
}

// ! CHECKMARK 1.6: Serve frontend static files and index.html using express.static
app.use(express.static(frontendDir));

// ! CHECKMARK 1.6: We start the Nodejs server here usually on port 3000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/index.html`);
});

export default app;
