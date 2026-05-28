# Instalacao no servidor 192.168.1.210 (CIA DO SILK)

Guia para migrar **portal + API** para o servidor local da rede.

---

## 1. O que instalar no servidor

| Software | Versao | Para que serve | Onde baixar |
|----------|--------|----------------|-------------|
| **Node.js** | 20 LTS ou 22 | Rodar API e portal | https://nodejs.org (versao LTS) |
| **Git** | Ultima | Baixar/atualizar o projeto | https://git-scm.com |
| **PM2** (opcional, recomendado) | Ultima | Manter o sistema ligado apos reiniciar | `npm install -g pm2` |

**Nao precisa instalar:** Oracle Client pesado (o projeto usa `oracledb` em modo thin), Vercel, Railway, IIS (opcional).

Apos instalar Node, **feche e abra** o PowerShell e teste:

```powershell
node -v
npm -v
git --version
```

---

## 2. Rede e Oracle (muito importante)

### IP 192.168.1.210

- E o IP **interno** do servidor na rede da empresa.
- Outros PCs acessam o portal assim: `http://192.168.1.210:3333`

### IP para liberar no Oracle Cloud

O Oracle **nao** enxerga `192.168.1.210`. Ele enxerga o **IP publico de saida** da internet da empresa.

No servidor `192.168.1.210`, abra no navegador:

```text
https://ifconfig.me
```

Anote o IP que aparecer (ex.: `177.x.x.x`). Esse IP voce cadastra no Oracle:

1. Console Oracle → banco Autonomous → **Network** → **Access Control List**
2. Adicione: `177.x.x.x/32` (o IP do ifconfig.me)
3. Salve e aguarde 2–5 minutos

---

## 3. Firewall do Windows (servidor)

Liberar a porta **3333** para a rede interna:

1. **Painel de controle** → **Firewall do Windows** → **Configuracoes avancadas**
2. **Regras de entrada** → **Nova regra**
3. Porta → TCP → **3333** → Permitir → Nome: `CIA DO SILK Portal`

Ou no PowerShell (como Administrador):

```powershell
New-NetFirewallRule -DisplayName "CIADOSILK Portal 3333" -Direction Inbound -Protocol TCP -LocalPort 3333 -Action Allow
```

---

## 4. Copiar o projeto para o servidor

No servidor `192.168.1.210`, PowerShell:

```powershell
cd C:\Apps
git clone https://github.com/evandromxjunior/portal_web.git
cd portal_web
npm install
```

Se a pasta ja existir:

```powershell
cd C:\Apps\portal_web
git pull
npm install
```

---

## 5. Arquivo `.env` (configuracao principal)

Na pasta do projeto, crie ou copie o `.env` do seu PC (o que ja funciona no desenvolvimento).

Exemplo para **producao no servidor**:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3333
SERVE_WEB=true
USE_MOCK_DATA=false

ORACLE_USER=CIASILK
ORACLE_PASSWORD=sua_senha_aqui
ORACLE_CONNECT_STRING=201.157.219.14:1521/CG6V4Y_195977_W_high.paas.oracle.com

WINTHOR_DOCUMENT_COLUMN=CGCENT
RECEIVABLES_CACHE_TTL_MS=300000

BOLETO_FILE_BASE_PATH=\\10.0.1.3\winthor-share-file\Winthor

VITE_WHATSAPP_NUMBER=5511999999999
```

| Variavel | O que e |
|----------|---------|
| `SERVE_WEB=true` | Portal e API no mesmo endereco (nao precisa Vercel) |
| `USE_MOCK_DATA=false` | Consulta Oracle de verdade |
| `HOST=0.0.0.0` | Aceita conexoes de outros PCs da rede |
| `PORT=3333` | Porta do sistema |
| `BOLETO_FILE_BASE_PATH` | Pasta de PDF do Winthor (servidor precisa acessar `\\10.0.1.3`) |

**Conta de servico:** o Windows precisa conseguir ler `\\10.0.1.3\...` (usuario do PM2 ou sessao que inicia o Node com permissao na rede).

---

## 6. Build e primeira execucao

```powershell
cd C:\Apps\portal_web
npm run build:production
```

Teste manual:

```powershell
npm run start:production
```

Ou duplo clique em: **`iniciar-producao-windows.bat`**

### Testes no proprio servidor

| URL | Resultado esperado |
|-----|-------------------|
| http://localhost:3333 | Tela do portal CIA DO SILK |
| http://localhost:3333/api/health | `"status":"ok"` |
| http://localhost:3333/api/health/oracle | `"status":"ok"` |

### Teste de outro PC na rede

```text
http://192.168.1.210:3333
```

---

## 7. Deixar sempre ligado (PM2)

No servidor, PowerShell **como Administrador**:

```powershell
cd C:\Apps\portal_web
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Para iniciar apos reiniciar o Windows:

```powershell
npm install -g pm2-windows-startup
pm2-startup install
```

Comandos uteis:

```powershell
pm2 status
pm2 logs ciadosilk-portal
pm2 restart ciadosilk-portal
```

**Importante:** o PM2 usa o `.env` da pasta do projeto. Confirme que o arquivo esta em `C:\Apps\portal_web\.env`.

Ajuste `ecosystem.config.cjs` se o caminho da pasta for outro.

---

## 8. O que NAO precisa mais

| Item | Acao |
|------|------|
| Vercel | Pode desligar o projeto (opcional) |
| Railway | Pode pausar/remover o servico |
| `VITE_API_URL` | **Nao precisa** com `SERVE_WEB=true` |

---

## 9. Checklist final

- [ ] Node.js 20+ instalado no 192.168.1.210
- [ ] Git instalado
- [ ] Projeto clonado e `npm install` executado
- [ ] `.env` configurado (Oracle + pasta boleto)
- [ ] IP publico (ifconfig.me) liberado no Oracle ACL
- [ ] Firewall Windows porta 3333 liberada
- [ ] `npm run build:production` OK
- [ ] `/api/health/oracle` retorna OK
- [ ] Acesso `http://192.168.1.210:3333` de outro PC
- [ ] PM2 configurado (opcional)

---

## 10. Problemas comuns

| Problema | Solucao |
|----------|---------|
| Oracle timeout | Liberar IP publico (ifconfig.me) no Oracle, nao o 192.168.x |
| PDF nao abre | Servico Node sem permissao em `\\10.0.1.3` |
| Outro PC nao abre | Firewall porta 3333; servidor ligado; PM2 rodando |
| WhatsApp nao aparece | Definir `VITE_WHATSAPP_NUMBER` no `.env` **antes** do `build:production` |

---

## 11. Atualizar o sistema depois

```powershell
cd C:\Apps\portal_web
git pull
npm install
npm run build:production
pm2 restart ciadosilk-portal
```
