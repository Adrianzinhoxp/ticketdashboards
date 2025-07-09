#!/bin/bash
echo "🔧 Preparando arquivos para deploy..."

# Criar diretório public se não existir
mkdir -p public

# Verificar se os arquivos existem
if [ ! -f "public/index.html" ]; then
    echo "❌ Arquivo public/index.html não encontrado!"
    echo "📁 Listando arquivos:"
    ls -la
    ls -la public/ 2>/dev/null || echo "Pasta public não existe"
fi

echo "✅ Build preparado!"
