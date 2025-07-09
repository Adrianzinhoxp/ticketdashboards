const fs = require("fs-extra")
const path = require("path")

const CONFIG_FILE = path.join(__dirname, "server-configs.json")
const TICKETS_FILE = path.join(__dirname, "closed-tickets.json")

class Database {
  constructor() {
    this.configs = this.loadConfigs()
    this.closedTickets = this.loadClosedTickets()
    console.log(`📊 Database inicializado - ${this.closedTickets.length} tickets carregados`)
  }

  loadConfigs() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, "utf8")
        const configs = JSON.parse(data)
        console.log("✅ Configurações carregadas")
        return configs
      }
    } catch (error) {
      console.error("❌ Erro ao carregar configurações:", error)
    }

    // Criar arquivo vazio se não existir
    this.saveConfigs({})
    return {}
  }

  loadClosedTickets() {
    try {
      if (fs.existsSync(TICKETS_FILE)) {
        const data = fs.readFileSync(TICKETS_FILE, "utf8")
        const tickets = JSON.parse(data)
        console.log(`✅ ${tickets.length} tickets fechados carregados`)
        return tickets
      }
    } catch (error) {
      console.error("❌ Erro ao carregar tickets fechados:", error)
    }

    // Criar arquivo vazio se não existir
    this.saveClosedTickets([])
    return []
  }

  saveConfigs(configs = this.configs) {
    try {
      fs.ensureDirSync(path.dirname(CONFIG_FILE))
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2))
      console.log("💾 Configurações salvas")
    } catch (error) {
      console.error("❌ Erro ao salvar configurações:", error)
    }
  }

  saveClosedTickets(tickets = this.closedTickets) {
    try {
      fs.ensureDirSync(path.dirname(TICKETS_FILE))
      fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2))
      console.log(`💾 ${tickets.length} tickets salvos`)
    } catch (error) {
      console.error("❌ Erro ao salvar tickets fechados:", error)
    }
  }

  setServerConfig(guildId, config) {
    this.configs[guildId] = {
      ...config,
      updatedAt: new Date().toISOString(),
    }
    this.saveConfigs()
    console.log(`⚙️ Configuração do servidor ${guildId} atualizada`)
  }

  getServerConfig(guildId) {
    return this.configs[guildId] || null
  }

  addClosedTicket(ticketData) {
    // Adicionar timestamp se não existir
    if (!ticketData.savedAt) {
      ticketData.savedAt = new Date().toISOString()
    }

    this.closedTickets.unshift(ticketData) // Adiciona no início da lista

    // Manter apenas os últimos 1000 tickets para não sobrecarregar
    if (this.closedTickets.length > 1000) {
      this.closedTickets = this.closedTickets.slice(0, 1000)
      console.log("🗑️ Tickets antigos removidos (limite: 1000)")
    }

    this.saveClosedTickets()
    console.log(`📝 Ticket ${ticketData.id} adicionado ao database`)
  }

  getClosedTickets(limit = null) {
    if (limit) {
      return this.closedTickets.slice(0, limit)
    }
    return this.closedTickets
  }

  getTicketById(ticketId) {
    return this.closedTickets.find((ticket) => ticket.id === ticketId)
  }

  // Método para estatísticas
  getStats() {
    const tickets = this.closedTickets
    return {
      total: tickets.length,
      byType: tickets.reduce((acc, ticket) => {
        acc[ticket.type] = (acc[ticket.type] || 0) + 1
        return acc
      }, {}),
      byStatus: tickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      }, {}),
      recent: tickets.slice(0, 10),
      oldestTicket: tickets[tickets.length - 1]?.createdAt,
      newestTicket: tickets[0]?.createdAt,
    }
  }

  // Método para limpeza de dados antigos
  cleanup(daysOld = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const originalLength = this.closedTickets.length
    this.closedTickets = this.closedTickets.filter((ticket) => {
      const ticketDate = new Date(ticket.createdAt)
      return ticketDate > cutoffDate
    })

    if (this.closedTickets.length !== originalLength) {
      this.saveClosedTickets()
      console.log(`🧹 Limpeza: ${originalLength - this.closedTickets.length} tickets antigos removidos`)
    }
  }
}

module.exports = new Database()
