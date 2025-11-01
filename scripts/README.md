# AI Code Review - Git Hooks

Acest director conține scripturi pentru integrarea AI Code Review în workflow-ul git.

## 📋 Fișiere

- **pre-commit** - Hook bash pentru Linux/Mac/Git Bash pe Windows
- **pre-commit.ps1** - Hook PowerShell pentru Windows
- **install-hook.ps1** - Script de instalare automată

## 🚀 Instalare

### Windows (PowerShell)

```powershell
# Din root-ul repository-ului
.\scripts\install-hook.ps1
```

### Linux/Mac

```bash
# Din root-ul repository-ului
chmod +x scripts/pre-commit
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## ⚙️ Configurare

Înainte de a folosi hook-ul, trebuie să configurezi:

1. **Backend-ul să ruleze**: Asigură-te că API-ul ASP.NET rulează (implicit pe `http://localhost:5000`)

2. **JWT Token**: Obține un token JWT prin autentificare și setează variabila de mediu:

   **Windows (PowerShell)**:
   ```powershell
   $env:AI_REVIEW_JWT_TOKEN = "your-jwt-token-here"
   ```

   **Linux/Mac (Bash)**:
   ```bash
   export AI_REVIEW_JWT_TOKEN="your-jwt-token-here"
   ```

3. **(Opțional) URL custom**: Dacă backend-ul rulează pe alt port:

   ```powershell
   $env:AI_REVIEW_API_URL = "http://localhost:XXXX/api/aireview"
   ```

## 🔍 Funcționare

Hook-ul se activează automat la fiecare `git commit` și:

1. Colectează toate modificările staged (`git diff --cached`)
2. Trimite diff-ul către API-ul de AI Review
3. Analizează rezultatele:
   - ❌ **Blochează commit-ul** dacă sunt găsite probleme **critical** sau **high**
   - ⚠️ **Avertizează** dacă sunt probleme **medium** sau **low** (dar permite commit-ul)
   - ✅ **Permite commit-ul** dacă nu sunt probleme majore

## 🛠️ Utilizare

### Commit normal (cu review)
```bash
git add .
git commit -m "your message"
# Hook-ul va rula automat
```

### Bypass hook (în cazuri urgente)
```bash
git commit --no-verify -m "urgent fix"
```

## 📊 Exemplu de output

```
🔍 Rulare AI Code Review...
✅ AI Review finalizat: 3 probleme găsite

⚠️  Atenție: Găsite probleme non-critice:
  - [MEDIUM] Backend/Services/MyService.cs:45-47: Unused variable 'temp'
  - [LOW] Backend/Controllers/MyController.cs:23-25: Missing XML documentation
  - [LOW] Frontend/src/App.tsx:102-103: Console.log statement in production

Commit-ul va continua, dar te rugăm să revizuiești aceste probleme.

✅ Pre-commit AI Review complet!
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

