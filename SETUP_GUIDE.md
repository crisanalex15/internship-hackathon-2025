# 🚀 Review Assistant - Ghid de Setup Rapid

## 📋 Cuprins

1. [Prerequisite](#prerequisite)
2. [Setup Backend](#setup-backend)
3. [Setup Frontend](#setup-frontend)
4. [Setup Ollama (AI)](#setup-ollama-ai)
5. [Setup Pre-commit Hook](#setup-pre-commit-hook)
6. [Testare Rapidă](#testare-rapidă)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisite

Asigură-te că ai instalate:

- ✅ **.NET 8.0 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
- ✅ **Node.js 18+** și npm - [Download](https://nodejs.org/)
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **Ollama** - [Download](https://ollama.ai/)

Verifică instalările:
```bash
dotnet --version  # Trebuie >= 8.0
node --version    # Trebuie >= 18
git --version
ollama --version
```

---

## 🔧 Setup Backend

### 1. Instalează dependențele

```bash
cd Backend
dotnet restore
```

### 2. Creează database (SQLite)

```bash
# Rulează migrațiile
dotnet ef database update

# Sau creează migrația nouă pentru Comments (dacă nu există):
dotnet ef migrations add AddCommentsTable
dotnet ef database update
```

### 3. Pornește backend-ul

```bash
dotnet run
```

Backend-ul va rula pe: **http://localhost:5000**

Verifică că funcționează:
```bash
curl http://localhost:5000/api/health
```

---

## 🎨 Setup Frontend

### 1. Instalează dependențele

```bash
cd Frontend
npm install
```

### 2. Pornește development server

```bash
npm run dev
```

Frontend-ul va rula pe: **http://localhost:5173**

Deschide browserul la **http://localhost:5173**

---

## 🤖 Setup Ollama (AI)

### 1. Instalează Ollama

**Windows:**
```powershell
# Download de pe https://ollama.ai/download
# Sau folosește winget:
winget install Ollama.Ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Mac:**
```bash
brew install ollama
```

### 2. Pornește Ollama

```bash
# Pornește serviciul (dacă nu pornește automat)
ollama serve
```

### 3. Download model AI

```bash
# Model recomandat pentru code review (7B parametri)
ollama pull qwen2.5-coder:7b

# Sau model mai mic/rapid (1.5B parametri):
ollama pull qwen2.5-coder:1.5b

# Sau model mai mare/precis (14B parametri):
ollama pull qwen2.5-coder:14b
```

### 4. Verifică instalarea

```bash
# Verifică că Ollama rulează
curl http://localhost:11434/api/tags

# Testează model-ul
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5-coder:7b",
  "prompt": "Write a hello world in Python",
  "stream": false
}'
```

---

## 🪝 Setup Pre-commit Hook

### Windows (PowerShell)

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

### Autentificare (pentru hook)

Hook-ul necesită un JWT token pentru a comunica cu backend-ul:

**Pas 1: Creează un utilizator (dacă nu există)**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "dev@example.com",
    "password": "Password123!",
    "firstName": "Developer",
    "lastName": "User"
  }'
```

**Pas 2: Obține token JWT**
```bash
# Bash/Linux/Mac
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"Password123!"}' \
  | jq -r '.token' > ~/.review-assistant-token

# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"dev@example.com","password":"Password123!"}'

$response.token | Out-File -FilePath "$HOME\.review-assistant-token" -NoNewline
```

---

## 🧪 Testare Rapidă

### 1. Testează Backend API

```bash
# Health check
curl http://localhost:5000/api/health

# Status Ollama
curl http://localhost:5000/api/aireview/status
```

### 2. Testează Frontend

- Deschide **http://localhost:5173**
- Înregistrează-te / Autentifică-te
- Încearcă să încarci un fișier de cod pentru review

### 3. Testează Pre-commit Hook

```bash
# Creează un fișier test
echo "console.log('test');" > test.js

# Stage și încearcă commit
git add test.js
git commit -m "test: pre-commit hook"

# Hook-ul ar trebui să ruleze automat! ✨
```

### 4. Testează Incremental Review (API direct)

```bash
curl -X POST http://localhost:5000/api/aireview/incremental \
  -H "Authorization: Bearer $(cat ~/.review-assistant-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryPath": ".",
    "baseRef": "HEAD~1",
    "targetRef": "HEAD"
  }'
```

### 5. Testează Comment System

```bash
# Adaugă comentariu
curl -X POST http://localhost:5000/api/comment \
  -H "Authorization: Bearer $(cat ~/.review-assistant-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewId": 1,
    "filePath": "Backend/test.cs",
    "lineNumber": 10,
    "message": "Consider adding validation here",
    "commentType": "suggestion",
    "severity": "medium"
  }'

# Vezi comentariile unui review
curl http://localhost:5000/api/comment/review/1 \
  -H "Authorization: Bearer $(cat ~/.review-assistant-token)"
```

---

## 🔧 Troubleshooting

### Backend nu pornește

**Problema**: "Port 5000 is already in use"
```bash
# Găsește procesul care folosește portul
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Linux/Mac

# Omoară procesul
taskkill /PID <PID> /F         # Windows
kill -9 <PID>                  # Linux/Mac
```

**Problema**: Database erori
```bash
# Șterge database-ul și recreează
rm Backend/App_Data/Backend.db
dotnet ef database update
```

### Ollama nu răspunde

**Problema**: "Connection refused la localhost:11434"
```bash
# Verifică dacă Ollama rulează
ollama serve

# Sau restart serviciu (Linux)
systemctl restart ollama

# Mac
brew services restart ollama
```

**Problema**: "Model not found"
```bash
# Vezi modelele disponibile
ollama list

# Download model
ollama pull qwen2.5-coder:7b
```

### Frontend nu se conectează la Backend

**Problema**: CORS errors în consolă
- Verifică că backend-ul rulează pe `http://localhost:5000`
- Verifică configurarea CORS în `Backend/Program.cs`
- Verifică URL-ul API în `Frontend/src/services/api.js`

### Pre-commit Hook nu rulează

**Problema**: Hook-ul nu se execută
```bash
# Verifică permisiuni
ls -la .git/hooks/pre-commit

# Fix permisiuni (Linux/Mac)
chmod +x .git/hooks/pre-commit

# Windows - verifică că fișierul există:
dir .git\hooks\pre-commit
```

**Problema**: "Token JWT invalid"
```bash
# Re-generează token-ul
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"Password123!"}' \
  | jq -r '.token' > ~/.review-assistant-token
```

### LibGit2Sharp erori

**Problema**: "Native library not found"
```bash
# Reinstall package
cd Backend
dotnet remove package LibGit2Sharp
dotnet add package LibGit2Sharp --version 0.30.0
dotnet restore
dotnet build
```

---

## 📊 Verificare Status Complet

Rulează acest script pentru a verifica că totul funcționează:

```bash
#!/bin/bash

echo "🔍 Verificare Review Assistant Setup"
echo "======================================"

# Backend
echo "✅ Backend (http://localhost:5000):"
curl -s http://localhost:5000/api/health && echo "  OK" || echo "  ❌ FAIL"

# Ollama
echo "✅ Ollama (http://localhost:11434):"
curl -s http://localhost:11434/api/tags > /dev/null && echo "  OK" || echo "  ❌ FAIL"

# Frontend
echo "✅ Frontend (http://localhost:5173):"
curl -s http://localhost:5173 > /dev/null && echo "  OK" || echo "  ❌ FAIL"

# Hook
echo "✅ Pre-commit Hook:"
test -f .git/hooks/pre-commit && echo "  OK" || echo "  ❌ FAIL"

# Token
echo "✅ JWT Token:"
test -f ~/.review-assistant-token && echo "  OK" || echo "  ❌ FAIL"

echo ""
echo "======================================"
echo "Setup complet! 🎉"
```

---

## 🎯 Next Steps

După setup, poți:

1. **Explorează UI-ul** - http://localhost:5173
2. **Testează pre-commit hook** - Fă un commit și vezi review-ul automat
3. **Citește documentația** - Vezi `REVIEW_ASSISTANT_FEATURES.md` pentru detalii complete
4. **Testează API-ul** - Vezi endpoint-urile în `REVIEW_ASSISTANT_FEATURES.md`

---

## 📚 Documentație Suplimentară

- **[REVIEW_ASSISTANT_FEATURES.md](REVIEW_ASSISTANT_FEATURES.md)** - Specificații complete și API
- **[scripts/README.md](scripts/README.md)** - Documentație pre-commit hooks
- **Backend Swagger** - http://localhost:5000/swagger (după pornirea backend-ului)

---

## 🆘 Suport

Dacă întâmpini probleme:

1. Verifică că toate prerequisite-urile sunt instalate corect
2. Verifică log-urile backend-ului pentru erori
3. Verifică consola browser-ului pentru erori frontend
4. Rulează scriptul de verificare status de mai sus

---

**Review Assistant** - AI-Powered Code Review Platform 🚀

Instalare completă în ~10 minute! ⚡

