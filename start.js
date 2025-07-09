// Arquivo de inicialização para produção
console.log("🚀 Iniciando aplicação...")

// Configurar variáveis de ambiente se necessário
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production"
}

// Verificar variáveis obrigatórias
const requiredEnvVars = ["DISCORD_TOKEN", "GUILD_ID", "TICKET_CATEGORY_ID", "STAFF_ROLE_ID"]

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error("❌ Variáveis de ambiente obrigatórias não encontradas:")
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`)
  })
  console.error("\n🔧 Configure essas variáveis no painel do Render")
  process.exit(1)
}

console.log("✅ Todas as variáveis de ambiente estão configuradas")

// Iniciar a aplicação principal
require("./index.js")
