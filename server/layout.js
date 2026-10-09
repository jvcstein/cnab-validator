// Junta o layout oficial do Itaú com os ajustes internos da empresa.
// Para mexer em telefone ou chave da nota, edite layout.telefone.js e layout.interno.js (não este arquivo).

import { ITAU_HEADER, ITAU_DETAIL } from './layout.itau.js';
import { INTERNO_DETAIL } from './layout.interno.js';

export const LAYOUT = {
  // Tamanhos de linha aceitos (400 = Itaú; 444 = extensão com chave da nota)
  lineLengths: [400, 444],

  recordType: { start: 1, end: 1 },
  recordTypes: { header: '0', detail: '1', trailer: '9' },

  headerFields: ITAU_HEADER,
  detailFields: { ...ITAU_DETAIL, ...INTERNO_DETAIL }
};
