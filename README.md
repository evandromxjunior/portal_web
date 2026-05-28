# Sistema de 2ª via de boletos WINTHOR

Portal web para consulta de contas a receber e 2ª via de boleto, com backend preparado para consultar o Oracle do ERP WINTHOR.

## Stack

- React + Vite no frontend.
- Node.js + TypeScript + Express no backend.
- `oracledb` para conexão com Oracle/WINTHOR.
- Cliente HTTP configurável para APIs TOTVS/WTA.
- Camada de repositório separada para facilitar a futura integração com WhatsApp.

## Como rodar em modo demonstração

1. Instale as dependências:

```bash
npm install
```

2. Copie o arquivo de ambiente:

```bash
copy .env.example .env
```

3. Mantenha `USE_MOCK_DATA=true`.

4. Rode o sistema:

```bash
npm run dev
```

No Windows, voce tambem pode abrir o arquivo:

```text
iniciar-sistema.bat
```

5. Acesse o portal:

```text
http://localhost:5173
```

Documento de teste:

```text
12.345.678/0001-95
```

## Como ligar no Oracle do WINTHOR

No arquivo `.env`, configure:

```env
USE_MOCK_DATA=false
ORACLE_USER=usuario_leitura
ORACLE_PASSWORD=senha
ORACLE_CONNECT_STRING=host:porta/service_name
```

Exemplo de connect string:

```env
ORACLE_CONNECT_STRING=192.168.0.10:1521/WINT
```

Se o arquivo `.env` ainda não existir, crie a partir do exemplo:

```bash
copy .env.example .env
```

O backend possui uma SQL padrão em `server/src/repositories/winthorReceivablesRepository.ts`, usando tabelas comuns do WINTHOR:

- `PCCLIENT`: cadastro de cliente.
- `PCPREST`: títulos/contas a receber.

A SQL padrão retorna títulos em aberto por CPF/CNPJ do cliente. Ela deixa `LINE_DIGITAVEL`, `BOLETO_URL` e `PDF_BASE64` como `NULL`, porque o local exato da linha digitável/PDF depende da parametrização de boleto no WINTHOR e do banco emissor.

Na consulta padrão, o sistema também verifica automaticamente se existem colunas comuns de boleto na `PCPREST`, como linha digitável, código de barras, URL ou PDF. Se encontrar uma coluna conhecida, ela já será retornada para o portal.

## Clientes Com Titulos Em Mais De Uma Filial

Quando a empresa possui varios CNPJs/razoes sociais, os titulos do mesmo cliente podem existir em mais de uma filial. O sistema trata isso pela filial gravada no titulo:

- A consulta busca todos os titulos em aberto do CPF/CNPJ informado.
- Cada titulo retorna `branchCode`, `branchName` e `branchDocument`, quando encontrados.
- A origem da filial vem de `PCPREST.CODFILIAL`.
- A razao/CNPJ da filial vem de `PCFILIAL`, quando a tabela/colunas estiverem disponiveis.
- No portal, se houver mais de uma filial, o cliente visualiza filtros por filial/razao.

Assim, o cliente nao precisa escolher a empresa antes da consulta. Ele informa CPF/CNPJ uma vez e o portal separa os boletos conforme a filial emissora.

## Diagnosticar campos de boleto no WINTHOR

Depois de configurar o `.env` com acesso Oracle, rode:

```bash
npm run winthor:diagnose-boleto
```

Esse comando lista colunas candidatas em `PCPREST` e outras tabelas `PC*`, procurando nomes relacionados a boleto, barra, digitável, nosso número, PDF e URL.

Com esse resultado, ajuste `WINTHOR_RECEIVABLES_SQL` caso a linha digitável/PDF esteja em outra tabela além da `PCPREST`.

## Ajustar SQL de boleto

Se você souber a SQL exata para buscar a linha digitável ou o PDF, configure no `.env`:

```env
WINTHOR_RECEIVABLES_SQL=SELECT ... FROM ... WHERE REGEXP_REPLACE(c.cgccpf, '[^0-9]', '') = :document
```

A SQL deve usar o bind `:document` e retornar estes aliases quando existirem:

```text
ID
CUSTOMER_CODE
CUSTOMER_NAME
DOCUMENT
INVOICE_NUMBER
INSTALLMENT
DUE_DATE
AMOUNT
PAID_AMOUNT
PAYMENT_DATE
LINE_DIGITAVEL
BOLETO_URL
PDF_BASE64
```

