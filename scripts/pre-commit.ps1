# Pre-commit hook pentru AI Code Review (PowerShell)
# Acest script rulează automat înainte de fiecare commit și trimite
# modificările către serviciul AI pentru review

Write-Host "🔍 Rulare AI Code Review..." -ForegroundColor Cyan

# Verifică dacă există fișiere staged
$stagedFiles = git diff --cached --name-only --diff-filter=ACM
if (-not $stagedFiles) {
    Write-Host "✅ Niciun fișier modificat pentru review." -ForegroundColor Green
    exit 0
}

# Obține diff-ul complet al fișierelor staged
$gitDiff = git diff --cached
if (-not $gitDiff) {
    Write-Host "✅ Niciun diff pentru review." -ForegroundColor Green
    exit 0
}

# URL-ul backend-ului API
$apiUrl = if ($env:AI_REVIEW_API_URL) { $env:AI_REVIEW_API_URL } else { "http://localhost:5000/api/aireview" }
$jwtToken = $env:AI_REVIEW_JWT_TOKEN

# Verifică dacă token-ul JWT este setat
if (-not $jwtToken) {
    Write-Host "⚠️  AI Review: JWT_TOKEN nu este setat." -ForegroundColor Yellow
    Write-Host "   Setează variabila de mediu AI_REVIEW_JWT_TOKEN pentru a activa review-ul automat."
    Write-Host "   Exemplu: `$env:AI_REVIEW_JWT_TOKEN='your-jwt-token'"
    Write-Host "   Sau dezactivează hook-ul cu: git commit --no-verify"
    exit 0
}

# Pregătește JSON payload
$payload = @{
    gitDiff = $gitDiff
    fileName = "staged changes"
} | ConvertTo-Json -Depth 10

# Trimite cerere către API
try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $jwtToken"
    }
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $payload -ErrorAction Stop
    
    $findingsCount = if ($response.findings) { $response.findings.Count } else { 0 }
    Write-Host "✅ AI Review finalizat: $findingsCount probleme găsite" -ForegroundColor Green
    
    # Verifică dacă există probleme critice sau de severitate înaltă
    $criticalFindings = $response.findings | Where-Object { $_.severity -in @("critical", "high") }
    $criticalCount = if ($criticalFindings) { $criticalFindings.Count } else { 0 }
    
    if ($criticalCount -gt 0) {
        Write-Host ""
        Write-Host "❌ COMMIT BLOCAT: Găsite $criticalCount probleme critice/majore!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Probleme găsite:" -ForegroundColor Yellow
        foreach ($finding in $criticalFindings) {
            Write-Host "  - [$($finding.severity.ToUpper())] $($finding.file):$($finding.lineStart)-$($finding.lineEnd): $($finding.message)" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Te rugăm să remediezi problemele critice înainte de commit."
        Write-Host "Sau folosește --no-verify pentru a bypassa acest check (nerecomandat)."
        Write-Host ""
        exit 1
    }
    
    # Afișează problemele găsite (non-blocking)
    if ($findingsCount -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Atenție: Găsite probleme non-critice:" -ForegroundColor Yellow
        foreach ($finding in $response.findings) {
            Write-Host "  - [$($finding.severity.ToUpper())] $($finding.file):$($finding.lineStart)-$($finding.lineEnd): $($finding.message)" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Commit-ul va continua, dar te rugăm să revizuiești aceste probleme."
        Write-Host ""
    }
    
    Write-Host "✅ Pre-commit AI Review complet!" -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "⚠️  AI Review: Nu s-a putut conecta la API" -ForegroundColor Yellow
    Write-Host "   Eroare: $($_.Exception.Message)"
    Write-Host "   Continuarea commit-ului fără review..."
    exit 0
}

