/* ============================================================
   Caselli's Pets - Test de Bienestar Articular
   Servidor local (Node + Express) que guarda cada test realizado
   en un archivo JSON y expone un panel de administración.
   ============================================================ */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'registros.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
const db = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
}) : null;

/* ---------- config (clave del panel de admin) ---------- */
function loadConfig(){
  try{
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }catch(e){
    return {};
  }
}
let config = loadConfig();
// En hosting en la nube conviene definir la variable de entorno ADMIN_PASSWORD
// (en vez de editar config.json) para no subir la clave al repositorio.
config.adminPassword = process.env.ADMIN_PASSWORD || config.adminPassword || 'cambiar-esta-clave';

/* ---------- almacenamiento en JSON ---------- */
function ensureDataFile(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}
function readRegistros(){
  ensureDataFile();
  try{
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  }catch(e){
    console.error('No se pudo leer registros.json, se reinicia vacío.', e);
    return [];
  }
}
function writeRegistros(list){
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

async function initDatabase(){
  if(!db) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id UUID PRIMARY KEY,
      fecha TIMESTAMPTZ NOT NULL,
      contenido JSONB NOT NULL
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS registros_fecha_idx ON registros (fecha DESC)');
}

async function listRegistros(){
  if(!db) return readRegistros();
  const result = await db.query('SELECT contenido FROM registros ORDER BY fecha DESC');
  return result.rows.map(row => row.contenido);
}

async function saveRegistro(registro){
  if(!db){
    const list = readRegistros();
    list.push(registro);
    writeRegistros(list);
    return;
  }
  await db.query(
    'INSERT INTO registros (id, fecha, contenido) VALUES ($1, $2, $3::jsonb)',
    [registro.id, registro.fecha, JSON.stringify(registro)]
  );
}

async function removeRegistro(id){
  if(!db){
    const list = readRegistros();
    const next = list.filter(r => r.id !== id);
    writeRegistros(next);
    return list.length - next.length;
  }
  const result = await db.query('DELETE FROM registros WHERE id = $1', [id]);
  return result.rowCount;
}

/* ---------- sesiones de admin (tokens en memoria) ---------- */
const sessions = new Map(); // token -> expiry timestamp
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 horas

function newToken(){
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  return token;
}
function checkToken(token){
  if(!token) return false;
  const exp = sessions.get(token);
  if(!exp) return false;
  if(Date.now() > exp){ sessions.delete(token); return false; }
  return true;
}
function requireAuth(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if(!checkToken(token)) return res.status(401).json({ error: 'No autorizado' });
  next();
}

/* ---------- middleware ---------- */
app.use(express.json({ limit: '1mb' }));
// Mientras se sigue ajustando el diseño conviene que el navegador nunca
// use una copia vieja en caché de index.html, las imágenes, etc. — así
// cada recarga trae siempre la última versión real del archivo.
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => { res.set('Cache-Control', 'no-store'); },
}));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'caselli-pets-bienestar',
    storage: db ? 'postgresql' : 'json-local',
  });
});

/* ---------- API pública: guardar un test ---------- */
app.post('/api/registros', async (req, res, next) => {
  const body = req.body || {};
  const registro = {
    id: crypto.randomUUID(),
    fecha: body.fecha || new Date().toISOString(),
    dog: {
      name: String(body.dog?.name || '').slice(0, 60),
      age: String(body.dog?.age || '').slice(0, 20),
      breed: String(body.dog?.breed || '').slice(0, 60),
      weight: String(body.dog?.weight || '').slice(0, 20),
    },
    owner: {
      name: String(body.owner?.name || '').slice(0, 80),
      contact: String(body.owner?.contact || '').slice(0, 120),
      country: String(body.owner?.country || 'PE').slice(0, 4),
    },
    alarms: Array.isArray(body.alarms) ? body.alarms : [],
    scores: body.scores || {},
    total: Number(body.total) || 0,
    maxScore: Number(body.maxScore) || 24,
    categoryMaxScore: Number(body.categoryMaxScore) || 6,
    questionCount: Number(body.questionCount) || 8,
    nivel: String(body.nivel || '').slice(0, 80),
  };
  try{
    await saveRegistro(registro);
    res.status(201).json({ ok: true, id: registro.id });
  }catch(error){
    next(error);
  }
});

/* ---------- API de administración ---------- */
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if(password && password === config.adminPassword){
    return res.json({ token: newToken() });
  }
  res.status(401).json({ error: 'Clave incorrecta' });
});

app.get('/api/registros', requireAuth, async (_req, res, next) => {
  try{
    const list = await listRegistros();
    list.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    res.json(list);
  }catch(error){
    next(error);
  }
});

app.delete('/api/registros/:id', requireAuth, async (req, res, next) => {
  try{
    const removed = await removeRegistro(req.params.id);
    res.json({ ok: true, removed });
  }catch(error){
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'No se pudo completar la operación' });
});

async function start(){
  await initDatabase();
  app.listen(PORT, () => {
    console.log('');
    console.log('  Caselli\'s Pets - Test de Bienestar Articular');
    console.log('  ------------------------------------------------');
    console.log(`  Test:        http://localhost:${PORT}`);
    console.log(`  Panel admin: http://localhost:${PORT}/admin.html`);
    console.log('  Clave admin: configurada mediante ADMIN_PASSWORD o config.json local');
    console.log(`  Datos:       ${db ? 'PostgreSQL persistente' : 'archivo JSON local'}`);
    console.log('');
  });
}

start().catch(error => {
  console.error('No se pudo iniciar la aplicación:', error);
  process.exit(1);
});
