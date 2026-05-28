# Execute no servidor 192.168.1.210 (PowerShell como Administrador para firewall).
# Uso: powershell -ExecutionPolicy Bypass -File .\instalar-servidor-windows.ps1

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

Write-Host "=== CIA DO SILK - Instalacao servidor local ===" -ForegroundColor Cyan

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command node)) {
  Write-Host "ERRO: Node.js nao encontrado. Instale LTS em https://nodejs.org" -ForegroundColor Red
  exit 1
}

Write-Host "Node: $(node -v)"
Write-Host "npm:  $(npm -v)"

if (-not (Test-Path (Join-Path $projectRoot ".env"))) {
  Write-Host ""
  Write-Host "AVISO: Arquivo .env nao encontrado." -ForegroundColor Yellow
  Write-Host "Copie .env.example para .env e preencha Oracle antes de subir em producao."
  Write-Host ""
}

Set-Location $projectRoot
Write-Host "Instalando dependencias..."
npm install

Write-Host "Gerando build de producao..."
npm run build:production

Write-Host ""
Write-Host "Testando IP publico para Oracle (abra e libere no Oracle ACL):" -ForegroundColor Yellow
try {
  $publicIp = (Invoke-RestMethod -Uri "https://ifconfig.me/ip" -TimeoutSec 10).Trim()
  Write-Host "  IP publico de saida: ${publicIp}/32"
} catch {
  Write-Host "  Nao foi possivel detectar IP publico automaticamente. Use https://ifconfig.me no navegador."
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Green
Write-Host "  1. Libere o IP publico acima no Oracle Cloud (ACL do banco)"
Write-Host "  2. Configure .env (SERVE_WEB=true, USE_MOCK_DATA=false, Oracle, BOLETO_FILE_BASE_PATH)"
Write-Host "  3. Inicie: npm run start:production  OU  iniciar-producao-windows.bat"
Write-Host "  4. Acesse: http://192.168.1.210:3333"
Write-Host "  5. PM2: pm2 start ecosystem.config.cjs && pm2 save"
Write-Host ""

$openFirewall = Read-Host "Criar regra de firewall para porta 3333? (S/N)"
if ($openFirewall -eq "S" -or $openFirewall -eq "s") {
  New-NetFirewallRule -DisplayName "CIADOSILK Portal 3333" -Direction Inbound -Protocol TCP -LocalPort 3333 -Action Allow -ErrorAction SilentlyContinue
  Write-Host "Regra de firewall aplicada (ou ja existia)."
}

Write-Host "Concluido." -ForegroundColor Cyan
