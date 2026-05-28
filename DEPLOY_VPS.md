# Deploy em VPS ou servidor local (recomendado)

## Por que mudar de Vercel + Railway?

- Os titulos **so existem no Oracle** (nao ha API TOTVS para isso).
- O Oracle/TOTVS exige **IP fixo liberado**.
- Vercel e Railway **nao tem IP fixo** para cadastrar.
- Solucao: rodar **portal + API no mesmo servidor** com IP liberado no Oracle.

```
[Internet] --> [VPS ou servidor da empresa - IP FIXO]
                    |
                    +-- Portal (React)
                    +-- API (Node)
                    +-- Oracle (liberado para este IP)
                    +-- Pasta PDF \\10.0.1.3 (se servidor Windows na rede)
```

---

## Caminho A — Servidor Windows na empresa (mais simples se ja acessa Oracle)

### 1. Descobrir o IP publico do escritorio

No navegador, abra: https://ifconfig.me  
Anote o IP (ex.: `177.x.x.x`). Se for IP dinamico, peca IP fixo ao provedor ou use VPS.

### 2. Liberar no Oracle Cloud

Console Oracle → banco → **Network / ACL** → adicione o IP publico do servidor (`177.x.x.x/32`).

### 3. Instalar Node.js 20+

https://nodejs.org — reinicie o PC apos instalar.

### 4. Clonar o projeto

```powershell
cd C:\Apps
git clone https://github.com/evandromxjunior/portal_web.git
cd portal_web
npm install
```

### 5. Configurar `.env`

Copie do seu PC o `.env` que ja funciona com `npm run dev`, e ajuste:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3333
SERVE_WEB=true
USE_MOCK_DATA=false

ORACLE_USER=...
ORACLE_PASSWORD=...
ORACLE_CONNECT_STRING=...

WINTHOR_DOCUMENT_COLUMN=CGCENT
BOLETO_FILE_BASE_PATH=\\10.0.1.3\winthor-share-file\Winthor
VITE_WHATSAPP_NUMBER=5511...
```

**Nao precisa** `VITE_API_URL` quando `SERVE_WEB=true` (portal e API no mesmo endereco).

### 6. Build e iniciar

Duplo clique em `iniciar-producao-windows.bat`  
ou:

```powershell
npm run build:production
npm run start:production
```

### 7. Testar na rede interna

```text
http://IP-DO-SERVIDOR:3333
http://IP-DO-SERVIDOR:3333/api/health/oracle
```

### 8. Deixar sempre ligado (PM2 no Windows)

```powershell
npm install -g pm2 pm2-windows-startup
pm2 start ecosystem.config.cjs
pm2 save
pm2-startup install
```

### 9. Expor na internet (opcional)

- Abrir porta **3333** no firewall Windows (somente se necessario).
- Ou usar **Cloudflare Tunnel** (nao precisa IP fixo nem abrir porta).
- Ou IIS como proxy reverso para `localhost:3333`.

---

## Caminho B — VPS Linux (IP fixo na nuvem)

### 1. Contratar VPS

Ex.: Hostinger, Contabo, Oracle Cloud VM, AWS Lightsail.  
Ubuntu 22.04, 1 GB RAM minimo.

### 2. Liberar IP da VPS no Oracle

IP publico da VPS → Oracle ACL (`x.x.x.x/32`).

### 3. Instalar no servidor

```bash
sudo apt update
sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
cd /var/www
sudo git clone https://github.com/evandromxjunior/portal_web.git
cd portal_web
sudo npm install
```

Crie `/var/www/portal_web/.env` (mesmas variaveis do Caminho A, **sem** pasta `\\10.0.1.3` se a VPS nao estiver na rede — PDF nao funcionara na VPS).

```bash
npm run build:production
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Nginx + dominio

```bash
sudo cp nginx/ciadosilk-portal.conf.example /etc/nginx/sites-available/ciadosilk
sudo nano /etc/nginx/sites-available/ciadosilk   # ajuste server_name
sudo ln -s /etc/nginx/sites-available/ciadosilk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d boletos.seudominio.com.br
```

Acesso: `https://boletos.seudominio.com.br`

---

## Vercel e Railway

Podem ser **desligados** ou mantidos apenas como teste. Em producao use **um unico endereco** (VPS/servidor).

Se mantiver Vercel só como front, `VITE_API_URL` deve apontar para `https://boletos.seudominio.com.br` — mas e mais simples usar **so o servidor** com `SERVE_WEB=true`.

---

## Checklist

- [ ] IP do servidor liberado no Oracle ACL
- [ ] `GET /api/health/oracle` retorna `"status":"ok"`
- [ ] Portal abre e busca CPF lista titulos
- [ ] PM2 ou servico Windows configurado para reiniciar automatico
- [ ] HTTPS configurado (nginx + certbot) se for internet

---

## O que voce precisa fazer manualmente

1. Escolher: **servidor Windows local** ou **VPS Linux**.
2. Anotar o **IP publico** e cadastrar no **Oracle**.
3. Copiar o `.env` que ja funciona no seu PC.
4. Rodar build + PM2 (scripts acima).
5. (Opcional) Apontar dominio DNS para o servidor.
