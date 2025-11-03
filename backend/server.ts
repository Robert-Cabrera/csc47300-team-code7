import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: './backend/keys.env' });

const app = express();
const PORT = 3000;

app.use(express.json());

function resolveRouteModule(name: string) {
  // Candidate locations (in order):
  // 1) backend/dist/routes/<name>.js (when running compiled server)
  // 2) backend/dist/../dist/routes/<name>.js (when running source server and compiled routes exist)
  // 3) backend/../routes/<name>.js (source route)
  const candidates = [
    path.join(__dirname, 'routes', `${name}.js`),
    path.join(__dirname, '..', 'dist', 'routes', `${name}.js`),
    path.join(__dirname, '..', 'routes', `${name}.js`)
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return require(c);
  }

  // fallback to direct require (will throw)
  return require(`./routes/${name}`);
}

// Import routes using resolver
const authRoutes = resolveRouteModule('auth');
const crashCourseRoutes = resolveRouteModule('crashCourse');
const summaryRoutes = resolveRouteModule('summary');
const practiceTestRoutes = resolveRouteModule('practiceTest');

app.use('/api', authRoutes);
app.use('/api/crash-course', crashCourseRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/practice-test', practiceTestRoutes);

// Serve favicon specifically BEFORE static files
function findFrontendDir() {
  const candidates = [
    path.join(__dirname, '..', 'frontend'),        // when running source server
    path.join(__dirname, '..', '..', 'frontend'),  // when running compiled server (backend/dist)
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return path.join(__dirname, '..', 'frontend');
}

const frontendDir = findFrontendDir();
const faviconPath = path.join(frontendDir, 'assets', 'favicon.ico');
app.get('/favicon.ico', (req, res) => {
  res.sendFile(faviconPath, (err) => {
    if (err) res.status(404).send('Favicon not found');
  });
});

app.use(express.static(frontendDir));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/index.html`);
});

export default app;
