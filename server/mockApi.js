import { Router } from 'express';
import { validateRecordLocal, findDuplicates } from './validators.js';

// API de validação SIMULADA.
// Contrato (troque pela API real mantendo o mesmo formato):
//   POST /mock/validate
//   body:  { records: [{ line, fields: { nossoNumero, seuNumero, sacadoNome, ... } }] }
//   resp:  { results: [{ line, errors: [{ field, code, message, suggestion }] }] }

export const mockApi = Router();

mockApi.post('/validate', (req, res) => {
  const records = req.body?.records;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Corpo inválido: esperado { records: [...] }' });
  }
  const dups = findDuplicates(records);
  const results = records.map((r) => ({
    line: r.line,
    errors: [...validateRecordLocal(r.fields), ...(dups.get(r.line) || [])]
  }));
  res.json({ results });
});
