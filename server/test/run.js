import fs from 'node:fs';
import app from '../index.js';

const server = app.listen(0, async () => {
  const port = server.address().port;
  process.env.VALIDATION_API_URL = `http://localhost:${port}/mock/validate`;
  try {
    const buf = fs.readFileSync(new URL('./exemplo.txt', import.meta.url));
    const form = new FormData();
    form.append('file', new Blob([buf]), 'exemplo.txt');
    const resp = await fetch(`http://localhost:${port}/api/validate`, { method: 'POST', body: form });
    const data = await resp.json();
    console.log('HTTP', resp.status);
    console.log('Resumo:', data.summary, '| erros de arquivo:', data.fileErrors.length);
    for (const r of data.records) {
      console.log(`Linha ${r.line} [${r.status}]`, r.errors.map((e) => e.code).join(', ') || '-');
    }
  } finally {
    server.close();
  }
});
