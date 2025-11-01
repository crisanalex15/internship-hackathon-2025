# 🎯 Review Assistant - Specificații Complete

## 📋 Cuprins

1. [Introducere](#introducere)
2. [Arhitectură](#arhitectură)
3. [Feature-uri Implementate](#feature-uri-implementate)
4. [API Endpoints](#api-endpoints)
5. [Utilizare](#utilizare)
6. [Workflow-uri](#workflow-uri)

---

## 🌟 Introducere

**Review Assistant** este o aplicație web modernă pentru code review automat, construită cu:
- **Backend**: ASP.NET Core 8.0 + SQLite + LibGit2Sharp
- **Frontend**: React + Vite
- **AI**: Ollama (LLM local)
- **Git Integration**: LibGit2Sharp pentru diff-uri și incremental review

### Obiective Principale

✅ **Pre-commit Evaluation** - Validare automată înainte de commit  
✅ **Incremental Review** - Review doar pe modificări (git diff)  
✅ **Threaded Comments** - Sistem de comentarii cu replies  
✅ **Automatic Fixes** - Sugestii AI + patch-uri automate  
✅ **Effort Estimation** - Estimare inteligentă a timpului de remediere  
✅ **Git Integration** - LibGit2Sharp pentru operații Git native  

---

## 🏗️ Arhitectură

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Code Editor │  │   Comments   │  │  Review List │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼────────────────────────────────────┐
│                 BACKEND (ASP.NET Core)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Controllers (API)                                    │   │
│  │  • AIReviewController • CommentController             │   │
│  │  • GitController      • ProjectController             │   │
│  └─────────────┬─────────────────────────────────────────┘  │
│                │                                             │
│  ┌─────────────▼─────────────────────────────────────────┐  │
│  │  Services                                              │  │
│  │  • AIReviewService (LLM integration)                   │  │
│  │  • GitService (LibGit2Sharp wrapper)                   │  │
│  │  • EffortEstimationService (timp estimat)              │  │
│  └─────────────┬─────────────────────────────────────────┘  │
│                │                                             │
│  ┌─────────────▼─────────────────────────────────────────┐  │
│  │  Database (SQLite via EF Core)                         │  │
│  │  • Users • Reviews • Comments • Projects               │  │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼─────┐      ┌───────▼──────┐      ┌────▼────┐
│  Ollama │      │ Git Repo     │      │ Hooks   │
│ (LLM)   │      │ (LibGit2Sharp│      │ (Pre-   │
│         │      │  integration)│      │ commit) │
└─────────┘      └──────────────┘      └─────────┘
```

---

## ⚡ Feature-uri Implementate

### 1. **Pre-commit Evaluation** ✅

**Descriere**: Hook Git care rulează automat review înainte de fiecare commit.

**Funcționalitate**:
- Detectează modificările staged (`git diff --cached`)
- Trimite modificările către backend pentru analiză AI
- Blochează commit-ul dacă există probleme **CRITICE**
- Permite commit-ul cu avertismente pentru probleme non-critice

**Implementare**:
- **Scripts**: `scripts/pre-commit-hook.sh` și `scripts/pre-commit-hook.ps1`
- **API**: `POST /api/aireview/pre-commit`
- **Service**: `AIReviewService.PerformPreCommitReviewAsync()`

**Exemplu**:
```bash
git add .
git commit -m "feat: new feature"
# Hook rulează automat și blochează commit-ul dacă există probleme critice
```

---

### 2. **Incremental Review (Git Diff)** ✅

**Descriere**: Review doar pe modificările între două commit-uri/branch-uri.

**Funcționalitate**:
- Review doar pe liniile modificate (nu tot codul)
- Suport pentru orice referință Git (HEAD~1, branch names, SHA-uri)
- Optimizat pentru review rapid în timpul dezvoltării

**Implementare**:
- **Service**: `GitService.GetDiff()`
- **API**: `POST /api/aireview/incremental`
- **Logic**: `AIReviewService.PerformIncrementalReviewAsync()`

**Exemplu API**:
```bash
curl -X POST http://localhost:5000/api/aireview/incremental \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryPath": "/path/to/repo",
    "baseRef": "main",
    "targetRef": "feature-branch"
  }'
```

---

### 3. **Threaded Comments System** ✅

**Descriere**: Sistem complet de comentarii și replies pe code review-uri.

**Funcționalitate**:
- Comentarii pe linii specifice de cod
- Replies (răspunsuri threaded)
- Status: `open`, `resolved`, `wontfix`
- Tipuri: `suggestion`, `question`, `issue`, `praise`

**Implementare**:
- **Model**: `Backend/Models/Comment.cs`
- **Controller**: `Backend/Controllers/API/CommentController.cs`
- **Database**: Tabel `Comments` cu relații self-referencing

**Endpoints**:
```http
GET    /api/comment/review/{reviewId}         # Toate comentariile unui review
POST   /api/comment                            # Creează comentariu
POST   /api/comment/{id}/reply                 # Adaugă reply
PUT    /api/comment/{id}/resolve               # Marchează ca rezolvat
DELETE /api/comment/{id}                       # Șterge comentariu
```

**Exemplu structură**:
```json
{
  "id": 1,
  "reviewId": 42,
  "filePath": "Backend/Services/UserService.cs",
  "lineNumber": 45,
  "authorName": "john@example.com",
  "message": "Consider adding null check here",
  "status": "open",
  "commentType": "suggestion",
  "severity": "medium",
  "replies": [
    {
      "id": 2,
      "message": "Good point, will fix",
      "authorName": "alice@example.com"
    }
  ]
}
```

---

### 4. **Automatic Fixes** ✅

**Descriere**: AI generează patch-uri automate pentru problemele detectate.

**Funcționalitate**:
- AI sugerează fix-uri concrete (cod corectat)
- Generare de patch-uri în format unified diff
- Aplicare automată cu validare

**Implementare**:
- **Service**: `AIReviewService.ApplyFixAsync()`
- **API**: `POST /api/aireview/apply-fix`

**Exemplu**:
```bash
curl -X POST http://localhost:5000/api/aireview/apply-fix \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "Backend/Services/MyService.cs",
    "patch": "- var temp = null;\n+ // removed unused variable"
  }'
```

---

### 5. **Effort Estimation (Complex Rules)** ✅

**Descriere**: Sistem avansat de estimare a timpului necesar pentru remedieri.

**Funcționalitate**:
- Matrici de timp bazate pe **severitate × categorie**
- Multiplicatori pentru complexitate (linii afectate, existența patch-ului, etc.)
- Breakdown detaliat pe severitate și categorie
- Prioritizare automată a problemelor
- Calcul număr dezvoltatori necesari

**Implementare**:
- **Service**: `Backend/Services/AI/EffortEstimationService.cs`
- **API**: `POST /api/aireview/estimate-effort`

**Matrice de Timp** (minute):

| Severitate | Syntax | Security | Performance | Bug | Style | Maintainability |
|------------|--------|----------|-------------|-----|-------|-----------------|
| Critical   | 30     | 120      | 90          | 60  | 15    | 45              |
| High       | 20     | 60       | 45          | 40  | 10    | 30              |
| Medium     | 10     | 30       | 20          | 20  | 8     | 15              |
| Low        | 5      | 15       | 10          | 10  | 5     | 8               |

**Exemplu răspuns**:
```json
{
  "totalMinutes": 185,
  "totalHours": 3.08,
  "totalDays": 0.39,
  "complexity": "medium",
  "description": "Remediere 5 probleme detectate, 2 critice, 1 majore, ~3.08 ore",
  "breakdownBySeverity": {
    "critical": { "count": 2, "minutes": 120, "hours": 2.0 },
    "high": { "count": 1, "minutes": 40, "hours": 0.67 },
    "medium": { "count": 2, "minutes": 25, "hours": 0.42 }
  },
  "breakdownByCategory": {
    "security": { "count": 2, "minutes": 135, "hours": 2.25 },
    "bug": { "count": 3, "minutes": 50, "hours": 0.83 }
  },
  "estimatedCompletionDate": "2025-11-01T18:30:00Z",
  "requiredDevelopers": 1
}
```

---

### 6. **Git Integration Layer (LibGit2Sharp)** ✅

**Descriere**: Integrare nativă cu Git pentru operații avansate.

**Funcționalitate**:
- Obținere diff-uri între commit-uri/branch-uri
- Detectare modificări staged/unstaged
- Obținere conținut fișiere la anumite referințe
- Validare repository-uri Git
- Informații despre branch-uri, commit-uri, status

**Implementare**:
- **Service**: `Backend/Services/Git/GitService.cs`
- **Library**: LibGit2Sharp 0.30.0
- **Controller**: `Backend/Controllers/API/GitController.cs`

**API Endpoints**:
```http
POST /api/git/diff             # Obține diff între două referințe
POST /api/git/staged           # Obține modificări staged
POST /api/git/unstaged         # Obține modificări unstaged
POST /api/git/info             # Informații despre repository
POST /api/git/validate         # Validează repository Git
POST /api/git/file-content     # Conținut fișier la o referință
```

**Exemplu utilizare**:
```csharp
var diff = _gitService.GetDiff("/path/to/repo", "HEAD~1", "HEAD");
foreach (var file in diff.Files)
{
    Console.WriteLine($"{file.Path}: +{file.LinesAdded} -{file.LinesDeleted}");
    Console.WriteLine(file.Patch);
}
```

---

## 🔌 API Endpoints (Rezumat)

### Authentication
```http
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
```

### AI Review
```http
POST   /api/aireview                      # Review complet
POST   /api/aireview/incremental          # Review incremental (git diff)
POST   /api/aireview/pre-commit           # Pre-commit evaluation
POST   /api/aireview/apply-fix            # Aplică fix automat
POST   /api/aireview/explain              # Explicații detaliate finding
POST   /api/aireview/estimate-effort      # Estimare efort detaliată
GET    /api/aireview/history              # Istoric review-uri
GET    /api/aireview/{id}                 # Detalii review specific
GET    /api/aireview/status               # Status Ollama
```

### Comments (Threaded)
```http
GET    /api/comment/review/{reviewId}     # Comentarii review
GET    /api/comment/review/{reviewId}/file # Comentarii fișier specific
POST   /api/comment                        # Creează comentariu
POST   /api/comment/{id}/reply             # Adaugă reply
PUT    /api/comment/{id}                   # Actualizează comentariu
PUT    /api/comment/{id}/resolve           # Marchează rezolvat
PUT    /api/comment/{id}/reopen            # Redeschide comentariu
DELETE /api/comment/{id}                   # Șterge comentariu
```

### Git Operations
```http
POST   /api/git/diff                       # Diff între referințe
POST   /api/git/staged                     # Modificări staged
POST   /api/git/unstaged                   # Modificări unstaged
POST   /api/git/info                       # Info repository
POST   /api/git/validate                   # Validează repository
POST   /api/git/file-content               # Conținut fișier
```

### Projects
```http
GET    /api/project/search                 # Căutare proiecte
GET    /api/project/{id}                   # Detalii proiect
GET    /api/project/my-projects            # Proiectele mele
POST   /api/project/create                 # Creează proiect
PUT    /api/project/{id}                   # Actualizează proiect
DELETE /api/project/{id}                   # Șterge proiect
POST   /api/project/{id}/verify-password   # Verifică parolă
```

---

## 🚀 Utilizare

### 1. Setup Backend

```bash
cd Backend
dotnet restore
dotnet ef database update
dotnet run
```

### 2. Setup Frontend

```bash
cd Frontend
npm install
npm run dev
```

### 3. Setup Ollama (LLM Local)

```bash
# Instalare Ollama
curl https://ollama.ai/install.sh | sh

# Download model
ollama pull qwen2.5-coder:7b

# Verificare
curl http://localhost:11434/api/tags
```

### 4. Instalare Pre-commit Hook

**Windows (PowerShell)**:
```powershell
.\scripts\install-pre-commit-hook.ps1
```

**Linux/Mac**:
```bash
chmod +x scripts/install-pre-commit-hook.sh
./scripts/install-pre-commit-hook.sh
```

### 5. Autentificare

```bash
# Obține JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token' > ~/.review-assistant-token
```

---

## 🔄 Workflow-uri

### Workflow 1: Review Incremental (Feature Branch)

```bash
# 1. Developer creează branch nou
git checkout -b feature/new-feature

# 2. Face modificări și commit-uri
git add .
git commit -m "feat: implement new feature"
# Pre-commit hook rulează automat ✅

# 3. Review incremental față de main
curl -X POST http://localhost:5000/api/aireview/incremental \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryPath": ".",
    "baseRef": "main",
    "targetRef": "feature/new-feature"
  }'

# 4. Reviewer adaugă comentarii pe linii specifice
curl -X POST http://localhost:5000/api/comment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewId": 42,
    "filePath": "Backend/Services/MyService.cs",
    "lineNumber": 45,
    "message": "Consider adding null check",
    "commentType": "suggestion",
    "severity": "medium"
  }'

# 5. Developer răspunde la comentariu
curl -X POST http://localhost:5000/api/comment/1/reply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Fixed in next commit"}'

# 6. Developer face fix și marchează ca rezolvat
curl -X PUT http://localhost:5000/api/comment/1/resolve \
  -H "Authorization: Bearer $TOKEN"
```

### Workflow 2: Pre-commit Evaluation

```bash
# 1. Developer face modificări
vim Backend/Services/AuthService.cs

# 2. Stage modificările
git add Backend/Services/AuthService.cs

# 3. Încearcă commit
git commit -m "fix: update auth logic"

# Hook rulează automat:
# • Detectează modificările staged
# • Trimite către API pentru review
# • AI analizează doar modificările
# • Dacă există probleme critice → BLOCHEAZĂ commit-ul
# • Dacă sunt doar warnings → PERMITE commit-ul cu avertismente

# Exemplu output (commit blocat):
# ❌ COMMIT BLOCAT!
#    Au fost detectate 2 probleme CRITICE!
#    • [AuthService.cs:34] SQL injection vulnerability
#    • [AuthService.cs:52] Password stored in plain text
#
#    Pentru bypass: git commit --no-verify
```

### Workflow 3: Effort Estimation

```bash
# După un review cu multe probleme găsite:
curl -X POST http://localhost:5000/api/aireview/estimate-effort \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "findings": [
      {
        "file": "Backend/Services/UserService.cs",
        "lineStart": 45,
        "lineEnd": 47,
        "severity": "critical",
        "category": "security",
        "message": "SQL injection vulnerability"
      },
      {
        "file": "Backend/Controllers/AuthController.cs",
        "lineStart": 23,
        "lineEnd": 25,
        "severity": "high",
        "category": "bug",
        "message": "Missing null check"
      }
    ]
  }'

