#!/bin/zsh
# Bütün testleri, her biri temiz bir sunucuda çalıştırır: ./testler.sh   (port: TEST_PORT, varsayılan 3497)
# Botlu mini oyun denemesi (altı oyun, birkaç dakika) ayrıca: ./testler.sh bot
cd "$(dirname "$0")"
P=${TEST_PORT:-3497}; export TEST_PORT=$P
dur() { for p in $(lsof -ti :$P -sTCP:LISTEN); do kill $p; done; sleep .5; }
kos() { dur; (env ${=2} PORT=$P node server.js > /tmp/bes-test.log 2>&1 &); sleep 1; node $1 || HATA=1; }
HATA=0
if [[ $1 == bot ]]; then kos test-bot.js; dur; exit $HATA; fi
for t in test-karma.js test-ritim.js test-kule.js test-zipla.js test-catlak.js test-isik.js test-renk.js; do kos $t; done
kos test.js "TEST=1 TUR_MS=3000 ARA_MS=300"
kos test-salon.js "TEST=1 TUR_MS=3000 ARA_MS=300"
dur
node test-catlak-tas.js || HATA=1
node test-plan.js || HATA=1
node test-dondur.js || HATA=1   # kendi sunucusunu açar
rm -f istatistik.jsonl
exit $HATA
