// Gera um CNAB de exemplo (444 colunas) usando as posições de layout.js,
// com registros corretos e outros com erros propositais.
import fs from 'node:fs';
import { LAYOUT } from '../layout.js';

const W = 444;

function cnpjWithDv(base12) {
  const calc = (digits) => {
    const w = digits.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const s = digits.split('').reduce((a, d, i) => a + Number(d) * w[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base12);
  const d2 = calc(base12 + d1);
  return base12 + d1 + d2;
}

function chaveWithDv(base43) {
  let w = 2, s = 0;
  for (let i = 42; i >= 0; i--) { s += Number(base43[i]) * w; w = w === 9 ? 2 : w + 1; }
  const r = s % 11;
  return base43 + (r < 2 ? 0 : 11 - r);
}

function put(line, pos, value) {
  const len = pos.end - pos.start + 1;
  const v = String(value).padEnd(len, ' ').slice(0, len);
  return line.slice(0, pos.start - 1) + v + line.slice(pos.end);
}

function detail(o) {
  let l = ' '.repeat(W);
  l = put(l, { start: 1, end: 1 }, '1');
  const f = LAYOUT.detailFields;
  l = put(l, f.nossoNumero, o.nossoNumero);
  l = put(l, f.seuNumero, o.seuNumero);
  l = put(l, f.sacadoTipo, o.tipo ?? '02');
  l = put(l, f.sacadoDoc, o.doc);
  l = put(l, f.sacadoNome, o.nome);
  l = put(l, f.sacadoEndereco, o.endereco);
  l = put(l, f.sacadoCep, o.cep ?? '80010000');
  l = put(l, f.sacadoTelefone, o.tel);
  l = put(l, f.chaveNota, o.chave);
  return l;
}

const ok1 = chaveWithDv('41261012345678000195550010000001231' .slice(0, 43).padEnd(43, '0'));

const lines = [];
lines.push(put(' '.repeat(W), { start: 1, end: 1 }, '0'));
lines.push(detail({ nossoNumero: '000000000101', seuNumero: 'NF-1001', doc: cnpjWithDv('112223330001'), nome: 'EMPRESA EXEMPLO LTDA', endereco: 'RUA DAS FLORES 100', tel: '41999998888', chave: ok1 }));
lines.push(detail({ nossoNumero: '000000000102', seuNumero: 'NF-1002', doc: cnpjWithDv('445556660001'), nome: 'COMERCIAL SILVA SA', endereco: 'AV BRASIL 2500', tel: '4133334444', chave: chaveWithDv('3526091234567800019555001000000456100000001') }));
// Erros propositais
lines.push(detail({ nossoNumero: '000000000103', seuNumero: 'NF-1003', doc: '11222333000199', nome: 'INDÚSTRIA JOÃO LTDA', endereco: 'RUA X', tel: '1234', chave: '123' }));
lines.push(detail({ nossoNumero: '000000000101', seuNumero: '', doc: cnpjWithDv('778889990001'), nome: '', endereco: 'RUA DAS PALMEIRAS 45', tel: '00000000000', chave: ok1.slice(0, 43) + '0' }));
lines.push(put(' '.repeat(W), { start: 1, end: 1 }, '9'));

fs.writeFileSync(new URL('./exemplo.txt', import.meta.url), lines.join('\r\n') + '\r\n', 'latin1');
console.log('Gerado test/exemplo.txt com', lines.length, 'linhas');