# Răspuns:
# {
#   "totalHours": 3.0,
#   "complexity": "high",
#   "description": "Remediere 2 probleme, 1 critică, ~3 ore",
#   "requiredDevelopers": 1,
#   "estimatedCompletionDate": "2025-11-01T18:00:00Z",
#   "recommendedOrder": [
#     /* sorted by priority: critical > high > medium > low */
#   ]
# }
```

---

## 📊 Statistici & Monitorizare

### Database Schema

```sql
-- Reviews
CREATE TABLE ReviewHistories (
    Id INTEGER PRIMARY KEY,
    Timestamp DATETIME,
    File TEXT,
    FindingsJson TEXT,
    EffortEstimate TEXT,
    UserId TEXT,
    ReviewType TEXT,
    IssuesCount INTEGER,
    MaxSeverity TEXT
);

-- Comments (Threaded)
CREATE TABLE Comments (
    Id INTEGER PRIMARY KEY,
    ReviewId INTEGER,
    FilePath TEXT,
    LineNumber INTEGER,
    AuthorId TEXT,
    AuthorName TEXT,
    Message TEXT,
    ParentId INTEGER NULL,  -- Self-referencing pentru replies
    Status TEXT,  -- open, resolved, wontfix
    CommentType TEXT,
    Severity TEXT,
    CreatedAt DATETIME,
    UpdatedAt DATETIME,
    ResolvedAt DATETIME,
    ResolvedById TEXT,
    FindingId INTEGER NULL,
    FOREIGN KEY (ReviewId) REFERENCES ReviewHistories(Id),
    FOREIGN KEY (ParentId) REFERENCES Comments(Id),
    FOREIGN KEY (AuthorId) REFERENCES Users(Id)
);

