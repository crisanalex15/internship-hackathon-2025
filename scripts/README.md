# Review Assistant - Git Hooks & Pre-Commit Evaluation

Acest director conține scripturi pentru integrarea Review Assistant în workflow-ul git, inclusiv **pre-commit evaluation** automată.

## 📋 Fișiere

### Hook-uri Pre-Commit
- **pre-commit-hook.sh** - Hook bash pentru Linux/Mac/Git Bash pe Windows
- **pre-commit-hook.ps1** - Hook PowerShell pentru Windows (mai bogat în features)

### Scripturi de Instalare
- **install-pre-commit-hook.sh** - Script de instalare automată pentru bash
- **install-pre-commit-hook.ps1** - Script de instalare automată pentru PowerShell

### Hook-uri Legacy (pentru compatibilitate)
- **pre-commit** - Hook bash original
- **pre-commit.ps1** - Hook PowerShell original
- **install-hook.ps1** - Script de instalare vechi

## 🚀 Instalare Rapidă

### Windows (PowerShell) - Recomandat

```powershell
# Din root-ul repository-ului
.\scripts\install-pre-commit-hook.ps1
```

### Linux/Mac/Git Bash

```bash
# Din root-ul repository-ului
chmod +x scripts/install-pre-commit-hook.sh
./scripts/install-pre-commit-hook.sh
```

### Instalare Manuală

```bash
# Bash/Linux/Mac
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# PowerShell/Windows
Copy-Item scripts\pre-commit-hook.ps1 .git\hooks\pre-commit
```

## ⚙️ Configurare

### 1. Pornește Backend-ul

```bash
cd Backend
dotnet run
```

Backend-ul va rula pe `http://localhost:5000` (implicit).

### 2. Autentificare (o singură dată)

Hook-ul necesită un JWT token pentru autentificare. Obține token-ul astfel:

**Folosind curl + jq**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token' > ~/.review-assistant-token
```

**Folosind PowerShell**:
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"user@example.com","password":"password"}'

$response.token | Out-File -FilePath "$HOME\.review-assistant-token" -NoNewline
```

**Salvare manuală**:
```bash
echo "your-jwt-token-here" > ~/.review-assistant-token
```

Token-ul se salvează în `~/.review-assistant-token` și este citit automat de hook.

### 3. (Opțional) Configurare URL Custom

Dacă backend-ul rulează pe alt port, modifică variabila `$API_URL` / `API_URL` din hook-ul instalat.

## 🔍 Funcționare (Pre-Commit Evaluation)

Hook-ul implementează **pre-commit evaluation** conform planului Review Assistant:

### Flux de Execuție

1. **Detectare Modificări Staged**: Hook-ul verifică `git diff --cached`
2. **Trimitere către Backend**: Modificările sunt trimise la `/api/aireview/pre-commit`
3. **Analiză AI**: Backend-ul folosește GitService + LibGit2Sharp pentru a analiza doar modificările
4. **Evaluare Severitate**: Sistemul calculează numărul de probleme critice/majore
5. **Decizie**:
   - ❌ **BLOCHEAZĂ commit-ul** dacă există probleme **CRITICE** (return exit 1)
   - ⚠️ **AVERTIZEAZĂ** pentru probleme **HIGH/MEDIUM** (dar permite commit)
   - ✅ **PERMITE commit-ul** dacă nu sunt probleme sau doar LOW severity

### Avantaje Pre-Commit Evaluation

- ✅ **Review incremental** - Analizează doar modificările, nu tot codul
- ✅ **Feedback instant** - Dezvoltatorul află imediat dacă există probleme
- ✅ **Previne probleme critice** - Commit-urile cu bug-uri grave sunt blocate
- ✅ **Non-intruziv** - Problemele minore nu blochează workflow-ul
- ✅ **Bypass disponibil** - `--no-verify` pentru cazuri urgente

## 🛠️ Utilizare

