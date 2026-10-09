import assert from 'node:assert/strict';
import app from '../index.js';
import { FUNDOS } from '../funds.js';
import { itauDac } from '../headerValidation.js';
import { sampleMain, sampleSecuritizadora, sampleHeaderInvalido, header, detail, trailer, toFile, chaveValida } from './gen-sample.js';

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('  ok  ', name); }
  catch (e) { console.error('  FALHOU', name, '\n       ', e.message); process.exitCode = 1; }
};

const server = app.listen(0);
const port = server.address().port;
process.env.VALIDATION_API_URL = `http://localhost:${port}/mock/validate`;

async function validate(text, name = 'teste.txt') {
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(text, 'latin1')]), name);
  const resp = await fetch(`http://localhost:${port}/api/validate`, { method: 'POST', body: form });
  return { status: resp.status, data: await resp.json() };
}
const codes = (rec) => rec.errors.map((e) => e.code);
const check = (hdr, id) => hdr.checks.find((c) => c.id === id);

try {
  console.log('Configuração');
  await test('DAC calculado bate com o DAC cadastrado de cada fundo', () => {
    for (const f of FUNDOS) assert.equal(itauDac(f.agencia, f.conta), f.dac, f.nome);
  });

  console.log('Arquivo principal (Fundo Multissetorial)');
  const { status, data } = await validate(sampleMain());
  await test('HTTP 200 e sem erros de estrutura', () => {
    assert.equal(status, 200);
    assert.deepEqual(data.fileErrors, []);
  });
  await test('header OK e fundo identificado', () => {
    assert.equal(data.header.ok, true);
    assert.equal(data.header.fund.nome, 'Fundo Multissetorial');
    assert.equal(data.header.fund.conta, '66609-6');
  });
  await test('2 registros corretos e 3 com erro', () => {
    assert.deepEqual(data.summary, { total: 5, valid: 2, invalid: 3 });
    assert.equal(data.records[0].status, 'ok');
    assert.equal(data.records[1].status, 'ok');
  });
  await test('erros do sacado/título detectados (linha 4)', () => {
    const c = codes(data.records[2]);
    for (const k of ['NOME_CARACTER_INVALIDO', 'CNPJ_INVALIDO', 'TEL_TAMANHO', 'CHAVE_TAMANHO', 'NOSSO_NUM_TAMANHO']) assert.ok(c.includes(k), k + ' ausente: ' + c);
  });
  await test('erros do beneficiário detectados (linha 5)', () => {
    const c = codes(data.records[3]);
    for (const k of ['BENEF_CONTA_DIVERGENTE', 'BENEF_DAC_DIVERGENTE', 'CARTEIRA_DIVERGENTE']) assert.ok(c.includes(k), k + ' ausente: ' + c);
    assert.equal(c.some((k) => k.includes('CNPJ')), false, 'CNPJ da empresa não deve ser validado');
  });
  await test('o header não tem conferência de CNPJ', () => {
    assert.equal(data.header.checks.some((c) => c.id === 'cnpjEmpresa'), false);
  });
  await test('título de outro fundo e nosso número repetido (linha 6)', () => {
    const c = codes(data.records[4]);
    assert.ok(c.includes('FUNDO_DIVERGENTE_DO_HEADER'), c);
    assert.ok(c.includes('NOSSO_NUM_DUPLICADO'), c);
  });

  console.log('Fundo Securitizadora');
  const sec = await validate(sampleSecuritizadora());
  await test('header e título corretos', () => {
    assert.equal(sec.data.header.ok, true);
    assert.equal(sec.data.header.fund.nome, 'Fundo Securitizadora');
    assert.deepEqual(sec.data.summary, { total: 1, valid: 1, invalid: 0 });
  });

  console.log('Header inválido');
  const bad = await validate(sampleHeaderInvalido());
  await test('código do banco, literal, data, conta e DAC reprovados', () => {
    const h = bad.data.header;
    assert.equal(h.ok, false);
    assert.equal(h.fund, null);
    for (const id of ['codigoBanco', 'nomeBanco', 'literalRemessa', 'dataGeracao', 'conta', 'dac']) assert.equal(check(h, id).ok, false, id);
    for (const id of ['tipo', 'operacao', 'codigoServico', 'literalServico', 'agencia']) assert.equal(check(h, id).ok, true, id);
  });
  await test('sem fundo no header, registros ainda são conferidos pela própria conta', () => {
    assert.equal(bad.data.records[0].status, 'ok');
  });

  console.log('DAC divergente com conta válida');
  const dac = await validate(toFile([header({ over: { dac: '3' } }), detail(), trailer()]));
  await test('apenas o DAC reprovado e fundo ainda identificado', () => {
    const h = dac.data.header;
    assert.equal(h.fund.nome, 'Fundo Multissetorial');
    assert.equal(check(h, 'dac').ok, false);
    assert.equal(check(h, 'conta').ok, true);
  });

  console.log('Chave da nota (opcional)');
  const recs = async (overs, lineLen) => {
    let lines = [header(), ...overs.map((over) => detail({ over })), trailer()];
    if (lineLen) lines = lines.map((l) => l.slice(0, lineLen));
    return (await validate(toFile(lines))).data;
  };
  const chaveErr = (rec) => codes(rec).filter((c) => c.startsWith('CHAVE'));
  const vazia = await recs([
    { chaveNota: '' },
    { chaveNota: '0'.repeat(44), nossoNumero: '00000102', seuNumero: 'NF-1002' }
  ]);
  await test('sem chave (em branco ou zerada) é aceito', () => {
    assert.deepEqual(vazia.summary, { total: 2, valid: 2, invalid: 0 });
  });
  const so400 = await recs([{ seuNumero: 'NF-1001' }], 400);
  await test('arquivo de 400 posições (sem área da chave) é aceito', () => {
    assert.deepEqual(so400.fileErrors, []);
    assert.deepEqual(so400.summary, { total: 1, valid: 1, invalid: 0 });
  });
  const chaves = await recs([
    { seuNumero: 'NF-1001', chaveNota: chaveValida(1001) },       // bate
    { seuNumero: '1001/2', nossoNumero: '00000102', chaveNota: chaveValida(1001) },         // seu número com parcela
    { seuNumero: '0000001001A', nossoNumero: '00000103', chaveNota: chaveValida(1001) },    // zeros à esquerda
    { seuNumero: 'NF-2002', nossoNumero: '00000104', chaveNota: chaveValida(1001) },        // não bate
    { seuNumero: 'NF-1001', nossoNumero: '00000105', chaveNota: chaveValida(1001).slice(0, 43) + '0' }, // DV errado (1001 → DV ≠ 0)
    { seuNumero: 'NF-1001', nossoNumero: '00000106', chaveNota: '99' + chaveValida(1001).slice(2) },    // UF inválida
    { seuNumero: 'NF-1001', nossoNumero: '00000107', chaveNota: '12345' }                                // curta
  ]);
  await test('chave válida que bate com o seu número é aceita (inclusive com parcela e zeros)', () => {
    for (const i of [0, 1, 2]) assert.deepEqual(chaveErr(chaves.records[i]), [], `registro ${i}`);
  });
  await test('chave válida que não bate com o seu número é reprovada', () => {
    assert.deepEqual(chaveErr(chaves.records[3]), ['CHAVE_SEU_NUMERO_DIVERGENTE']);
  });
  await test('chave com dígito verificador, UF ou tamanho inválidos é reprovada', () => {
    assert.deepEqual(chaveErr(chaves.records[4]), ['CHAVE_DV_INVALIDO']);
    assert.deepEqual(chaveErr(chaves.records[5]), ['CHAVE_UF_INVALIDA']);
    assert.deepEqual(chaveErr(chaves.records[6]), ['CHAVE_TAMANHO']);
  });

  console.log('Estrutura');
  const noHeader = await validate(toFile([detail(), trailer()]));
  await test('arquivo sem header na primeira linha', () => {
    assert.equal(noHeader.data.header, null);
    assert.ok(noHeader.data.fileErrors.some((e) => e.code === 'SEM_HEADER'));
  });
  const cpf = await validate(toFile([header(), detail({ over: { sacadoTipo: '01', sacadoDoc: '00012345678909' } }), trailer()]));
  await test('CPF do sacado (14 posições com zeros) é validado pelos 11 dígitos', () => {
    assert.equal(codes(cpf.data.records[0]).includes('CPF_INVALIDO'), false);
  });
} finally {
  server.close();
  console.log(`\n${passed} testes passaram${process.exitCode ? ' (há falhas)' : ''}`);
}
