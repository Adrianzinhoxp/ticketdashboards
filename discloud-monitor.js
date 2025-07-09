class DiscloudMonitor {
  static logStartup() {
    console.log("🚀 Iniciando bot no Discloud...")
    console.log(`📊 Memória inicial: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`)
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
}

module.exports = DiscloudMonitor
