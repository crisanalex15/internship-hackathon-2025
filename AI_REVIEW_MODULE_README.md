# 🤖 AI-Powered Code Review Assistant

Un sistem complet de code review automat folosind **Ollama** (LLama 3 / CodeLlama) local pentru analiza codului și detecția automată a problemelor.

---

## 📋 Cuprins

- [Arhitectură](#-arhitectură)
- [Caracteristici](#-caracteristici)
- [Instalare și Configurare](#-instalare-și-configurare)
- [Utilizare](#-utilizare)
- [API Documentation](#-api-documentation)
- [Frontend](#-frontend)
- [Git Hook Integration](#-git-hook-integration)
- [Troubleshooting](#-troubleshooting)

---

## 🏗️ Arhitectură

### Backend (ASP.NET Core)

```
Backend/
├── Controllers/API/
│   └── AIReviewController.cs          # Endpoint-uri REST API
├── Services/AI/
│   ├── LLMClient.cs                   # Client pentru Ollama API
│   ├── AIReviewService.cs             # Logica principală de review
│   └── prompt-template.txt            # Template pentru prompt-uri LLM
├── Models/
│   └── ReviewHistory.cs               # Model pentru baza de date
├── DTO/ReviewDTO/
│   ├── ReviewRequest.cs               # DTO-uri pentru cereri
│   ├── ReviewResponse.cs              # DTO-uri pentru răspunsuri
│   └── ApplyFixRequest.cs             # DTO pentru aplicarea patch-urilor
```

### Frontend (React + Mantine UI)

```
Frontend/src/
├── components/review/
│   ├── CodeReviewPanel.jsx            # Componenta principală
│   ├── FindingsList.jsx               # Lista de probleme găsite
│   └── ReviewHistory.jsx              # Istoricul review-urilor
├── services/
│   └── review.service.js              # Client API pentru frontend
```

### Git Hooks

```
scripts/
├── pre-commit                         # Hook bash pentru Linux/Mac
├── pre-commit.ps1                     # Hook PowerShell pentru Windows
├── install-hook.ps1                   # Script de instalare automată
└── README.md                          # Documentație hook-uri
```

---

## ✨ Caracteristici

### 🔍 Code Review Automat

- ✅ **Full Code Review** - Analizează cod complet
- ✅ **Git Diff Review** - Analizează doar modificările (incremental)
- ✅ **Multi-Language Support** - JavaScript, TypeScript, C#, Python, Go, Rust, Java, C++
- ✅ **Severity Levels** - Critical, High, Medium, Low
- ✅ **Categories** - Security, Performance, Style, Bug, Maintainability

### 🛠️ Fix Management

- ✅ **Automated Patches** - Generare patch-uri în format git diff
- ✅ **Apply Fix** - Aplicare automată a patch-urilor (experimental)
- ✅ **Explain More** - Obține explicații detaliate pentru fiecare problemă

### 📊 History & Analytics

- ✅ **Review History** - Salvare istoricul în SQLite
- ✅ **Effort Estimation** - Estimează efortul de remediere (ore + complexitate)
- ✅ **User-Specific** - Fiecare utilizator are istoricul său

### 🔗 Git Integration

- ✅ **Pre-commit Hook** - Review automat înainte de commit
- ✅ **Blocking Mode** - Blochează commit-urile cu probleme critice
- ✅ **Warning Mode** - Avertizează pentru probleme non-critice

---

## 🚀 Instalare și Configurare

### Prerequisite

1. **Ollama** instalat și rulând local

   ```bash
   # Instalare Ollama (Linux/Mac)
   curl -fsSL https://ollama.com/install.sh | sh

   # Instalare model CodeLlama
   ollama pull codellama

   # SAU Llama3
   ollama pull llama3

   # Pornește Ollama (implicit pe port 11434)
   ollama serve
   ```

2. **.NET 8 SDK** pentru backend
3. **Node.js 18+** pentru frontend

### Backend Setup

1. **Configurare Ollama în `appsettings.json`:**

```json
{
  "Ollama": {
    "BaseUrl": "http://localhost:11434",
    "DefaultModel": "codellama"
  }
}
```

2. **Rulare migrare baza de date:**

```bash
cd Backend
dotnet ef database update
```

3. **Pornire backend:**

```bash
cd Backend
dotnet run
```

Backend-ul va rula implicit pe `http://localhost:5086`

### Frontend Setup

1. **Instalare dependențe:**

```bash
cd Frontend
npm install
```

2. **Configurare API URL (opțional):**

Creează `.env` în `Frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5086/api
```

3. **Pornire frontend:**

```bash
npm run dev
```

Frontend-ul va rula pe `http://localhost:5173`

### Git Hook Setup

```powershell
# Windows (PowerShell)
.\scripts\install-hook.ps1

# Setează JWT token (după autentificare)
$env:AI_REVIEW_JWT_TOKEN = "your-jwt-token-here"
```

```bash
# Linux/Mac
chmod +x scripts/pre-commit
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Setează JWT token
export AI_REVIEW_JWT_TOKEN="your-jwt-token-here"
```

---

## 💻 Utilizare

### 1. Via Web UI

1. **Accesează frontend-ul:**

   ```
   http://localhost:5173/review
   ```

2. **Full Code Review:**

   - Selectează limbajul de programare
   - Introdu numele fișierului
   - Copiază codul în textarea
   - Click "Efectuează Review"

3. **Git Diff Review:**

   - Schimbă tab-ul la "Git Diff Review"
   - Rulează `git diff` în terminal și copiază output-ul
   - Paste în textarea
   - Click "Efectuează Review"

4. **Review History:**
   - Schimbă tab-ul la "Review History"
   - Vezi toate review-urile anterioare cu detalii

### 2. Via API Direct

#### Efectuare Review

```bash
curl -X POST http://localhost:5086/api/aireview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "function example() { var unused = 10; console.log(\"test\"); }",
    "fileName": "example.js",
    "language": "javascript"
  }'
```

#### Răspuns:

```json
{
  "findings": [
    {
      "file": "example.js",
      "lineStart": 1,
      "lineEnd": 1,
      "severity": "medium",
      "message": "Unused variable 'unused' declared but never used",
      "suggestion": "Remove the unused variable declaration",
      "category": "style",
      "patch": "diff --git a/example.js b/example.js\n..."
    },
    {
      "file": "example.js",
      "lineStart": 1,
      "lineEnd": 1,
      "severity": "low",
      "message": "Console.log statement found in production code",
      "suggestion": "Remove console.log or use a proper logging library",
      "category": "style"
    }
  ],
  "effortEstimate": {
    "hours": 0.5,
    "complexity": "low",
    "description": "Minor code cleanup required"
  },
  "success": true
}
```

### 3. Via Git Pre-commit Hook

Hook-ul se activează automat la `git commit`:

```bash
git add .
git commit -m "Added new feature"

# Output:
# 🔍 Rulare AI Code Review...
# ✅ AI Review finalizat: 2 probleme găsite
# ⚠️  Atenție: Găsite probleme non-critice:
#   - [MEDIUM] src/utils.js:45-47: Unused variable
#   - [LOW] src/App.js:102-103: Console.log statement
# Commit-ul va continua, dar te rugăm să revizuiești aceste probleme.
# ✅ Pre-commit AI Review complet!
```

**Blocare pentru probleme critice:**

```bash
git commit -m "Dangerous code"

# Output:
# ❌ COMMIT BLOCAT: Găsite 1 probleme critice/majore!
# Probleme găsite:
#   - [CRITICAL] src/auth.js:23-25: SQL Injection vulnerability detected
# Te rugăm să remediezi problemele critice înainte de commit.
```

**Bypass hook (urgențe):**

```bash
git commit --no-verify -m "urgent hotfix"
```

---

## 📡 API Documentation

### Endpoints

#### `POST /api/aireview`

Efectuează un code review complet.

**Request Body:**

```json
{
  "code": "string (optional)",
  "gitDiff": "string (optional)",
  "fileName": "string",
  "language": "string"
}
```

**Response:** `ReviewResponse`

---

#### `POST /api/aireview/apply-fix`

Aplică un patch la un fișier.

**Request Body:**

```json
{
  "patch": "string",
  "filePath": "string"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Patch aplicat cu succes",
  "updatedContent": "string"
}
```

---

#### `GET /api/aireview/history?limit=50`

Obține istoricul review-urilor utilizatorului curent.

**Response:** `List<ReviewHistory>`

---

#### `GET /api/aireview/{id}`

Obține detalii despre un review specific.

**Response:** `ReviewHistory`

---

#### `POST /api/aireview/explain`

Cere explicații detaliate pentru un finding.

**Request Body:** `CodeFinding`

**Response:**

```json
{
  "success": true,
  "explanation": "Detailed explanation..."
}
```

---

#### `GET /api/aireview/status`

Verifică status-ul serviciului Ollama.

**Response:**

```json
{
  "status": "healthy",
  "message": "Ollama este disponibil și funcțional",
  "availableModels": ["codellama", "llama3"],
  "timestamp": "2025-11-01T10:33:07Z"
}
```

---

## 🎨 Frontend

### Componente Principale

#### `CodeReviewPanel`

- Tab-uri pentru Full Code Review, Git Diff Review, și History
- Verificare status Ollama la încărcare
- Upload și analiză cod
- Afișare rezultate cu severități colorate

#### `FindingsList`

- Lista de probleme sortate după severitate
- Expandable items pentru detalii
- Butoane "Explică mai mult" și "Aplică Fix"
- Afișare patch-uri și sugestii

#### `ReviewHistory`

- Timeline cu toate review-urile anterioare
- Badge-uri pentru severitate și număr de probleme
- Efort estimat pentru fiecare review

### Stilizare

Folosește **Mantine UI** pentru:

- Componente moderne și responsive
- Sistem de culori consistent
- Dark mode ready
- Iconițe (Tabler Icons)

---

## 🪝 Git Hook Integration

### Configurare Avansată

**Modifică comportamentul hook-ului:**

Editează `scripts/pre-commit` sau `scripts/pre-commit.ps1`:

```bash
# Blochează doar pentru critical (nu și high)
if [ "$CRITICAL_COUNT" -gt 0 ]; then
  # Change to:
  CRITICAL_FINDINGS=$(echo "$RESPONSE" | jq -r '[.findings[] | select(.severity == "critical")] | length')
```

**Custom API URL:**

```bash
export AI_REVIEW_API_URL="http://custom-host:5000/api/aireview"
```

---

## 🔧 Troubleshooting

### Ollama nu răspunde

**Eroare:** `"Nu se poate conecta la Ollama"`

**Soluție:**

```bash
# Verifică dacă Ollama rulează
curl http://localhost:11434/api/tags

# Pornește Ollama
ollama serve

# Verifică modelele instalate
ollama list

# Instalează CodeLlama dacă lipsește
ollama pull codellama
```

---

### Backend nu pornește

**Eroare:** `"Unable to bind to http://localhost:5086"`

**Soluție:**

- Schimbă portul în `Backend/Properties/launchSettings.json`
- Sau oprește alte aplicații care folosesc portul 5086

---

### Frontend nu se conectează la backend

**Eroare:** `"Network Error" în consolă`

**Soluție:**

1. Verifică că backend-ul rulează pe `http://localhost:5086`
2. Verifică CORS în `Backend/Program.cs` (trebuie să includă frontend URL-ul)
3. Actualizează `VITE_API_BASE_URL` în `.env`

---

### JWT Token expirat

**Eroare:** `"401 Unauthorized"`

**Soluție:**

1. Loghează-te din nou în frontend
2. Obține un token nou
3. Actualizează variabila de mediu:
   ```bash
   export AI_REVIEW_JWT_TOKEN="new-token"
   ```

---

### Patch-urile nu se aplică

**Eroare:** `"Nu s-a putut aplica patch-ul"`

**Notă:** Funcția de aplicare automată a patch-urilor este **experimentală**.

**Soluție:**

- Copiază patch-ul manual
- Aplică folosind `git apply`:
  ```bash
  echo "patch-content" | git apply
  ```

---

## 📊 Database Schema

### Tabelul `ReviewHistories`

| Coloană          | Tip      | Descriere                   |
| ---------------- | -------- | --------------------------- |
| `Id`             | INTEGER  | Primary key                 |
| `Timestamp`      | DATETIME | Data review-ului            |
| `File`           | TEXT     | Numele fișierului           |
| `FindingsJson`   | TEXT     | JSON cu problemele găsite   |
| `EffortEstimate` | TEXT     | JSON cu estimarea efortului |
| `UserId`         | TEXT     | ID-ul utilizatorului (FK)   |
| `ReviewType`     | TEXT     | "full" sau "diff"           |
| `IssuesCount`    | INTEGER  | Număr total de probleme     |
| `MaxSeverity`    | TEXT     | Cea mai gravă severitate    |

---

## 🎯 Best Practices

### Pentru Code Review

1. **Review incremental:** Folosește Git Diff Review pentru commit-uri individuale
2. **Regular reviews:** Rulează review-ul înainte de fiecare commit (via hook)
3. **Prioritizare:** Concentrează-te pe problemele critical și high mai întâi
4. **Explicații:** Folosește "Explică mai mult" pentru a înțelege problemele complexe

### Pentru Configurare

1. **Model selection:** CodeLlama pentru cod, Llama3 pentru explicații generale
2. **Temperature:** Ține la 0.1 pentru consistență (configurat în LLMClient.cs)
3. **Timeout:** Crește timeout-ul pentru fișiere mari (implicit 5 minute)

---

## 🔐 Security Notes

⚠️ **Important:**

- Nu commita API keys sau JWT tokens în repository
- Păstrează `.env` și `appsettings.json` în `.gitignore`
- Rulează Ollama doar local (nu expune public)
- Validează toate patch-urile înainte de aplicare

---

## 🚀 Features Viitoare (Roadmap)

- [ ] Suport pentru mai multe LLM-uri (OpenAI, Anthropic)
- [ ] Code formatting automatic
- [ ] Integration cu GitHub/GitLab PR reviews
- [ ] VS Code Extension
- [ ] Statistici și analytics avansate
- [ ] Team collaboration features
- [ ] Custom rules și configurări per-project
- [ ] Suport pentru monorepo
- [ ] CI/CD integration

---

## 📄 Licență

Acest modul face parte din proiectul internship-hackathon-2025.

---

## 🙋 Suport

Pentru probleme sau întrebări:

1. Verifică secțiunea [Troubleshooting](#-troubleshooting)
2. Citește documentația Ollama: https://ollama.com/
3. Consultă logs-urile backend-ului pentru detalii tehnice

---

**Happy Coding! 🎉**
