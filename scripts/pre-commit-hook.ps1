#!/usr/bin/env pwsh
# Pre-commit hook pentru Review Assistant
# Rulează automat AI review pe modificările staged înainte de commit

Write-Host "🔍 Review Assistant Pre-Commit Hook" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

# Configurare
$API_URL = "http://localhost:5000/api/aireview/pre-commit"
$JWT_TOKEN_FILE = "$HOME/.review-assistant-token"

# Verifică dacă există token JWT
if (-not (Test-Path $JWT_TOKEN_FILE)) {
    Write-Host "⚠️  Token JWT nu a fost găsit!" -ForegroundColor Yellow
    Write-Host "   Te rugăm să te autentifici mai întâi folosind:" -ForegroundColor Yellow
    Write-Host "   review-assistant login" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "   Commit-ul va continua fără review..." -ForegroundColor Yellow
    exit 0
}

# Citește token-ul
$JWT_TOKEN = Get-Content $JWT_TOKEN_FILE -Raw

# Obține path-ul repository-ului
$REPO_PATH = git rev-parse --show-toplevel

# Verifică dacă există modificări staged
$STAGED_FILES = git diff --cached --name-only
if ($STAGED_FILES.Count -eq 0) {
    Write-Host "ℹ️  Nu există modificări staged pentru review." -ForegroundColor Yellow
    exit 0
}

Write-Host "📝 Fișiere staged pentru commit:" -ForegroundColor Green
foreach ($file in $STAGED_FILES) {
    Write-Host "   - $file" -ForegroundColor Gray
}
Write-Host ""

Write-Host "🤖 Rulează AI Code Review..." -ForegroundColor Cyan

# Creează request body
$requestBody = @{
    repositoryPath = $REPO_PATH
} | ConvertTo-Json

# Trimite cerere către API
try {
    $headers = @{
        "Authorization" = "Bearer $JWT_TOKEN"
        "Content-Type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Body $requestBody -Headers $headers -ErrorAction Stop

    # Verifică rezultatele
    if ($response.success) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
        Write-Host "✅ Review finalizat!" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Rezultate:" -ForegroundColor Cyan
        Write-Host "   • Total probleme: $($response.totalIssuesCount)" -ForegroundColor White
        Write-Host "   • Probleme critice: $($response.criticalIssuesCount)" -ForegroundColor Red
        Write-Host "   • Probleme majore: $($response.highIssuesCount)" -ForegroundColor Yellow
        Write-Host ""

        if ($response.shouldBlockCommit) {
            Write-Host "❌ COMMIT BLOCAT!" -ForegroundColor Red -BackgroundColor DarkRed
            Write-Host ""
            Write-Host "   Au fost detectate $($response.criticalIssuesCount) probleme CRITICE!" -ForegroundColor Red
            Write-Host "   Commit-ul nu poate fi efectuat până când problemele sunt rezolvate." -ForegroundColor Red
            Write-Host ""
            Write-Host "   Probleme critice:" -ForegroundColor Yellow
            
            foreach ($finding in $response.findings | Where-Object { $_.severity -eq "critical" }) {
                Write-Host "   • [$($finding.file):$($finding.lineStart)] $($finding.message)" -ForegroundColor Red
            }

            Write-Host ""
            Write-Host "   Pentru a ignora review-ul și forța commit-ul, folosește:" -ForegroundColor Gray
            Write-Host "   git commit --no-verify" -ForegroundColor Gray
            Write-Host ""
            exit 1
        } else {
            if ($response.totalIssuesCount -gt 0) {
                Write-Host "⚠️  Au fost detectate $($response.totalIssuesCount) probleme (non-critice)." -ForegroundColor Yellow
                Write-Host "   Commit-ul va continua, dar te rugăm să revizuiești problemele." -ForegroundColor Yellow
                Write-Host ""
                
                foreach ($finding in $response.findings | Select-Object -First 5) {
                    $color = switch ($finding.severity) {
                        "high" { "Yellow" }
                        "medium" { "White" }
                        default { "Gray" }
                    }
                    Write-Host "   • [$($finding.severity.ToUpper())] $($finding.file):$($finding.lineStart) - $($finding.message)" -ForegroundColor $color
                }

                if ($response.findings.Count -gt 5) {
                    Write-Host "   ... și încă $($response.findings.Count - 5) probleme" -ForegroundColor Gray
                }
                Write-Host ""
            } else {
                Write-Host "✨ Nicio problemă detectată! Cod excelent!" -ForegroundColor Green
                Write-Host ""
            }
            
            Write-Host "✅ Commit-ul poate continua..." -ForegroundColor Green
            exit 0
        }
    } else {
        Write-Host "❌ Eroare la efectuarea review-ului: $($response.errorMessage)" -ForegroundColor Red
        Write-Host "   Commit-ul va continua..." -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "❌ Eroare la comunicarea cu API-ul Review Assistant:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Commit-ul va continua fără review..." -ForegroundColor Yellow
    exit 0
}

