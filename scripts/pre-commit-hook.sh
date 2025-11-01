#!/bin/bash
# Pre-commit hook pentru Review Assistant
# Rulează automat AI review pe modificările staged înainte de commit

echo -e "\033[1;36m🔍 Review Assistant Pre-Commit Hook\033[0m"
echo -e "\033[1;36m═══════════════════════════════════════════════\033[0m"

# Configurare
API_URL="http://localhost:5000/api/aireview/pre-commit"
JWT_TOKEN_FILE="$HOME/.review-assistant-token"

# Verifică dacă există token JWT
if [ ! -f "$JWT_TOKEN_FILE" ]; then
    echo -e "\033[1;33m⚠️  Token JWT nu a fost găsit!\033[0m"
    echo -e "\033[1;33m   Te rugăm să te autentifici mai întâi folosind:\033[0m"
    echo -e "\033[1;33m   review-assistant login\033[0m"
    echo ""
    echo -e "\033[1;33m   Commit-ul va continua fără review...\033[0m"
    exit 0
fi

# Citește token-ul
JWT_TOKEN=$(cat "$JWT_TOKEN_FILE")

# Obține path-ul repository-ului
REPO_PATH=$(git rev-parse --show-toplevel)

# Verifică dacă există modificări staged
STAGED_FILES=$(git diff --cached --name-only)
if [ -z "$STAGED_FILES" ]; then
    echo -e "\033[1;33mℹ️  Nu există modificări staged pentru review.\033[0m"
    exit 0
fi

echo -e "\033[1;32m📝 Fișiere staged pentru commit:\033[0m"
echo "$STAGED_FILES" | while read -r file; do
    echo -e "\033[0;37m   - $file\033[0m"
done
echo ""

echo -e "\033[1;36m🤖 Rulează AI Code Review...\033[0m"

# Creează request body
REQUEST_BODY=$(cat <<EOF
{
    "repositoryPath": "$REPO_PATH"
}
EOF
)

# Trimite cerere către API
RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_BODY")

# Verifică dacă cererea a fost cu succes
if [ $? -ne 0 ]; then
    echo -e "\033[1;31m❌ Eroare la comunicarea cu API-ul Review Assistant\033[0m"
    echo -e "\033[1;33m   Commit-ul va continua fără review...\033[0m"
    exit 0
fi

# Parse JSON response (folosind jq dacă este disponibil, altfel grep simplu)
if command -v jq &> /dev/null; then
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    SHOULD_BLOCK=$(echo "$RESPONSE" | jq -r '.shouldBlockCommit')
    CRITICAL_COUNT=$(echo "$RESPONSE" | jq -r '.criticalIssuesCount')
    HIGH_COUNT=$(echo "$RESPONSE" | jq -r '.highIssuesCount')
    TOTAL_COUNT=$(echo "$RESPONSE" | jq -r '.totalIssuesCount')
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
else
    # Fallback simplu fără jq
    SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[^,}]*' | cut -d':' -f2 | tr -d ' "')
    SHOULD_BLOCK=$(echo "$RESPONSE" | grep -o '"shouldBlockCommit":[^,}]*' | cut -d':' -f2 | tr -d ' "')
    CRITICAL_COUNT=$(echo "$RESPONSE" | grep -o '"criticalIssuesCount":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    HIGH_COUNT=$(echo "$RESPONSE" | grep -o '"highIssuesCount":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    TOTAL_COUNT=$(echo "$RESPONSE" | grep -o '"totalIssuesCount":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    MESSAGE=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
fi

# Verifică rezultatele
if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo -e "\033[1;32m═══════════════════════════════════════════════\033[0m"
    echo -e "\033[1;32m✅ Review finalizat!\033[0m"
    echo -e "\033[1;32m═══════════════════════════════════════════════\033[0m"
    echo ""
    echo -e "\033[1;36m📊 Rezultate:\033[0m"
    echo -e "\033[0;37m   • Total probleme: $TOTAL_COUNT\033[0m"
    echo -e "\033[1;31m   • Probleme critice: $CRITICAL_COUNT\033[0m"
    echo -e "\033[1;33m   • Probleme majore: $HIGH_COUNT\033[0m"
    echo ""

    if [ "$SHOULD_BLOCK" = "true" ]; then
        echo -e "\033[1;41m❌ COMMIT BLOCAT!\033[0m"
        echo ""
        echo -e "\033[1;31m   Au fost detectate $CRITICAL_COUNT probleme CRITICE!\033[0m"
        echo -e "\033[1;31m   Commit-ul nu poate fi efectuat până când problemele sunt rezolvate.\033[0m"
        echo ""
        echo -e "\033[1;33m   Mesaj: $MESSAGE\033[0m"
        echo ""
        echo -e "\033[0;37m   Pentru a ignora review-ul și forța commit-ul, folosește:\033[0m"
        echo -e "\033[0;37m   git commit --no-verify\033[0m"
        echo ""
        exit 1
    else
        if [ "$TOTAL_COUNT" -gt 0 ]; then
            echo -e "\033[1;33m⚠️  Au fost detectate $TOTAL_COUNT probleme (non-critice).\033[0m"
            echo -e "\033[1;33m   Commit-ul va continua, dar te rugăm să revizuiești problemele.\033[0m"
            echo ""
            echo -e "\033[1;33m   Mesaj: $MESSAGE\033[0m"
            echo ""
        else
            echo -e "\033[1;32m✨ Nicio problemă detectată! Cod excelent!\033[0m"
            echo ""
        fi
        
        echo -e "\033[1;32m✅ Commit-ul poate continua...\033[0m"
        exit 0
    fi
else
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"errorMessage":"[^"]*"' | cut -d'"' -f4)
    echo -e "\033[1;31m❌ Eroare la efectuarea review-ului: $ERROR_MSG\033[0m"
    echo -e "\033[1;33m   Commit-ul va continua...\033[0m"
    exit 0
fi

