// Monta arquivos CNAB de exemplo (444 colunas) usando as posições de layout.js.
// Usado pelos testes (run.js) e, se executado diretamente, grava test/exemplo*.txt.

import fs from 'node:fs';
import { LAYOUT } from '../layout.js';
import { FUNDOS } from '../funds.js';

export const W = 444;

export function cnpjWithDv(base12) {
  const calc = (digits) => {
    const w = digits.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = digits.split('').reduce((a, d, i) => a + Number(d) * w[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base12);
  const d2 = calc(base12 + d1);
  return base12 + d1 + d2;
}

export function chaveWithDv(base43) {
  let w = 2, s = 0;
  for (let i = 42; i >= 0; i--) { s += Number(base43[i]) * w; w = w === 9 ? 2 : w + 1; }
  const r = s % 11;
  return base43 + (r < 2 ? 0 : 11 - r);
}

export const chaveValida = (n = 1) =>
  chaveWithDv(('3526' + '10' + '12345678000195' + '55' + '001' + String(n).padStart(9, '0') + '1' + '00000001').slice(0, 43));

function put(line, pos, value) {
  const len = pos.end - pos.start + 1;
  const v = String(value).padEnd(len, ' ').slice(0, len);
  return line.slice(0, pos.start - 1) + v + line.slice(pos.end);
}

export function header(o = {}) {
  const fund = o.fund || FUNDOS[0];
  const h = LAYOUT.headerFields;
  let l = ' '.repeat(W);
  const v = {
    tipoRegistro: '0', operacao: '1', literalRemessa: 'REMESSA', codigoServico: '01',
    literalServico: 'COBRANCA', agencia: fund.agencia, zeros: '00', conta: fund.conta, dac: fund.dac,
    nomeEmpresa: 'FUNDO DE INVESTIMENTO EXEMPLO', codigoBanco: '341', nomeBanco: 'BANCO ITAU SA',
    dataGeracao: '081026', ...o.over
  };
  for (const [k, pos] of Object.entries(h)) l = put(l, pos, v[k] ?? '');
  return l;
}

export function detail(o = {}) {
  const fund = o.fund || FUNDOS[0];
  const f = LAYOUT.detailFields;
  const v = {
    beneficiarioAgencia: fund.agencia,
    beneficiarioConta: fund.conta, beneficiarioDac: fund.dac, nossoNumero: '00000101',
    carteiraNumero: fund.carteira, seuNumero: 'NF-1001', bancoDetalhe: '341', sacadoTipo: '02',
    sacadoDoc: cnpjWithDv('112223330001'), sacadoNome: 'EMPRESA EXEMPLO LTDA',
    sacadoEndereco: 'RUA DAS FLORES 100', sacadoCep: '80010000', sacadoTelefone: '41999998888',
    chaveNota: chaveValida(1001), ...o.over
  };
  let l = ' '.repeat(W);
  l = put(l, LAYOUT.recordType, '1');
  for (const [k, pos] of Object.entries(f)) l = put(l, pos, v[k] ?? '');
  return l;
}

export const trailer = () => put(' '.repeat(W), LAYOUT.recordType, '9');

export const toFile = (lines) => lines.join('\r\n') + '\r\n';

// Arquivo de exemplo: header do Fundo Multissetorial, 2 títulos corretos e 3 com problemas.
export function sampleMain() {
  const [multi] = FUNDOS;
  const [, secur] = FUNDOS;
  return toFile([
    header(),
    detail({ over: { nossoNumero: '00000101', seuNumero: 'NF-1001' } }),
    detail({ over: { nossoNumero: '00000102', seuNumero: 'NF-1002', sacadoDoc: cnpjWithDv('445556660001'), sacadoNome: 'COMERCIAL SILVA SA', sacadoEndereco: 'AV BRASIL 2500', sacadoTelefone: '4133334444', chaveNota: '' } }),
    // problemas do sacado/título
    detail({ over: { nossoNumero: '0000103', seuNumero: 'NF-1003', sacadoDoc: '11222333000199', sacadoNome: 'INDÚSTRIA JOÃO LTDA', sacadoEndereco: 'RUA X', sacadoTelefone: '1234', chaveNota: '123' } }),
    // problemas do beneficiário (nossa empresa)
    detail({ over: { nossoNumero: '00000104', seuNumero: 'NF-1004', beneficiarioConta: '99999', beneficiarioDac: '1', carteiraNumero: '112', chaveNota: chaveValida(1004) } }),
    // título de outro fundo + nosso número repetido
    detail({ fund: secur, over: { nossoNumero: '00000104', seuNumero: 'NF-1005', chaveNota: chaveValida(1005) } }),
    trailer()
  ]);
}

export function sampleSecuritizadora() {
  const secur = FUNDOS[1];
  return toFile([header({ fund: secur }), detail({ fund: secur }), trailer()]);
}

export function sampleHeaderInvalido() {
  return toFile([
    header({ over: { codigoBanco: '237', nomeBanco: 'BRADESCO', literalRemessa: 'RETORNO', conta: '12345', dac: '9', dataGeracao: '321326' } }),
    detail(),
    trailer()
  ]);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const dir = new URL('./', import.meta.url);
  fs.writeFileSync(new URL('exemplo.txt', dir), sampleMain(), 'latin1');
  fs.writeFileSync(new URL('exemplo-securitizadora.txt', dir), sampleSecuritizadora(), 'latin1');
  fs.writeFileSync(new URL('exemplo-header-invalido.txt', dir), sampleHeaderInvalido(), 'latin1');
  console.log('Gerados: exemplo.txt, exemplo-securitizadora.txt, exemplo-header-invalido.txt');
}
