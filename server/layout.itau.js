// Layout oficial Itaú — Cobrança, arquivo REMESSA (manual jul/2022, cap. 3.1).
// Posições 1-based, inclusivas. Registros de 400 bytes (a extensão de 444 está em layout.interno.js).
//
// Os campos de telefone e chave da nota NÃO fazem parte do layout do Itaú:
// ficam em layout.interno.js, que é um ajuste da nossa empresa.

export const ITAU_HEADER = {
  tipoRegistro:  { start: 1,   end: 1,   label: 'Tipo de registro' },          // 0
  operacao:      { start: 2,   end: 2,   label: 'Operação' },                  // 1 = remessa
  literalRemessa:{ start: 3,   end: 9,   label: 'Literal de remessa' },        // REMESSA
  codigoServico: { start: 10,  end: 11,  label: 'Código do serviço' },         // 01
  literalServico:{ start: 12,  end: 26,  label: 'Literal de serviço' },        // COBRANCA
  agencia:       { start: 27,  end: 30,  label: 'Agência' },
  zeros:         { start: 31,  end: 32,  label: 'Zeros' },                     // 00
  conta:         { start: 33,  end: 37,  label: 'Conta' },
  dac:           { start: 38,  end: 38,  label: 'DAC agência/conta' },
  nomeEmpresa:   { start: 47,  end: 76,  label: 'Nome da empresa' },
  codigoBanco:   { start: 77,  end: 79,  label: 'Código do banco' },           // 341
  nomeBanco:     { start: 80,  end: 94,  label: 'Nome do banco' },             // BANCO ITAU SA
  dataGeracao:   { start: 95,  end: 100, label: 'Data de geração' }            // DDMMAA
};

export const ITAU_DETAIL = {
  // Conta da empresa que empresta o crédito (fundo).
  // Atenção: as posições 2-17 (tipo/nº de inscrição) trazem o documento do CEDENTE e não são
  // comparadas com o CNPJ do fundo; por isso não são lidas aqui.
  beneficiarioAgencia:  { start: 18,  end: 21,  label: 'Agência da empresa' },
  beneficiarioConta:    { start: 24,  end: 28,  label: 'Conta da empresa' },
  beneficiarioDac:      { start: 29,  end: 29,  label: 'DAC agência/conta' },
  // Título
  nossoNumero:          { start: 63,  end: 70,  label: 'Nosso número' },                  // 8 dígitos
  carteiraNumero:       { start: 84,  end: 86,  label: 'Nº da carteira' },
  seuNumero:            { start: 111, end: 120, label: 'Seu número (nº do documento)' },
  bancoDetalhe:         { start: 140, end: 142, label: 'Código do banco' },
  // Pagador (sacado)
  sacadoTipo:           { start: 219, end: 220, label: 'Tipo de inscrição do sacado' },   // 01 = CPF, 02 = CNPJ
  sacadoDoc:            { start: 221, end: 234, label: 'CNPJ do sacado' },
  sacadoNome:           { start: 235, end: 274, label: 'Nome do sacado' },               // 30 + 10 de complemento
  sacadoEndereco:       { start: 275, end: 314, label: 'Endereço do sacado' },
  sacadoCep:            { start: 327, end: 334, label: 'CEP do sacado' }
};
