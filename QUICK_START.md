# 🚀 Quick Start - AI Code Review în 5 Minute

Ghid rapid pentru a începe să folosești AI Code Review Assistant.

---

## ⚡ Setup Rapid

### Pasul 1: Instalare Ollama + Model (2 minute)

```bash
# Windows (PowerShell - Rulează ca Administrator)
# Descarcă de pe https://ollama.com/download și instalează

# Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh

# Instalează modelul CodeLlama
ollama pull codellama

# Pornește Ollama
ollama serve
```

✅ **Verificare:** Deschide `http://localhost:11434` în browser - ar trebui să vezi "Ollama is running"

---

### Pasul 2: Pornire Backend (1 minut)

```bash
cd Backend

# Aplică migrarea DB (doar prima dată)
dotnet ef database update

# Pornește backend-ul
dotnet run
```

✅ **Verificare:** Vezi în terminal "Now listening on: http://localhost:5086"

---

### Pasul 3: Pornire Frontend (1 minut)

```bash
# Într-un terminal nou
cd Frontend

# Instalează dependențe (doar prima dată)
npm install

# Pornește frontend-ul
npm run dev
```

✅ **Verificare:** Vezi "Local: http://localhost:5173"

---

### Pasul 4: Autentificare (30 secunde)

1. Deschide `http://localhost:5173`
2. Loghează-te sau creează cont
3. Navighează la `/review` sau accesează direct `http://localhost:5173/review`

✅ **Verificare:** Vezi badge-ul verde "Ollama Online" în colțul dreapta sus

---

## 🎯 Primul Tău Review

### Opțiunea 1: Copy-Paste Cod

1. **Tab:** Full Code Review
2. **Limbaj:** JavaScript
3. **Nume:** test.js
4. **Cod:** Copiază și paste acest exemplu:

```javascript
function calculateTotal(items) {
  var total = 0;
  var unused = 10;

  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
    console.log("Item: " + items[i].name);
  }

  eval("dangerous code");
  return total;
}
```

5. **Click:** "Efectuează Review"
6. **Așteaptă:** 10-30 secunde
7. **Vezi rezultatele:** Liste de probleme găsite cu severități colorate

---

### Opțiunea 2: Git Diff

```bash
# În terminal, într-un repository git
git diff HEAD~1 > my-changes.diff
```

1. **Tab:** Git Diff Review
2. **Copiază conținutul** fișierului `my-changes.diff`
3. **Paste** în textarea
4. **Click:** "Efectuează Review"

---

## 🎨 Funcții Rapide

### 📝 Explică mai mult

- Click pe orice problemă pentru a o expanda
- Click "Explică mai mult" pentru explicații detaliate

### ✅ Aplică Fix (experimental)

- Unele probleme au butoane "Aplică Fix"
- Click pentru a încerca aplicarea automată a patch-ului
- ⚠️ Verifică întotdeauna rezultatul manual!

### 📊 Vezi Istoric

- **Tab:** Review History
- Vezi toate review-urile anterioare
- Badge-uri cu severitate și efort estimat

---

## 🔗 Git Hook Setup (Opțional, 2 minute)

### Windows

```powershell
# Instalează hook-ul
.\scripts\install-hook.ps1

# Obține JWT token:
# 1. Loghează-te în frontend
# 2. F12 → Application → Local Storage → accessToken
# 3. Copiază valoarea

# Setează token-ul
$env:AI_REVIEW_JWT_TOKEN = "paste-token-aici"
```

### Linux/Mac

```bash
# Instalează hook-ul
chmod +x scripts/pre-commit
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Setează token-ul (vezi mai sus cum să-l obții)
export AI_REVIEW_JWT_TOKEN="paste-token-aici"
```

✅ **Testare:**

```bash
echo "var test = 10;" >> test.js
git add test.js
git commit -m "test"
# Ar trebui să vezi output-ul de la AI Review
```

---

## 🎬 Demo Video Workflow

### Scenario: Review înaintea unui commit

1. **Scrii cod nou:**

   ```javascript
   // src/utils.js
   function process(data) {
     var result = data.map((x) => x * 2);
     console.log("Debug:", result);
     return result;
   }
   ```