-- Projects
CREATE TABLE Projects (
    Id INTEGER PRIMARY KEY,
    Name TEXT,
    Description TEXT,
    OwnerId TEXT,
    Password TEXT,
    IsPublic BOOLEAN,
    CreatedAt DATETIME,
    LastModifiedAt DATETIME,
    Tags TEXT,
    ReviewCount INTEGER
);

-- ProjectFiles
CREATE TABLE ProjectFiles (
    Id INTEGER PRIMARY KEY,
    ProjectId INTEGER,
    FileName TEXT,
    FilePath TEXT,
    Content TEXT,
    Language TEXT,
    CreatedAt DATETIME,
    FOREIGN KEY (ProjectId) REFERENCES Projects(Id)
);
```

---

## 🎓 Best Practices

### 1. Pre-commit Hook
- Folosește hook-ul pentru toate commit-urile normale
- Bypass doar în cazuri urgente (`--no-verify`)
- Commit-urile sunt blocate DOAR pentru probleme critice

### 2. Incremental Review
- Folosește review incremental pentru feature branches
- Review față de branch-ul principal (main/master)
- Evită review-uri pe întreg codul (slow)

### 3. Comments
- Adaugă comentarii constructive și specifice
- Folosește tipurile corect (suggestion/question/issue/praise)
- Marchează comentariile ca rezolvate după fix

### 4. Effort Estimation
- Folosește estimările pentru planificare
- Prioritizează problemele critice și de securitate
- Consideră numărul de dezvoltatori necesari

---

## 🛠️ Troubleshooting

### Backend nu pornește
```bash
# Verifică .NET SDK
dotnet --version  # Trebuie >= 8.0

# Verifică database
dotnet ef database update

# Verifică portul
netstat -an | grep 5000
```

### Ollama nu răspunde
```bash
# Verifică dacă rulează
curl http://localhost:11434/api/tags

# Restart Ollama
systemctl restart ollama  # Linux
# sau
brew services restart ollama  # Mac
```

### Hook-ul nu se execută
```bash
# Verifică permisiuni
ls -la .git/hooks/pre-commit

# Fix permisiuni
chmod +x .git/hooks/pre-commit
```

### LibGit2Sharp erori
```bash
# Reinstall package
dotnet remove package LibGit2Sharp
dotnet add package LibGit2Sharp --version 0.30.0
dotnet restore
```

---

## 📝 License

MIT License - Vezi [LICENSE](LICENSE) pentru detalii.

---

## 🤝 Contribuții

Contribuțiile sunt binevenite! Vezi [CONTRIBUTING.md](CONTRIBUTING.md) pentru ghid.

---

**Review Assistant** - Powered by AI, Git, and ASP.NET Core 🚀

