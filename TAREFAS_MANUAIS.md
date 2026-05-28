# O que voce precisa fazer manualmente

O restante (codigo, configs Railway/Docker, CORS, scripts) ja esta no GitHub.

---

## 1. Railway — criar e publicar a API (~10 min)

1. Acesse [https://railway.app](https://railway.app) e entre com **GitHub**.
2. **New Project** → **Deploy from GitHub repo** → escolha **`portal_web`**.
3. O Railway deve detectar o `railway.toml` automaticamente.
4. Aba **Variables** → **Raw Editor** → cole as variaveis do arquivo **`.env.production.example`**, preenchendo:
   - `ORACLE_USER`
   - `ORACLE_PASSWORD`
   - `ORACLE_CONNECT_STRING` (igual ao seu `.env` local)
5. Ajuste `CORS_ORIGIN` com a URL real do portal na Vercel (ex.: `https://ciadosilk-2via-portal.vercel.app`).
6. **Settings** → **Networking** → **Generate Domain**.
7. Copie a URL publica (ex.: `https://xxxx.up.railway.app`).

**Teste no navegador:** `https://SUA-URL.up.railway.app/api/health`  
Deve aparecer `"status":"ok"`.

Opcional no seu PC:

```bash
npm run verify:api -- https://SUA-URL.up.railway.app 85862589546
```

---

## 2. Oracle Cloud — liberar acesso da Railway (~5 min)

1. Console Oracle → banco Autonomous / PaaS usado pelo Winthor.
2. **Network** → **Access Control List** (ou equivalente).
3. Permita conexao externa (ex.: `0.0.0.0/0`) **ou** os IPs de saida da Railway.
4. Salve e aguarde 1–2 minutos.

Sem este passo a API sobe, mas a busca por CPF retorna erro 500.

---

## 3. Vercel — ligar portal a API (~3 min)

1. [vercel.com](https://vercel.com) → projeto do portal.
2. **Settings** → **Environment Variables**:
   - `VITE_API_URL` = `https://SUA-URL.up.railway.app` (sem `/` no final)
   - `VITE_WHATSAPP_NUMBER` = numero com DDI (ex.: `5511999999999`)
3. **Deployments** → ultimo deploy → **Redeploy**.

---

## 4. Teste final

1. Abra o portal na Vercel.
2. Informe um CPF/CNPJ com titulos em aberto.
3. Deve listar boletos sem erro de JSON.

---

## Se algo falhar

| Problema | O que verificar |
|----------|------------------|
| Erro JSON no portal | `VITE_API_URL` + redeploy Vercel |
| `/api/health` nao abre | Deploy Railway falhou — ver **Logs** |
| Health OK, CPF da 500 | Oracle ACL (passo 2) ou senha Oracle errada |
| PDF nao abre | Normal na nuvem; PDF exige API na rede interna |

---

## PDF na pasta `\\10.0.1.3` (opcional, depois)

Se precisar do PDF do arquivo de rede, a API deve rodar em **servidor Windows na empresa**, nao na Railway. Veja `DEPLOY_API.md` opcao C.
