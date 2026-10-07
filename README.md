# Validador CNAB 400/444

Interface web para o cliente subir um arquivo CNAB (.txt), validar os dados dos sacados e títulos e ver o que precisa ser corrigido.

## Como rodar

```bash
# Backend (porta 3001)
cd server && npm install && npm start

# Frontend (porta 5173), em outro terminal
cd client && npm install && npm run dev
```

Abra http://localhost:5173 e envie um arquivo. Para testar, gere um exemplo com `cd server && node test/gen-sample.js` (cria `test/exemplo.txt`) e rode `npm test` para ver o resultado no terminal.

## Publicar na internet (GitHub + Render)

1. Suba o projeto em um repositório **privado** no GitHub (`.gitignore` já incluso). Nunca suba arquivos CNAB reais.
2. No [Render](https://render.com), crie um **Blueprint** apontando para o repositório. Ele lê o `render.yaml` e configura tudo (plano gratuito, build e start).
3. A cada `git push` na branch `main`, o Render publica a nova versão.

Em produção o backend também entrega a tela (`client/dist`), então é um serviço só. Para testar localmente nesse modo:

```bash
cd client && npm run build
cd ../server && npm start   # abra http://localhost:3001
```

Observação: no plano gratuito do Render o serviço dorme após 15 minutos sem acesso e leva cerca de 1 minuto para acordar no próximo acesso. Para uso contínuo com clientes, use um plano pago.

## Como funciona

1. O frontend envia o arquivo para `POST /api/validate`.
2. O backend lê o arquivo (`parser.js`), extrai os campos de cada registro de detalhe pelas posições de `layout.js` e envia os registros em lotes de 500 para a API de validação.
3. A resposta é devolvida ao frontend com cada registro marcado como `ok` ou `error`, com a mensagem do erro e a sugestão de ajuste.

## Ajustar o layout (importante)

As posições em `server/layout.js` são **provisórias**. Confira cada campo (`start`/`end`, 1-based) com o manual do layout CNAB 444 e corrija.

## Trocar a API simulada pela real

Por padrão o backend chama a API simulada em `/mock/validate` (`mockApi.js`). Para usar a real:

```bash
VALIDATION_API_URL=https://sua-api/validate VALIDATION_API_TOKEN=xxxx npm start
```

Contrato esperado:

```
POST {VALIDATION_API_URL}
{ "records": [ { "line": 2, "fields": { "nossoNumero": "...", "seuNumero": "...", "sacadoNome": "...",
                 "sacadoDoc": "...", "sacadoTelefone": "...", "chaveNota": "...", "sacadoEndereco": "..." } } ] }

200 { "results": [ { "line": 2, "errors": [ { "field": "sacadoDoc", "code": "CNPJ_INVALIDO",
                     "message": "...", "suggestion": "..." } ] } ] }
```

## Validações implementadas

- **Nome do sacado**: obrigatório, tamanho mínimo, sem acentos/caracteres especiais.
- **CNPJ do sacado** (ou CPF, conforme o tipo de inscrição): dígitos verificadores.
- **Telefone**: 10 ou 11 dígitos, DDD válido, celular começando com 9.
- **Nosso número**: obrigatório, numérico, não zerado, sem duplicidade no arquivo.
- **Seu número**: obrigatório, caracteres permitidos, sem duplicidade no arquivo.
- **Chave da nota**: 44 dígitos e dígito verificador da NF-e.
- **Endereço**: obrigatório, tamanho mínimo e CEP com 8 dígitos.
- **Estrutura do arquivo**: tamanho das linhas (400/444), header, trailer e detalhes.
