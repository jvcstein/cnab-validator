import { LAYOUT } from './layout.js';

const slice = (line, { start, end }) => line.slice(start - 1, end);

const readFields = (line, defs) => {
  const fields = {};
  for (const [key, pos] of Object.entries(defs)) fields[key] = slice(line, pos).trim();
  return fields;
};

export function parseCnab(buffer, layout = LAYOUT) {
  // CNAB costuma ser ASCII/latin1
  const text = buffer.toString('latin1');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);

  const result = { header: null, records: [], trailer: null, fileErrors: [], totalLines: lines.length, lineLength: 0 };

  if (lines.length === 0) {
    result.fileErrors.push({ code: 'ARQUIVO_VAZIO', message: 'O arquivo está vazio.', suggestion: 'Envie um arquivo CNAB válido com header, detalhes e trailer.' });
    return result;
  }

  const firstLen = lines[0].length;
  result.lineLength = firstLen;
  if (!layout.lineLengths.includes(firstLen)) {
    result.fileErrors.push({
      code: 'TAMANHO_LINHA',
      message: `As linhas têm ${firstLen} caracteres; o esperado é ${layout.lineLengths.join(' ou ')}.`,
      suggestion: 'Verifique se o arquivo foi gerado no layout CNAB 400/444 e se não foi alterado por editor de texto.'
    });
  }

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const type = slice(line, layout.recordType);

    if (line.length !== firstLen) {
      result.fileErrors.push({
        code: 'LINHA_TAMANHO_DIVERGENTE',
        line: lineNumber,
        message: `Linha ${lineNumber} tem ${line.length} caracteres (esperado ${firstLen}).`,
        suggestion: 'Corrija o preenchimento dos campos dessa linha para manter o tamanho fixo.'
      });
    }

    if (type === layout.recordTypes.header) {
      if (idx === 0) {
        result.header = { line: lineNumber, fields: readFields(line, layout.headerFields), raw: line };
      } else {
        result.fileErrors.push({
          code: 'HEADER_FORA_DE_LUGAR',
          line: lineNumber,
          message: `Registro header (tipo 0) encontrado na linha ${lineNumber}; ele deve ser a primeira linha.`,
          suggestion: 'Remova o header repetido. O arquivo deve ter um único header, na primeira linha.'
        });
      }
    } else if (type === layout.recordTypes.trailer) {
      result.trailer = { line: lineNumber };
    } else if (type === layout.recordTypes.detail) {
      result.records.push({ line: lineNumber, fields: readFields(line, layout.detailFields) });
    }
  });

  if (!result.header) {
    result.fileErrors.push({ code: 'SEM_HEADER', message: 'Registro header (tipo 0) não encontrado na primeira linha.', suggestion: 'A primeira linha do arquivo deve ser o header, iniciando com o dígito 0.' });
  }
  if (!result.trailer) {
    result.fileErrors.push({ code: 'SEM_TRAILER', message: 'Registro trailer (tipo 9) não encontrado.', suggestion: 'A última linha do arquivo deve ser o trailer, iniciando com o dígito 9.' });
  }
  if (result.records.length === 0) {
    result.fileErrors.push({ code: 'SEM_DETALHES', message: 'Nenhum registro de detalhe (tipo 1) encontrado.', suggestion: 'Confirme se o arquivo contém títulos.' });
  }

  return result;
}
