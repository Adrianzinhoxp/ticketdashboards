class AutoCleanup {
  constructor() {
    this.startCleanup()
  }

  startCleanup() {
    // Limpeza a cada 30 minutos
    setInterval(() => {
      this.performCleanup()
    }, 1800000)

    // Limpeza inicial após 5 minutos
    setTimeout(() => {
      this.performCleanup()
    }, 300000)
  }

  performCleanup() {
    try {
      // Forçar garbage collection se disponível
      if (global.gc) {
        global.gc()
      }

      // Log de memória atual
      const memUsage = process.memoryUsage()
      const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024)

      console.log(`🧹 Limpeza automática executada - Memória: ${heapUsed}MB`)
    } catch (error) {
      console.error("Erro na limpeza:", error)
    }
  }

  // Limpeza ao encerrar o processo
  setupGracefulShutdown() {
    process.on("SIGTERM", () => {
      console.log("🔄 Recebido SIGTERM, encerrando graciosamente...")
      this.performCleanup()
      process.exit(0)
    })

    process.on("SIGINT", () => {
      console.log("🔄 Recebido SIGINT, encerrando graciosamente...")
      this.performCleanup()
      process.exit(0)
    })
  }
}

module.exports = AutoCleanup
