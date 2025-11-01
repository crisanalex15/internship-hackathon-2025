# Script de instalare pentru pre-commit hook
# Rulează acest script pentru a instala hook-ul în repository-ul tău git

Write-Host "📦 Instalare AI Code Review pre-commit hook..." -ForegroundColor Cyan

# Verifică dacă suntem într-un repository git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Eroare: Nu te afli într-un repository git!" -ForegroundColor Red
    Write-Host "   Rulează acest script din root-ul repository-ului." -ForegroundColor Yellow
    exit 1
}

# Creează directorul hooks dacă nu există
$hooksDir = ".git/hooks"
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
}

# Copiază hook-ul
$sourceHook = "scripts/pre-commit"
$destHook = "$hooksDir/pre-commit"

if (Test-Path $sourceHook) {
    Copy-Item $sourceHook $destHook -Force
    Write-Host "✅ Pre-commit hook instalat cu succes!" -ForegroundColor Green
} else {
    Write-Host "❌ Eroare: Fișierul $sourceHook nu a fost găsit!" -ForegroundColor Red
    exit 1
}

# Pe Windows, Git poate folosi bash sau PowerShell
# Verifică dacă Git Bash este disponibil
Write-Host ""
Write-Host "ℹ️  Configurare:" -ForegroundColor Cyan
Write-Host "   1. Asigură-te că backend-ul ASP.NET rulează pe http://localhost:5000"
Write-Host "   2. Obține un JWT token prin autentificare"
Write-Host "   3. Setează variabila de mediu:"
Write-Host "      `$env:AI_REVIEW_JWT_TOKEN = 'your-jwt-token-here'" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Pentru a dezactiva hook-ul temporar:"
Write-Host "      git commit --no-verify" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Instalare completă!" -ForegroundColor Green

