// Validações prévias: header do arquivo (layout Itaú) e dados do beneficiário (nossa empresa).

import { BANCO, FUNDOS, fmtCnpj, fmtConta, findFundByConta } from './funds.js';

const digits = (s) => (s || '').replace(/\D/g, '');

// DAC agência/conta do Itaú: módulo 10, pesos 2 e 1 da direita para a esquerda.
export function itauDac(agencia, conta) {
  const d = (agencia + conta).split('').map(Number);
  let sum = 0;
  let w = 2;
  for (let i = d.length - 1; i >= 0; i--) {
    let p = d[i] * w;
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    sum += p;
    w = w === 2 ? 1 : 2;
  }
  const r = sum % 10;
  return String(r === 0 ? 0 : 10 - r);
}

function validDdmmaa(v) {
  if (!/^\d{6}$/.test(v)) return false;
  const dd = Number(v.slice(0, 2));
  const mm = Number(v.slice(2, 4));
  const yy = 2000 + Number(v.slice(4, 6));
  const d = new Date(yy, mm - 1, dd);
  return d.getFullYear() === yy && d.getMonth() === mm - 1 && d.getDate() === dd;
}

const fmtData = (v) => (/^\d{6}$/.test(v) ? `${v.slice(0, 2)}/${v.slice(2, 4)}/20${v.slice(4, 6)}` : v);

/**
 * Valida o header e identifica o fundo (pela agência + conta).
 * Retorna { fund, ok, info, checks[] }, onde cada check é
 * { id, label, expected, found, ok, suggestion }.
 */
export function validateHeader(header) {
  const f = header.fields;
  const checks = [];
  const add = (id, label, expected, found, ok, suggestion) =>
    checks.push({ id, label, expected, found: found === '' ? '(vazio)' : found, ok, suggestion });

  add('tipo', 'Tipo de registro', '0', f.tipoRegistro, f.tipoRegistro === '0',
    'A primeira linha deve ser o header, iniciando com 0.');
  add('operacao', 'Operação', '1 (remessa)', f.operacao, f.operacao === '1',
    'No arquivo de remessa a operação (posição 2) deve ser 1.');
  add('literalRemessa', 'Literal de remessa', 'REMESSA', f.literalRemessa, f.literalRemessa === 'REMESSA',
    'Preencha as posições 3 a 9 com REMESSA, em maiúsculas.');
  add('codigoServico', 'Código do serviço', '01', f.codigoServico, f.codigoServico === '01',
    'Preencha as posições 10 e 11 com 01 (cobrança).');
  add('literalServico', 'Literal de serviço', 'COBRANCA', f.literalServico, f.literalServico === 'COBRANCA',
    'Preencha as posições 12 a 26 com COBRANCA (sem cedilha), alinhado à esquerda.');
  add('codigoBanco', 'Código do banco', BANCO.codigo, f.codigoBanco, f.codigoBanco === BANCO.codigo,
    `O código do banco (posições 77 a 79) deve ser ${BANCO.codigo} (Itaú). Confira se o arquivo foi gerado para o Itaú.`);
  add('nomeBanco', 'Nome do banco', BANCO.nome, f.nomeBanco, f.nomeBanco === BANCO.nome,
    `Preencha as posições 80 a 94 com ${BANCO.nome}.`);
  add('zeros', 'Complemento (zeros)', '00', f.zeros, f.zeros === '00',
    'As posições 31 e 32 devem ser preenchidas com 00.');
  add('dataGeracao', 'Data de geração', 'DDMMAA válida', fmtData(f.dataGeracao), validDdmmaa(f.dataGeracao),
    'Informe a data de geração no formato DDMMAA, por exemplo 071026.');
  add('nomeEmpresa', 'Nome da empresa', 'preenchido', f.nomeEmpresa, f.nomeEmpresa.length > 0,
    'Preencha o nome da empresa nas posições 47 a 76.');

  // Agência / conta / DAC → identifica o fundo
  const agencias = [...new Set(FUNDOS.map((x) => x.agencia))];
  const contas = FUNDOS.map((x) => `${fmtConta(x)} (${x.nome})`).join(' ou ');
  const fund = findFundByConta(f.agencia, f.conta);

  add('agencia', 'Agência', agencias.join(' ou '), f.agencia, agencias.includes(f.agencia),
    `A agência do header deve ser ${agencias.join(' ou ')}.`);
  add('conta', 'Conta', FUNDOS.map((x) => x.conta).join(' ou '), f.conta, FUNDOS.some((x) => x.conta === f.conta),
    `A conta do header não é de nenhum dos nossos fundos. Contas aceitas: ${contas}.`);

  if (fund) {
    add('dac', 'DAC agência/conta', fund.dac, f.dac, f.dac === fund.dac,
      `Para a conta ${fund.conta} (${fund.nome}) o DAC deve ser ${fund.dac}.`);
  } else {
    add('dac', 'DAC agência/conta', 'conforme a conta', f.dac, false,
      'Não foi possível conferir o DAC porque a agência/conta não foi identificada.');
  }

  const ok = checks.every((c) => c.ok);
  return {
    ok,
    fund: fund ? { id: fund.id, nome: fund.nome, conta: fmtConta(fund), agencia: fund.agencia, carteira: fund.carteira } : null,
    info: {
      empresa: f.nomeEmpresa,
      dataGeracao: fmtData(f.dataGeracao),
      agencia: f.agencia,
      conta: `${f.conta}-${f.dac}`,
      banco: `${f.codigoBanco} ${f.nomeBanco}`.trim()
    },
    checks,
    _fund: fund
  };
}

