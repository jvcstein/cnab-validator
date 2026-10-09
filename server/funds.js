// Dados da nossa empresa (quem empresta o crédito), por fundo.
// Usado para conferir o header e os dados do beneficiário em cada registro.

export const BANCO = { codigo: '341', nome: 'BANCO ITAU SA' };

export const FUNDOS = [
  {
    id: 'multissetorial',
    nome: 'Fundo Multissetorial',
    agencia: '3833',
    conta: '66609',
    dac: '6',
    carteira: '109',
    cnpj: '23956882000169'
  },
  {
    id: 'securitizadora',
    nome: 'Fundo Securitizadora',
    agencia: '3833',
    conta: '80536',
    dac: '3',
    carteira: '109',
    cnpj: '09602719000177'
  }
];

export const fmtCnpj = (c) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
export const fmtConta = (f) => `${f.conta}-${f.dac}`;

export const findFundByConta = (agencia, conta) =>
  FUNDOS.find((f) => f.agencia === agencia && f.conta === conta) || null;
