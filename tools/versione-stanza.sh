#!/bin/sh
# Aggiunge/aggiorna ?v=<versione> a tutti gli import dei moduli della stanza,
# così i browser scaricano subito la nuova versione dopo un push.
# Uso: sh tools/versione-stanza.sh   (dalla radice del repository)
V=$(date +%Y%m%d%H%M)
cd "$(dirname "$0")/../stanza" || exit 1
sed -i -E "s#(from '\./[a-z]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g; s#(import\('\.\./supabase\.min\.js)(\?v=[0-9]+)?'\)#\1?v=$V')#g" js/*.js
sed -i -E "s#(src=\"js/main\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#; s#(href=\"css/stanza\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#" index.html
echo "versione stanza: $V"