### Commit Normal (cu Review Automat)
```bash
git add .
git commit -m "feat: added new feature"
# Hook-ul rulează automat pre-commit evaluation
```

### Bypass Hook (Cazuri Urgente)
```bash
# Skip review-ul complet
git commit --no-verify -m "urgent hotfix"
```

### Testare Hook Manual
```bash
# Rulează hook-ul fără commit
.git/hooks/pre-commit
```

## 📊 Exemplu Output (PowerShell)

### ✅ Commit Permis (Fără Probleme)

```powershell
🔍 Review Assistant Pre-Commit Hook
═══════════════════════════════════════════════

📝 Fișiere staged pentru commit:
   - Backend/Services/MyService.cs
   - Frontend/src/components/NewComponent.jsx

🤖 Rulează AI Code Review...

═══════════════════════════════════════════════
✅ Review finalizat!
═══════════════════════════════════════════════

📊 Rezultate:
   • Total probleme: 0
   • Probleme critice: 0
   • Probleme majore: 0

✨ Nicio problemă detectată! Cod excelent!

✅ Commit-ul poate continua...
```

### ⚠️ Commit Permis (Cu Avertismente)

```powershell
🔍 Review Assistant Pre-Commit Hook
═══════════════════════════════════════════════

📝 Fișiere staged pentru commit:
   - Backend/Controllers/UserController.cs

🤖 Rulează AI Code Review...

═══════════════════════════════════════════════
✅ Review finalizat!
═══════════════════════════════════════════════

📊 Rezultate:
   • Total probleme: 3
   • Probleme critice: 0
   • Probleme majore: 1

⚠️  Au fost detectate 3 probleme (non-critice).
   Commit-ul va continua, dar te rugăm să revizuiești problemele.

   • [HIGH] UserController.cs:45 - Missing null check before accessing user object
   • [MEDIUM] UserController.cs:67 - Consider using async/await for database operations
   • [LOW] UserController.cs:12 - Missing XML documentation comment

   ... și încă 0 probleme

✅ Commit-ul poate continua...
```

### ❌ Commit Blocat (Probleme Critice)

```powershell
🔍 Review Assistant Pre-Commit Hook
═══════════════════════════════════════════════

📝 Fișiere staged pentru commit:
   - Backend/Services/AuthService.cs

🤖 Rulează AI Code Review...

═══════════════════════════════════════════════
✅ Review finalizat!
═══════════════════════════════════════════════

📊 Rezultate:
   • Total probleme: 2
   • Probleme critice: 2
   • Probleme majore: 0

❌ COMMIT BLOCAT!

   Au fost detectate 2 probleme CRITICE!
   Commit-ul nu poate fi efectuat până când problemele sunt rezolvate.

   Probleme critice:
   • [AuthService.cs:34] SQL injection vulnerability in query construction
   • [AuthService.cs:52] Password stored in plain text without hashing

   Pentru a ignora review-ul și forța commit-ul, folosește:
   git commit --no-verify
```

## 🔧 Troubleshooting

### Hook-ul nu se execută
- Verifică că fișierul `.git/hooks/pre-commit` există și are permisiuni de execuție
- Pe Windows, asigură-te că Git poate rula scripturi bash (Git Bash instalat)

### Erori de conexiune
- Verifică că backend-ul ASP.NET rulează
- Verifică URL-ul API-ului (implicit: `http://localhost:5000/api/aireview`)
- Verifică că JWT token-ul este valid și nu a expirat

### Token expirat
- Obține un token nou prin autentificare
- Actualizează variabila de mediu `AI_REVIEW_JWT_TOKEN`

## 📝 Note

- Hook-ul este **non-blocking** pentru probleme low/medium (doar avertizează)
- Hook-ul este **blocking** pentru probleme critical/high (previne commit-ul)
- Dacă API-ul nu este disponibil, hook-ul permite commit-ul cu o avertizare
- Poți dezactiva complet hook-ul cu `git commit --no-verify`

