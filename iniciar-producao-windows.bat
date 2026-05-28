@echo off
cd /d "%~dp0"
echo ========================================
echo  CIA DO SILK - Portal producao
echo ========================================
echo.
echo Build do portal + API...
call npm run build:production
if errorlevel 1 (
  echo Falha no build.
  pause
  exit /b 1
)
echo.
echo Iniciando em http://localhost:3333
echo Teste Oracle: http://localhost:3333/api/health/oracle
echo.
set NODE_ENV=production
set SERVE_WEB=true
set HOST=0.0.0.0
set PORT=3333
call npm run start:production
