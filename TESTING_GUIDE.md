# 🧪 Ghid de Testare - AI Code Review Module

Acest ghid te va ajuta să testezi complet funcționalitatea modulului AI Code Review.

---

## ✅ Checklist Pre-Testare

Înainte de a începe testarea, asigură-te că:

- [ ] Ollama este instalat și rulează (`ollama serve`)
- [ ] Model CodeLlama sau Llama3 este instalat (`ollama pull codellama`)
- [ ] Backend ASP.NET rulează (`cd Backend && dotnet run`)
- [ ] Frontend React rulează (`cd Frontend && npm run dev`)
- [ ] Ai un cont de utilizator și ești autentificat
- [ ] Ai un JWT token valid

---

## 🔍 Test 1: Verificare Status Ollama

### Via API Direct

```bash
curl http://localhost:5086/api/aireview/status
```

**Răspuns așteptat:**
```json
{
  "status": "healthy",
  "message": "Ollama este disponibil și funcțional",
  "availableModels": ["codellama", "llama3"],
  "timestamp": "..."
}
```

### Via Frontend

1. Accesează `http://localhost:5173/review`
2. Verifică badge-ul din colțul dreapta sus
3. Trebuie să arate "Ollama Online" (verde)

**✅ PASS:** Badge verde + modelele sunt listate  
**❌ FAIL:** Badge roșu + mesaj de eroare

---

## 🔍 Test 2: Full Code Review - JavaScript

### Cod de Test (cu probleme intenționate)

```javascript
function calculateTotal(items) {
  var total = 0;
  var unused = 10;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
    console.log("Processing item: " + items[i].name);
  }
  if (total = 100) {
    return total;
  }
  return total;
}

eval("dangerous code");
```

### Pași de Testare

1. **Via Frontend:**
   - Accesează `http://localhost:5173/review`
   - Tab "Full Code Review"
   - Limbaj: JavaScript
   - Nume fișier: `test.js`
   - Copiază codul de mai sus
   - Click "Efectuează Review"

2. **Probleme așteptate:**
   - ❌ **Critical/High:** Folosirea `eval()` (security risk)
   - ⚠️ **Medium:** Variabila `unused` declarată dar neutilizată
   - ⚠️ **Medium:** Folosirea `var` în loc de `let/const`
   - ⚠️ **Medium:** Assignment `=` în loc de comparison `==` sau `===`
   - ⚠️ **Low:** `console.log` în cod de producție
   - ⚠️ **Low:** Lipsă JSDoc/documentație

### Via API Direct

```bash
curl -X POST http://localhost:5086/api/aireview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "function calculateTotal(items) {\n  var total = 0;\n  var unused = 10;\n  for (var i = 0; i < items.length; i++) {\n    total += items[i].price;\n    console.log(\"Processing item: \" + items[i].name);\n  }\n  if (total = 100) {\n    return total;\n  }\n  return total;\n}\n\neval(\"dangerous code\");",
    "fileName": "test.js",
    "language": "javascript"
  }'
```

**✅ PASS:** Primești răspuns JSON cu `findings` array și `effortEstimate`  
**❌ FAIL:** Eroare sau răspuns gol

---

## 🔍 Test 3: Git Diff Review

### Creează un Diff de Test

```bash
# În orice repository git
echo "var unused = 10;" >> test.js
git add test.js
git diff --cached
```

### Copiază Output-ul și Testează

1. **Via Frontend:**
   - Tab "Git Diff Review"
   - Paste diff-ul în textarea
   - Click "Efectuează Review"

2. **Problemă așteptată:**
   - ⚠️ **Medium:** Variabilă `unused` declarată dar neutilizată

**✅ PASS:** Review detectează problema în diff  
**❌ FAIL:** Niciun finding sau eroare

---

## 🔍 Test 4: "Explică mai mult" Feature

### Pași

1. După ce ai findings de la Test 2 sau 3
2. Click pe un finding pentru a-l expanda
3. Click "Explică mai mult"
4. Așteaptă 5-10 secunde

**✅ PASS:** Primești o explicație detaliată în limba română/engleză  
**❌ FAIL:** Eroare sau timeout

---

## 🔍 Test 5: Review History

### Pași

1. După ce ai efectuat 2-3 review-uri (Test 2 și Test 3)
2. Tab "Review History"
3. Verifică lista de review-uri anterioare

**Ce trebuie să vezi:**
- Timeline cu toate review-urile
- Număr de probleme pentru fiecare
- Efort estimat (ore + complexitate)
- Data și ora fiecărui review

**✅ PASS:** Toate review-urile sunt afișate corect  
**❌ FAIL:** Lista este goală sau incompletă

---

## 🔍 Test 6: Apply Fix (Experimental)

⚠️ **Atenție:** Această funcție este experimentală!

### Pași

1. După un review cu findings care au patch-uri
2. Expandează un finding
3. Click "Aplică Fix"
4. Verifică mesajul de confirmare

**✅ PASS:** Mesaj de succes (chiar dacă patch-ul nu se aplică perfect)  
**❌ FAIL:** Crash sau eroare HTTP

**Notă:** Este normal ca aplicarea să nu fie 100% perfectă - este un prototip.

---