Campos mínimos para o portal funcionar:

```text
ID, CUSTOMER_NAME, DOCUMENT, INVOICE_NUMBER, DUE_DATE, AMOUNT
```

## API oficial TOTVS/WTA

A documentação TOTVS enviada indica:

- Antes de usar as APIs, é necessário instalar/configurar os serviços WTA, incluindo `winthor-ferramenta-gateway`.
- Para clientes, existe o endpoint `GET /api/wholesale/v1/customer/list`.
- Esse endpoint aceita `personIdentificationNumber` para buscar por CPF/CNPJ.
- A senha WTA deve ser usada em MD5 com letras maiúsculas, conforme orientação da TOTVS.

Configure no `.env`:

```env
TOTVS_API_BASE_URL=http://servidor-wta:porta
TOTVS_API_BRANCH_ID=1
TOTVS_API_CUSTOMER_LIST_PATH=/api/wholesale/v1/customer/list
```

Para autenticação, use uma das opções:

```env
TOTVS_API_TOKEN=token_gerado_no_wta
```

ou:

```env
TOTVS_API_LOGIN_PATH=/winthor/autenticacao/v1/login
TOTVS_API_LOGIN_USER=usuario
TOTVS_API_LOGIN_PASSWORD=senha_original
TOTVS_API_PASSWORD_MODE=md5_upper
TOTVS_API_LOGIN_USER_FIELD=login
TOTVS_API_LOGIN_PASSWORD_FIELD=senha
TOTVS_API_TOKEN_FIELD=accessToken
```

A documentação TOTVS informa que o login usa:

```http
POST /winthor/autenticacao/v1/login
```

Body:

```json
{
  "login": "USUARIO",
  "senha": "SENHA_EM_MD5_MAIUSCULO"
}
```

Resposta:

```json
{
  "accessToken": "chaveToken"
}
```

Para gerar apenas a senha MD5 em letras maiúsculas localmente:

```bash
npm run totvs:token -- sua_senha_wta
```

Para tentar gerar o token automaticamente, preencha no `.env`:

```env
TOTVS_API_BASE_URL=http://servidor-wta:porta
TOTVS_API_LOGIN_PATH=/winthor/autenticacao/v1/login
TOTVS_API_LOGIN_USER=usuario
TOTVS_API_LOGIN_PASSWORD=sua_senha_wta
```

Depois rode:

```bash
npm run totvs:token
```

Se você já tiver gerado o MD5 manualmente, informe o hash em `TOTVS_API_LOGIN_PASSWORD` e use:

```env
TOTVS_API_PASSWORD_MODE=already_md5
```

O hash será enviado em letras maiúsculas, sem aplicar MD5 novamente.

Se a resposta da API retornar o token em outro campo, ajuste:

```env
TOTVS_API_TOKEN_FIELD=nome_do_campo
```

Consulta de cliente pela API TOTVS:

```http
GET /api/winthor-api/customers?document=12345678000195
```

Observação importante: na documentação analisada não apareceu uma API pública específica para contas a receber ou emissão de 2ª via de boleto. Por isso, neste momento, a busca dos títulos/boletos continua pelo Oracle, usando `PCPREST` e a SQL configurável.

## Endpoints

Saúde da API:

```http
GET /api/health
```

Consulta de boletos:

```http
GET /api/receivables?document=12345678000195
```

Consulta de cliente pela API oficial TOTVS/WTA:

```http
GET /api/winthor-api/customers?document=12345678000195
```

Webhook reservado para WhatsApp:

```http
POST /api/whatsapp/webhook
```

## Próximas etapas recomendadas

1. Validar no WTA o caminho real de login/token e testar `GET /api/winthor-api/customers`.
2. Confirmar com a TOTVS se existe endpoint oficial de contas a receber/segunda via de boleto no ambiente de vocês.
3. Se não houver endpoint oficial, validar no Oracle quais campos/tabelas guardam a linha digitável, código de barras, PDF ou link do boleto.
4. Ajustar a SQL em `WINTHOR_RECEIVABLES_SQL`.
5. Adicionar autenticação por token temporário antes de liberar em produção para clientes externos.
6. Escolher provedor de WhatsApp: Meta Cloud API, Z-API, Take Blip, Twilio ou outro.
7. Implementar o fluxo WhatsApp usando a mesma API de consulta já criada.
