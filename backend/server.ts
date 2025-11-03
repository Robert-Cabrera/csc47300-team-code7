import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: './backend/keys.env' });

const app = express();
const PORT = 3000;

app.use(express.json());

/**
 * Resolve a route module and always return the actual Express router/middleware.
 * Supports:
 *  - CommonJS: module.exports = router
 *  - ESM transpiled to CJS: exports.default = router
 *  - modules that export { router }
 */
function resolveRouteModule(name: string) {
  // 1) backend/dist/routes/<name>.js (compiled)
  // 2) backend/dist/../dist/routes/<name>.js (edge case if server compiled from elsewhere)
  // 3) backend/../routes/<name>.js (source)
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

// Import routes using resolver (each route should `export default router`)
const authRoutes = resolveRouteModule('auth');
const crashCourseRoutes = resolveRouteModule('crashCourse');
const summaryRoutes = resolveRouteModule('summary');
const practiceTestRoutesModule = resolveRouteModule('practiceTest');
const practiceTestRoutes = practiceTestRoutesModule.default || practiceTestRoutesModule;

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