/**
 * Valida os dados do beneficiário (nossa empresa) em um registro de detalhe,
 * comparando com o fundo identificado no header.
 */
export function validateBeneficiary(fields, headerFund) {
  const errors = [];
  const add = (field, code, message, suggestion) => errors.push({ field, code, message, suggestion });

  const agencia = fields.beneficiarioAgencia;
  const conta = fields.beneficiarioConta;
  const recordFund = findFundByConta(agencia, conta);
  const fund = headerFund || recordFund;

  if (!fund) {
    add('beneficiarioConta', 'FUNDO_NAO_IDENTIFICADO',
      `Agência/conta ${agencia || '(vazio)'}/${conta || '(vazio)'} não pertence a nenhum dos nossos fundos.`,
      `Contas aceitas: ${FUNDOS.map((x) => `${x.agencia}/${fmtConta(x)} (${x.nome})`).join(' ou ')}.`);
    return errors;
  }

  if (headerFund && recordFund && recordFund.id !== headerFund.id) {
    add('beneficiarioConta', 'FUNDO_DIVERGENTE_DO_HEADER',
      `Este título é do ${recordFund.nome}, mas o header do arquivo é do ${headerFund.nome}.`,
      'Cada arquivo deve conter títulos de um único fundo. Separe os títulos em arquivos distintos.');
    return errors;
  }

  // O documento das posições 2-17 do título é o do cedente: não é comparado com o CNPJ do fundo.
  if (agencia !== fund.agencia) {
    add('beneficiarioAgencia', 'BENEF_AGENCIA_DIVERGENTE',
      `Agência ${agencia || '(vazio)'} diverge da esperada para o ${fund.nome} (${fund.agencia}).`,
      `Informe ${fund.agencia} nas posições 18 a 21.`);
  }
  if (conta !== fund.conta) {
    add('beneficiarioConta', 'BENEF_CONTA_DIVERGENTE',
      `Conta ${conta || '(vazio)'} diverge da esperada para o ${fund.nome} (${fund.conta}).`,
      `Informe ${fund.conta} nas posições 24 a 28.`);
  }
  if (fields.beneficiarioDac !== fund.dac) {
    add('beneficiarioDac', 'BENEF_DAC_DIVERGENTE',
      `DAC ${fields.beneficiarioDac || '(vazio)'} diverge do esperado para a conta ${fund.conta} (${fund.dac}).`,
      `Informe ${fund.dac} na posição 29.`);
  }
  if (fields.carteiraNumero !== fund.carteira) {
    add('carteiraNumero', 'CARTEIRA_DIVERGENTE',
      `Carteira ${fields.carteiraNumero || '(vazio)'} diverge da esperada (${fund.carteira}).`,
      `Informe ${fund.carteira} nas posições 84 a 86.`);
  }
  if (fields.bancoDetalhe !== BANCO.codigo) {
    add('bancoDetalhe', 'BANCO_DETALHE_INVALIDO',
      `Código do banco ${fields.bancoDetalhe || '(vazio)'} no título; deve ser ${BANCO.codigo}.`,
      `Informe ${BANCO.codigo} nas posições 140 a 142.`);
  }
  return errors;
}
