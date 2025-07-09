class AutoCleanup {
  constructor() {
    this.startCleanup()
  }

  startCleanup() {
    // Limpeza a cada 30 minutos
    setInterval(() => {
      this.performCleanup()
    }, 1800000)
  }

  performCleanup() {
    try {
      // Forçar garbage collection se disponível
      if (global.gc) {
        global.gc()
      }

      console.log("🧹 Limpeza automática executada")
    } catch (error) {
      console.error("Erro na limpeza:", error)
    }
  }
}

module.exports = AutoCleanup
