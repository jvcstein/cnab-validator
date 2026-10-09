import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parseCnab } from './parser.js';
import { validateHeader, validateBeneficiary } from './headerValidation.js';
import { mockApi } from './mockApi.js';

const PORT = process.env.PORT || 3001;
// URL da API de validação. Por padrão aponta para a API simulada deste mesmo servidor.
const validationApiUrl = () => process.env.VALIDATION_API_URL || `http://localhost:${PORT}/mock/validate`;
const validationApiToken = () => process.env.VALIDATION_API_TOKEN || '';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/mock', mockApi);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const BATCH_SIZE = 500;

async function callValidationApi(records) {
  const results = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const resp = await fetch(validationApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(validationApiToken() ? { Authorization: `Bearer ${validationApiToken()}` } : {})
      },
      body: JSON.stringify({ records: batch })
    });
    if (!resp.ok) throw new Error(`API de validação respondeu ${resp.status}`);
    const data = await resp.json();
    results.push(...data.results);
  }
  return results;
}

app.post('/api/validate', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie o arquivo no campo "file".' });

  const parsed = parseCnab(req.file.buffer);

  // Validações prévias (locais): header no layout Itaú e dados da nossa empresa (fundo).
  const headerResult = parsed.header ? validateHeader(parsed.header) : null;
  const headerFund = headerResult?._fund || null;

  let apiResults = [];
  try {
    if (parsed.records.length > 0) apiResults = await callValidationApi(parsed.records);
  } catch (e) {
    return res.status(502).json({ error: `Falha ao consultar a API de validação: ${e.message}` });
  }

  const byLine = new Map(apiResults.map((r) => [r.line, r.errors || []]));
  const records = parsed.records.map((r) => {
    const errors = [...validateBeneficiary(r.fields, headerFund), ...(byLine.get(r.line) || [])];
    return { line: r.line, ...r.fields, status: errors.length ? 'error' : 'ok', errors };
  });

  const invalid = records.filter((r) => r.status === 'error').length;
  const header = headerResult ? (({ _fund, ...rest }) => rest)(headerResult) : null;
  res.json({
    fileName: req.file.originalname,
    fileErrors: parsed.fileErrors,
    header,
    summary: { total: records.length, valid: records.length - invalid, invalid },
    records
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Em produção, o próprio backend entrega a tela (client/dist), então publica-se um serviço só.
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/|mock\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

export default app;

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
}
