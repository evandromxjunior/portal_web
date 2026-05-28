# Deploy da API (Node + Oracle)

O portal na **Vercel** é só o frontend. A consulta de boletos precisa desta API publicada na internet.

## Visão geral

```
[Vercel]  portal React  --VITE_API_URL-->  [Railway/VPS]  API Node  -->  Oracle WINTHOR
```

## Opção A — Railway (recomendado para começar)

### 1. Criar conta e projeto

1. Acesse [https://railway.app](https://railway.app) e entre com GitHub.
2. **New Project** → **Deploy from GitHub repo**.
3. Selecione o repositório `portal_web` (ou `intg_wint`).

### 2. Configurar o serviço

Em **Settings** do serviço:

| Campo | Valor |
|--------|--------|
| **Root Directory** | `.` (raiz) |
| **Build Command** | `npm install && npm run build:api` |
| **Start Command** | `npm start` |

Em **Networking** → **Generate Domain** (ex.: `portal-web-api-production.up.railway.app`).

Anote essa URL: será o `VITE_API_URL` na Vercel.

### 3. Variáveis de ambiente (Railway → Variables)

Copie do seu `.env` local (não commite o `.env`):

```env
NODE_ENV=production
USE_MOCK_DATA=false

ORACLE_USER=...
ORACLE_PASSWORD=...
ORACLE_CONNECT_STRING=201.157.219.14:1521/CG6V4Y_195977_W_high.paas.oracle.com

WINTHOR_DOCUMENT_COLUMN=CGCENT
RECEIVABLES_CACHE_TTL_MS=300000
```

Opcional (PDF na rede interna — **não funciona na nuvem** sem VPN):

```env
BOLETO_FILE_BASE_PATH=\\10.0.1.3\winthor-share-file\Winthor
```

Na Railway, deixe `BOLETO_FILE_BASE_PATH` **vazio** se não tiver VPN. A **linha digitável** e a listagem de títulos continuam funcionando; só o botão de PDF pode falhar.

### 4. Liberar Oracle para a Railway

No **Oracle Cloud** (banco Autonomous / PaaS):

1. Console → seu banco → **Network** / **Access Control**.
2. Inclua acesso da internet (ex.: `0.0.0.0/0`) **ou** os IPs de saída da Railway (veja logs ou documentação Railway).
3. Confirme porta **1521** (ou a que você usa na connect string).

Sem isso a API sobe, mas a consulta retorna erro 500 ao conectar no Oracle.

### 5. Testar a API

Após o deploy:

```text
https://SUA-URL-RAILWAY.app/api/health
```

Resposta esperada:

```json
{ "status": "ok", "mode": "winthor-oracle", ... }
```

Teste boletos:

```text
https://SUA-URL-RAILWAY.app/api/receivables?document=85862589546
```

(substitua pelo CPF de teste)

### 6. Ligar na Vercel

**Vercel** → projeto do portal → **Settings** → **Environment Variables**:

| Variável | Valor |
|----------|--------|
| `VITE_API_URL` | `https://SUA-URL-RAILWAY.app` (sem barra no final) |
| `VITE_WHATSAPP_NUMBER` | `5511...` |

**Redeploy** o projeto Vercel.

---

## Opção B — Render.com

1. [https://render.com](https://render.com) → **New** → **Web Service**.
2. Conecte o GitHub `portal_web`.
3. **Environment**: Node.
4. **Build Command**: `npm install && npm run build:api`
5. **Start Command**: `npm start`
6. **Health Check Path**: `/api/health`
7. Cole as mesmas variáveis de ambiente da Railway.
8. Use a URL `https://xxx.onrender.com` como `VITE_API_URL`.

---

## Opção C — Servidor Windows na empresa (melhor para PDF em `\\10.0.1.3`)

Use quando precisar do **PDF na pasta compartilhada** do Winthor.

### 1. Pré-requisitos no servidor

- Node.js 20+ instalado.
- Acesso à rede `\\10.0.1.3\...` e ao Oracle.

### 2. Publicar o código

```powershell
cd C:\caminho\intg_wint
git pull
npm install
npm run build:api
```

### 3. Arquivo `.env` na pasta do projeto

Mesmas variáveis do ambiente local (`USE_MOCK_DATA=false`, Oracle, `BOLETO_FILE_BASE_PATH`, etc.).

### 4. Rodar com PM2 (fica sempre no ar)

```powershell
npm install -g pm2
pm2 start dist/server/index.js --name ciadosilk-api
pm2 save
pm2 startup
```

### 5. Expor na internet (um dos jeitos)

- **IIS** como reverse proxy para `http://localhost:3333`
- **Cloudflare Tunnel** (não precisa abrir porta no firewall)
- **ngrok** (teste rápido): `ngrok http 3333`

URL pública → `VITE_API_URL` na Vercel.

---

## Checklist final

- [ ] `GET /api/health` retorna `"status":"ok"`.
- [ ] `GET /api/receivables?document=CPF` retorna JSON com títulos.
- [ ] `VITE_API_URL` configurado na Vercel.
- [ ] Redeploy Vercel feito após mudar variáveis.
- [ ] Portal abre e busca CPF sem erro de JSON.

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| Erro JSON / `<!doctype` no portal | `VITE_API_URL` vazio ou errado na Vercel |
| API 500 ao buscar CPF | Oracle bloqueando IP da nuvem |
| PDF não abre na nuvem | Pasta `\\10.0.1.3` só existe na rede interna |
| Build falha na nuvem | Use `build:api`, não `build:web`, no serviço da API |
