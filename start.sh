#!/bin/bash
# Запускает всё: собирает и регистрирует расширение, открывает Safari, держит мост.
# Ctrl+C — остановить мост, выключить расширение и закрыть его приложение.
set -euo pipefail
cd "$(dirname "$0")"

APP="safari/build/Build/Products/Debug/Claude for Safari.app"
EXT_ID="local.claude.safari.Extension"
PORT=8787

command -v node >/dev/null || { echo "❌ Нет Node.js: brew install node"; exit 1; }
command -v claude >/dev/null || { echo "❌ Нет Claude Code: https://claude.com/claude-code"; exit 1; }

# Сборка, если приложения ещё нет или код расширения новее сборки
if [ ! -d "$APP" ] || [ -n "$(find extension -newer "$APP" -type f | head -1)" ]; then
  echo "🔨 Собираю расширение…"
  (cd "safari/Claude for Safari" && xcodebuild -project "Claude for Safari.xcodeproj" -scheme "Claude for Safari" \
    -configuration Debug -destination 'platform=macOS' -derivedDataPath ../build CODE_SIGN_IDENTITY="-" CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM="" \
    build -quiet) || { echo "❌ Сборка не удалась. Нужен Xcode: см. INSTALL.md"; exit 1; }
  touch "$APP"
fi

echo "🧩 Регистрирую расширение…"
pkill -x "Claude for Safari" 2>/dev/null || true
while pgrep -x "Claude for Safari" >/dev/null; do sleep 0.2; done  # иначе open падает с -600
open -g "$APP"
pluginkit -e use -i "$EXT_ID"

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "❌ Порт $PORT занят — мост уже запущен в другом терминале? Останови его или закрой процесс:"
  lsof -nP -iTCP:$PORT -sTCP:LISTEN
  exit 1
fi

open -a Safari
cat <<'EOF'

✅ Расширение готово. В Safari один раз после каждого его перезапуска:
   Настройки → Разработчик → «Разрешать неподписанные расширения»
   Настройки → Расширения → галочка у Claude for Safari

🌉 Запускаю мост. Не закрывай этот терминал. Ctrl+C — выключить всё.
EOF

cleanup() {
  pluginkit -e ignore -i "$EXT_ID"
  pkill -x "Claude for Safari" 2>/dev/null || true
  echo; echo "🛑 Мост остановлен, расширение выключено."
}
trap cleanup EXIT
trap 'exit 130' INT TERM

node bridge/main.js
