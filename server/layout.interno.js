// AJUSTES INTERNOS DA EMPRESA — fora do layout oficial do Itaú.
// Este arquivo NÃO é alterado pelas atualizações do layout do Itaú.

import { TELEFONE_POS } from './layout.telefone.js';

export const INTERNO_DETAIL = {
  // A posição do telefone é editada em layout.telefone.js (único lugar).
  sacadoTelefone: TELEFONE_POS,

  // Extensão CNAB 444: chave de acesso da NF-e nas posições 401-444
  chaveNota: { start: 401, end: 444, label: 'Chave da nota' }
};
