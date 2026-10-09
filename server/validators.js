// Validadores de campos. Cada um retorna null (ok) ou { code, message, suggestion }.

const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const err = (code, message, suggestion) => ({ code, message, suggestion });

export function isValidCnpj(value) {
  const c = onlyDigits(value);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = w.reduce((acc, wi, i) => acc + wi * Number(c[i]), 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export function isValidCpf(value) {
  const c = onlyDigits(value);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

// Dígito verificador da chave de acesso NF-e (módulo 11, pesos 2..9)
export function isValidChaveNfe(value) {
  const c = onlyDigits(value);
  if (c.length !== 44) return false;
  let weight = 2;
  let sum = 0;
  for (let i = 42; i >= 0; i--) {
    sum += Number(c[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const r = sum % 11;
  const dv = r < 2 ? 0 : 11 - r;
  return dv === Number(c[43]);
}

const VALID_DDDS = new Set([
  11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,
  51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99
]);

// Códigos de UF usados na chave de acesso (IBGE)
const VALID_UF_CODES = new Set([
  11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 35, 41, 42, 43, 50, 51, 52, 53
]);

export const validators = {
  sacadoNome(v) {
    if (!v) return err('NOME_VAZIO', 'Nome do sacado não informado.', 'Preencha o nome/razão social do sacado no cadastro e gere o arquivo novamente.');
    if (v.length < 3) return err('NOME_CURTO', 'Nome do sacado muito curto.', 'Informe a razão social completa do sacado.');
    if (/[^A-Za-z0-9 .,&\-/'()]/.test(v)) return err('NOME_CARACTER_INVALIDO', 'Nome do sacado contém caracteres inválidos (acentos ou símbolos).', 'Remova acentos e caracteres especiais; o CNAB aceita apenas letras maiúsculas sem acento, números e pontuação básica.');
    return null;
  },

  // Itaú: posições 219-220 = tipo (01 CPF / 02 CNPJ); 221-234 = número com 14 posições, zeros à esquerda.
  sacadoDoc(v, fields) {
    const d = onlyDigits(v);
    const tipo = fields.sacadoTipo;
    if (tipo !== '01' && tipo !== '02') {
      return err('DOC_TIPO_INVALIDO', `Tipo de inscrição do sacado "${tipo || '(vazio)'}" inválido; use 01 (CPF) ou 02 (CNPJ).`, 'Preencha as posições 219 e 220 com 01 para CPF ou 02 para CNPJ.');
    }
    if (!d || /^0+$/.test(d)) {
      return err('DOC_VAZIO', tipo === '01' ? 'CPF do sacado não informado.' : 'CNPJ do sacado não informado.', 'Preencha o documento do sacado no cadastro.');
    }
    if (tipo === '01') {
      return isValidCpf(d.slice(-11)) ? null : err('CPF_INVALIDO', 'CPF do sacado inválido.', 'Confira os 11 dígitos do CPF no cadastro do sacado.');
    }
    if (!isValidCnpj(d.padStart(14, '0'))) return err('CNPJ_INVALIDO', 'CNPJ do sacado inválido (dígitos verificadores não conferem).', 'Confira o CNPJ no cadastro do sacado ou consulte a Receita Federal.');
    return null;
  },

  sacadoTelefone(v) {
    const d = onlyDigits(v);
    if (!d) return err('TEL_VAZIO', 'Telefone do sacado não informado.', 'Preencha o telefone com DDD no cadastro do sacado.');
    const num = d.length > 11 ? d.replace(/^0+/, '') : d;
    if (num.length !== 10 && num.length !== 11) return err('TEL_TAMANHO', `Telefone com ${num.length} dígitos; esperado 10 (fixo) ou 11 (celular) com DDD.`, 'Informe DDD + número, por exemplo 41999998888.');
    if (!VALID_DDDS.has(Number(num.slice(0, 2)))) return err('TEL_DDD_INVALIDO', `DDD ${num.slice(0, 2)} inválido.`, 'Corrija o DDD do telefone.');
    if (num.length === 11 && num[2] !== '9') return err('TEL_CELULAR_INVALIDO', 'Telefone de 11 dígitos deve começar com 9 após o DDD.', 'Confira o número do celular.');
    if (/^(\d)\1+$/.test(num.slice(2))) return err('TEL_REPETIDO', 'Telefone com dígitos repetidos (provável placeholder).', 'Informe o telefone real do sacado.');
    return null;
  },

  nossoNumero(v) {
    if (!v) return err('NOSSO_NUM_VAZIO', 'Nosso número não informado.', 'Gere o nosso número no sistema de cobrança antes de montar o arquivo.');
    if (!/^\d+$/.test(v)) return err('NOSSO_NUM_NAO_NUMERICO', 'Nosso número deve conter apenas dígitos.', 'Remova letras, espaços ou símbolos do nosso número.');
    if (v.length !== 8) return err('NOSSO_NUM_TAMANHO', `Nosso número com ${v.length} dígitos; o Itaú exige 8 (posições 63 a 70).`, 'Complete com zeros à esquerda até 8 dígitos.');
    if (/^0+$/.test(v)) return err('NOSSO_NUM_ZERADO', 'Nosso número zerado (carteira 109 é direta: o nosso número é informado pela empresa).', 'Informe um nosso número válido, dentro da faixa definida pelo Itaú.');
    return null;
  },

  seuNumero(v) {
    if (!v) return err('SEU_NUM_VAZIO', 'Seu número não informado.', 'Preencha o número do documento/título no cadastro.');
    if (/[^A-Za-z0-9\-/. ]/.test(v)) return err('SEU_NUM_CARACTER_INVALIDO', 'Seu número contém caracteres inválidos.', 'Use apenas letras, números, hífen, barra ou ponto.');
    return null;
  },

  // A chave da nota é OPCIONAL: em branco (ou só zeros) é aceita.
  // Quando informada, precisa ser uma chave de 44 dígitos válida e o número da nota que ela
  // contém (posições 26-34) precisa bater com o "seu número" do título.
  chaveNota(v, fields) {
    if (!v || /^[0\s]*$/.test(v)) return null;
    if (/\D/.test(v)) return err('CHAVE_NAO_NUMERICA', 'Chave da nota contém caracteres que não são dígitos.', 'A chave de acesso tem apenas os 44 dígitos, sem espaços, pontos ou letras.');
    if (v.length !== 44) return err('CHAVE_TAMANHO', `Chave da nota com ${v.length} dígitos; esperado 44.`, 'Copie a chave de acesso completa do XML ou DANFE da nota, ou deixe o campo em branco.');
    if (!VALID_UF_CODES.has(Number(v.slice(0, 2)))) return err('CHAVE_UF_INVALIDA', `Chave da nota com código de UF ${v.slice(0, 2)} inválido.`, 'Confira a chave no XML da NF-e; os 2 primeiros dígitos são o código da UF do emitente.');
    const mes = Number(v.slice(4, 6));
    if (mes < 1 || mes > 12) return err('CHAVE_DATA_INVALIDA', `Chave da nota com mês de emissão ${v.slice(4, 6)} inválido.`, 'Confira a chave no XML da NF-e; os dígitos 3 a 6 são o ano e o mês de emissão (AAMM).');
    if (!isValidChaveNfe(v)) return err('CHAVE_DV_INVALIDO', 'Chave da nota inválida (dígito verificador não confere).', 'Confira a chave no XML da NF-e; pode haver dígito trocado.');

    const seu = fields?.seuNumero || '';
    if (seu) {
      const nNF = Number(v.slice(25, 34));
      const confere = (seu.match(/\d+/g) || []).some((n) => Number(n) === nNF);
      if (!confere) {
        return err('CHAVE_SEU_NUMERO_DIVERGENTE',
          `A chave é da nota nº ${nNF}, mas o seu número é "${seu}".`,
          `O seu número deve conter o número da nota (${nNF}). Corrija o seu número ou a chave.`);
      }
    }
    return null;
  },

  sacadoEndereco(v, fields) {
    if (!v) return err('END_VAZIO', 'Endereço do sacado não informado.', 'Preencha logradouro e número no cadastro do sacado.');
    if (v.length < 5) return err('END_CURTO', 'Endereço do sacado muito curto.', 'Informe logradouro e número completos.');
    const cep = onlyDigits(fields.sacadoCep);
    if (cep.length !== 8) return err('CEP_INVALIDO', 'CEP do sacado inválido (deve ter 8 dígitos).', 'Corrija o CEP no cadastro do sacado.');
    return null;
  }
};

export function validateRecordLocal(fields) {
  const errors = [];
  for (const [field, fn] of Object.entries(validators)) {
    const e = fn(fields[field], fields);
    if (e) errors.push({ field, ...e });
  }
  return errors;
}

// Duplicidades entre registros do arquivo
export function findDuplicates(records) {
  const out = new Map();
  const add = (line, e) => out.set(line, [...(out.get(line) || []), e]);
  for (const [field, code, label] of [['nossoNumero', 'NOSSO_NUM_DUPLICADO', 'Nosso número'], ['seuNumero', 'SEU_NUM_DUPLICADO', 'Seu número']]) {
    const seen = new Map();
    records.forEach((r) => {
      const v = r.fields[field];
      if (!v) return;
      seen.set(v, [...(seen.get(v) || []), r.line]);
    });
    for (const [v, lines] of seen) {
      if (lines.length > 1) {
        lines.forEach((l) => add(l, {
          field, code,
          message: `${label} "${v}" repetido nas linhas ${lines.join(', ')}.`,
          suggestion: `Cada título deve ter ${label.toLowerCase()} único. Corrija ou remova as duplicidades.`
        }));
      }
    }
  }
  return out;
}
