#!/bin/bash
# Script pentru instalarea pre-commit hook-ului Review Assistant

echo -e "\033[1;36m🚀 Instalare Review Assistant Pre-Commit Hook\033[0m"
echo -e "\033[1;36m══════════════════════════════════════════════════\033[0m"
echo ""

# Verifică dacă suntem într-un repository Git
if [ ! -d ".git" ]; then
    echo -e "\033[1;31m❌ Eroare: Nu ești într-un repository Git!\033[0m"
    echo -e "\033[1;31m   Rulează acest script din root-ul unui repository Git.\033[0m"
    exit 1
fi

# Hook-ul pentru bash/sh
HOOK_SOURCE="scripts/pre-commit-hook.sh"
HOOK_DESTINATION=".git/hooks/pre-commit"

# Verifică dacă fișierul sursă există
if [ ! -f "$HOOK_SOURCE" ]; then
    echo -e "\033[1;31m❌ Eroare: Fișierul $HOOK_SOURCE nu a fost găsit!\033[0m"
    echo -e "\033[1;31m   Asigură-te că rulezi din root-ul proiectului Review Assistant.\033[0m"
    exit 1
fi

# Verifică dacă există deja un hook
if [ -f "$HOOK_DESTINATION" ]; then
    echo -e "\033[1;33m⚠️  Există deja un pre-commit hook!\033[0m"
    read -p "   Vrei să îl suprascrii? (y/N): " response
    
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
        echo -e "\033[1;33m   Instalare anulată.\033[0m"
        exit 0
    fi
    
    # Backup hook existent
    BACKUP_PATH="$HOOK_DESTINATION.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$HOOK_DESTINATION" "$BACKUP_PATH"
    echo -e "\033[1;32m   ✅ Backup creat: $BACKUP_PATH\033[0m"
fi

# Copiază hook-ul
cp "$HOOK_SOURCE" "$HOOK_DESTINATION"

# Setează permisiuni de execuție
chmod +x "$HOOK_DESTINATION"

echo ""
echo -e "\033[1;32m═══════════════════════════════════════════════════\033[0m"
echo -e "\033[1;32m✅ Pre-commit hook instalat cu succes!\033[0m"
echo -e "\033[1;32m═══════════════════════════════════════════════════\033[0m"
echo ""
echo -e "\033[1;36m📋 Următorii pași:\033[0m"
echo ""
echo -e "\033[0;37m1. Asigură-te că backend-ul Review Assistant rulează:\033[0m"
echo -e "\033[0;90m   cd Backend\033[0m"
echo -e "\033[0;90m   dotnet run\033[0m"
echo ""
echo -e "\033[0;37m2. Autentifică-te (o singură dată):\033[0m"
echo -e "\033[0;90m   curl -X POST http://localhost:5000/api/auth/login \\\\\033[0m"
echo -e "\033[0;90m     -H 'Content-Type: application/json' \\\\\033[0m"
echo -e "\033[0;90m     -d '{\"email\":\"user@example.com\",\"password\":\"password\"}' \\\\\033[0m"
echo -e "\033[0;90m     | jq -r '.token' > ~/.review-assistant-token\033[0m"
echo ""
echo -e "\033[0;37m3. Hook-ul va rula automat la fiecare commit!\033[0m"
echo ""
echo -e "\033[1;36m💡 Sfaturi:\033[0m"
echo -e "\033[0;90m   • Pentru a bypassa hook-ul: git commit --no-verify\033[0m"
echo -e "\033[0;90m   • Hook-ul blochează commit-urile cu probleme CRITICE\033[0m"
echo -e "\033[0;90m   • Problemele non-critice permit commit-ul să continue\033[0m"
echo ""
echo -e "\033[1;36m📖 Pentru mai multe informații:\033[0m"
echo -e "\033[0;90m   cat scripts/README.md\033[0m"
echo ""

