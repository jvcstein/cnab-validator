// Layout do arquivo CNAB (posições 1-based, inclusivas).
//
// ATENÇÃO: as posições abaixo são PROVISÓRIAS (baseadas no padrão CNAB 400 de cobrança).
// Ajuste cada campo conforme o manual do layout do seu banco/FIDC.
// Para CNAB 444, a linha tem 444 caracteres; basta mudar start/end dos campos.

export const LAYOUT = {
  // Tamanhos de linha aceitos
  lineLengths: [400, 444],

  // Identificador do tipo de registro (posição 1)
  recordType: { start: 1, end: 1 },
  recordTypes: { header: '0', detail: '1', trailer: '9' },

  // Campos do registro de detalhe (tipo 1)
  detailFields: {
    nossoNumero:   { start: 63,  end: 70,  label: 'Nosso número' },
    seuNumero:     { start: 111, end: 120, label: 'Seu número' },
    sacadoTipo:    { start: 219, end: 220, label: 'Tipo de inscrição do sacado' }, // 01=CPF, 02=CNPJ
    sacadoDoc:     { start: 221, end: 234, label: 'CNPJ do sacado' },
    sacadoNome:    { start: 235, end: 274, label: 'Nome do sacado' },
    sacadoEndereco:{ start: 275, end: 314, label: 'Endereço do sacado' },
    sacadoCep:     { start: 327, end: 334, label: 'CEP do sacado' },
    sacadoTelefone:{ start: 352, end: 381, label: 'Telefone do sacado' },
    chaveNota:     { start: 401, end: 444, label: 'Chave da nota' }
  }
};