2. **Rulezi review manual în UI:**

   - Copy-paste codul în `/review`
   - Verifici problemele găsite
   - Corectezi ceea ce e critic

3. **Commit cu hook:**

   ```bash
   git add src/utils.js
   git commit -m "Added process function"
   # Hook-ul rulează automat și validează
   ```

4. **Review-ul trece:**

   ```
   ✅ AI Review finalizat: 2 probleme găsite
   ⚠️  Atenție: Găsite probleme non-critice:
     - [LOW] console.log statement in production
     - [MEDIUM] var instead of const/let

   Commit-ul va continua.
   ✅ Pre-commit AI Review complet!
   ```

---

## 📱 URL-uri Rapide

| Serviciu       | URL                           |
| -------------- | ----------------------------- |
| Frontend       | http://localhost:5173         |
| Backend API    | http://localhost:5086/api     |
| Swagger Docs   | http://localhost:5086/swagger |
| Code Review UI | http://localhost:5173/review  |
| Ollama         | http://localhost:11434        |

---

## 🐛 Probleme Comune

### "Ollama Offline" badge roșu

**Soluție:**

```bash
# Verifică dacă Ollama rulează
curl http://localhost:11434/api/tags

# Dacă nu, pornește-l
ollama serve
```

---

### Backend nu pornește

**Eroare:** Port deja în uz

**Soluție:** Schimbă portul în `Backend/Properties/launchSettings.json` sau oprește aplicația care folosește portul 5086.

---

### Frontend - "Network Error"

**Verifică:**

1. Backend-ul rulează? (`http://localhost:5086/api/aireview/status`)
2. CORS este configurat? (ar trebui să fie implicit)
3. Token JWT este valid? (loghează-te din nou)

---

### Review durează prea mult

**Normal:** 10-30 secunde pentru cod mic, 30-60 secunde pentru cod mare

**Prea mult:** Peste 2 minute → verifică:

- CPU usage al Ollama (ar trebui 50-100% în timpul analizei)
- Memorie RAM (minim 8GB recomandat, 16GB ideal)
- Modelul instalat corect: `ollama list`

---

## 🎓 Next Steps

După ce ai testat basic features, explorează:

1. **Limbi diferite:** JavaScript, TypeScript, C#, Python, Go...
2. **Git Diff Review:** Analizează doar modificările, nu tot codul
3. **History:** Vezi pattern-urile în problemele tale
4. **Hook Integration:** Automatizează review-urile la commit

---

## 📚 Documentație Completă

Pentru detalii tehnice, arhitectură, API docs, și troubleshooting avansat:

- **README Principal:** [AI_REVIEW_MODULE_README.md](./AI_REVIEW_MODULE_README.md)
- **Testing Guide:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Git Hooks:** [scripts/README.md](./scripts/README.md)

---

## 💡 Tips & Tricks

### Tip 1: Review Incremental

Nu face review la tot codul dintr-o dată. Folosește Git Diff pentru fiecare commit.

### Tip 2: Prioritizare

Concentrează-te pe CRITICAL și HIGH severity mai întâi.

### Tip 3: Învață din Explicații

Folosește "Explică mai mult" pentru a înțelege de ce ceva e o problemă.

### Tip 4: Custom Prompts (Avansat)

Modifică `Backend/Services/AI/prompt-template.txt` pentru a customiza stilul de review.

### Tip 5: Modele Alternative

Experimentează cu modele diferite:

```bash
ollama pull llama3
# Apoi schimbă în appsettings.json: "DefaultModel": "llama3"
```

---

## ✅ Checklist de Success

Știi că ai configurat corect totul când:

- [ ] Badge-ul "Ollama Online" e verde
- [ ] Poți face review la cod JavaScript și vezi findings
- [ ] Poți face review la Git Diff
- [ ] Vezi istoric în tab-ul "Review History"
- [ ] Hook-ul de pre-commit rulează automat
- [ ] Timpul de review e < 60 secunde

---

**Felicitări! 🎉 Ești gata să folosești AI Code Review Assistant!**

Pentru ajutor suplimentar, consultă documentația completă sau verifică secțiunea de troubleshooting.

---

_Creat pentru internship-hackathon-2025_
