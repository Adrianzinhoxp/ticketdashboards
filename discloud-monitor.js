class DiscloudMonitor {
  static logStartup() {
    console.log("🚀 Iniciando bot no Render...")
    console.log(`📊 Memória inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`)
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || "development"}`)
    console.log(`⚡ Node.js: ${process.version}`)
  }

  static logSuccess(message) {
    console.log(`✅ ${message}`)
  }

  static logError(error, context = "Erro geral") {
    console.error(`❌ ${context}:`, error)
  }

  static startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage()
      const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024)

      if (heapUsed > 400) {
        // Alerta se usar mais de 400MB
        console.warn(`⚠️ Alto uso de memória: ${heapUsed}MB`)
      }
    }, 300000) // Verifica a cada 5 minutos
  }

  static logDeployInfo() {
    console.log("🌐 Deploy Information:")
    console.log(`   - Platform: Render`)
    console.log(`   - URL: ${process.env.RENDER_EXTERNAL_URL || "localhost"}`)
    console.log(`   - Port: ${process.env.PORT || 3000}`)
    console.log(`   - Memory Limit: 512MB`)
  }
}

module.exports = DiscloudMonitor
