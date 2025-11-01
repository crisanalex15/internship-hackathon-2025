#!/usr/bin/env pwsh
# Script pentru instalarea pre-commit hook-ului Review Assistant

Write-Host "🚀 Instalare Review Assistant Pre-Commit Hook" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verifică dacă suntem într-un repository Git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Eroare: Nu ești într-un repository Git!" -ForegroundColor Red
    Write-Host "   Rulează acest script din root-ul unui repository Git." -ForegroundColor Red
    exit 1
}

# Determină OS-ul și alege hook-ul corect
$hookSource = if ($IsWindows -or $env:OS -eq "Windows_NT") {
    "scripts/pre-commit-hook.ps1"
} else {
    "scripts/pre-commit-hook.sh"
}

$hookDestination = ".git/hooks/pre-commit"

# Verifică dacă fișierul sursă există
if (-not (Test-Path $hookSource)) {
    Write-Host "❌ Eroare: Fișierul $hookSource nu a fost găsit!" -ForegroundColor Red
    Write-Host "   Asigură-te că rulezi din root-ul proiectului Review Assistant." -ForegroundColor Red
    exit 1
}

# Verifică dacă există deja un hook
if (Test-Path $hookDestination) {
    Write-Host "⚠️  Există deja un pre-commit hook!" -ForegroundColor Yellow
    $response = Read-Host "   Vrei să îl suprascrii? (y/N)"
    
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "   Instalare anulată." -ForegroundColor Yellow
        exit 0
    }
    
    # Backup hook existent
    $backupPath = "$hookDestination.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $hookDestination $backupPath
    Write-Host "   ✅ Backup creat: $backupPath" -ForegroundColor Green
}

# Copiază hook-ul
Copy-Item $hookSource $hookDestination -Force

# Setează permisiuni de execuție (pe Unix/Linux/Mac)
if (-not ($IsWindows -or $env:OS -eq "Windows_NT")) {
    chmod +x $hookDestination
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Pre-commit hook instalat cu succes!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Următorii pași:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Asigură-te că backend-ul Review Assistant rulează:" -ForegroundColor White
Write-Host "   cd Backend" -ForegroundColor Gray
Write-Host "   dotnet run" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Autentifică-te (o singură dată):" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:5000/api/auth/login \\" -ForegroundColor Gray
Write-Host "     -H 'Content-Type: application/json' \\" -ForegroundColor Gray
Write-Host "     -d '{\"email\":\"user@example.com\",\"password\":\"password\"}' \\" -ForegroundColor Gray
Write-Host "     | jq -r '.token' > ~/.review-assistant-token" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Hook-ul va rula automat la fiecare commit!" -ForegroundColor White
Write-Host ""
Write-Host "💡 Sfaturi:" -ForegroundColor Cyan
Write-Host "   • Pentru a bypassa hook-ul: git commit --no-verify" -ForegroundColor Gray
Write-Host "   • Hook-ul blochează commit-urile cu probleme CRITICE" -ForegroundColor Gray
Write-Host "   • Problemele non-critice permit commit-ul să continue" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Pentru mai multe informații:" -ForegroundColor Cyan
Write-Host "   cat scripts/README.md" -ForegroundColor Gray
Write-Host ""