## 🔍 Test 7: Pre-commit Hook

### Setup

```powershell
# Windows PowerShell
.\scripts\install-hook.ps1

# Obține JWT token din localStorage (F12 în browser -> Application -> Local Storage)
$env:AI_REVIEW_JWT_TOKEN = "your-jwt-token-here"
```

### Test cu Commit Normal

```bash
# Creează o modificare simplă
echo "var x = 10;" >> test.js
git add test.js
git commit -m "test commit"
```

**✅ PASS:** 
- Hook-ul rulează
- Afișează numărul de probleme găsite
- Permite commit-ul (dacă problemele sunt low/medium)

**❌ FAIL:** Hook-ul nu rulează sau commit-ul eșuează fără motiv

### Test cu Blocare (Critical Issue)

```bash
# Adaugă cod periculos
echo 'eval("dangerous");' >> test.js
git add test.js
git commit -m "dangerous commit"
```

**✅ PASS:**
- Hook-ul detectează problema critică
- Blochează commit-ul
- Afișează mesaj de eroare clar

**❌ FAIL:** Commit-ul trece fără avertisment

---

## 🔍 Test 8: Performance & Timeout

### Test cu Fișier Mare

Creează un fișier JavaScript de ~500 linii și testează review-ul.

**Metrici acceptabile:**
- ⏱️ Timp de răspuns: 10-60 secunde (depinde de hardware)
- 💾 Memorie: < 500MB pentru backend
- 🔄 Niciun timeout sau crash

**✅ PASS:** Review-ul se completează cu succes  
**❌ FAIL:** Timeout după 5 minute sau crash

---

## 🔍 Test 9: Multi-Language Support

### Testează Limbi Diferite

#### C# Example

```csharp
public class Test {
    private int unused = 10;
    
    public void Method() {
        Console.WriteLine("Debug");
        string password = "hardcoded123";
    }
}
```

**Probleme așteptate:**
- Security: Hardcoded password
- Style: Unused field
- Best practice: Console.WriteLine în production

#### Python Example

```python
def calculate(x, y):
    unused = 10
    result = x + y
    print("Debug: ", result)
    exec("dangerous code")
    return result
```

**Probleme așteptate:**
- Critical: Folosirea `exec()`
- Medium: Variabilă `unused`
- Low: `print()` statements

**✅ PASS:** LLM detectează probleme specifice fiecărui limbaj  
**❌ FAIL:** Erori de parsing sau findings irelevante

---

## 🔍 Test 10: Error Handling

### Test 1: Cod Gol

```bash
# Trimite review cu cod gol
curl -X POST http://localhost:5086/api/aireview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"code": "", "fileName": "test.js"}'
```

**✅ PASS:** Răspuns cu `success: false` și mesaj de eroare clar  
**❌ FAIL:** 500 Internal Server Error

### Test 2: Token Invalid

```bash
curl -X POST http://localhost:5086/api/aireview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -d '{"code": "test", "fileName": "test.js"}'
```

**✅ PASS:** 401 Unauthorized  
**❌ FAIL:** Altceva

### Test 3: Ollama Oprit

```bash
# Oprește Ollama
killall ollama  # Linux/Mac
# sau închide procesul Ollama pe Windows

# Încearcă un review
curl http://localhost:5086/api/aireview/status
```

**✅ PASS:** Status "unavailable" cu mesaj clar  
**❌ FAIL:** Crash sau timeout fără mesaj

---

## 📊 Rezultate Așteptate - Summary

După completarea tuturor testelor, ar trebui să ai:

| Test | Status | Note |
|------|--------|------|
| 1. Status Ollama | ✅ | Badge verde în UI |
| 2. Full Code Review | ✅ | 5-6 findings detectate |
| 3. Git Diff Review | ✅ | Findings în diff |
| 4. Explică mai mult | ✅ | Explicații detaliate |
| 5. Review History | ✅ | Timeline complet |
| 6. Apply Fix | ⚠️ | Experimental, poate eșua |
| 7. Pre-commit Hook | ✅ | Rulează automat |
| 8. Performance | ✅ | < 60s pentru fișiere mari |
| 9. Multi-Language | ✅ | Suport pentru 8+ limbi |
| 10. Error Handling | ✅ | Mesaje clare de eroare |

---

## 🐛 Raportare Probleme

Dacă întâlnești probleme, colectează:

1. **Logs Backend:**
   ```bash
   cd Backend
   dotnet run > backend.log 2>&1
   ```

2. **Browser Console Logs:**
   - F12 → Console → Copy all

3. **Ollama Logs:**
   ```bash
   ollama list
   ollama serve 2>&1 | tee ollama.log
   ```

4. **Request/Response Example:**
   ```bash
   curl -v http://localhost:5086/api/aireview/status
   ```

---

## ✅ Testare Finalizată

Dacă toate testele (exceptând Apply Fix care este experimental) trec cu succes:

🎉 **Modulul AI Code Review este funcțional și gata de utilizare!**

---

**Next Steps:**
- Integrează hook-ul în workflow-ul tău zilnic
- Experimentează cu diferite tipuri de cod
- Configurează reguli custom (viitor)
- Explorează Analytics (viitor)

**Happy Testing! 🚀**

