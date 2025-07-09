const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js")

const express = require("express")
const cors = require("cors")
const path = require("path")
const fs = require("fs-extra")

// ==================== CLASSES UTILITÁRIAS ====================

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
        console.warn(`⚠️ Alto uso de memória: ${heapUsed}MB`)
      }
    }, 300000)
  }
}

class AutoCleanup {
  constructor() {
    this.startCleanup()
  }

  startCleanup() {
    setInterval(() => {
      this.performCleanup()
    }, 1800000)
  }

  performCleanup() {
    try {
      if (global.gc) {
        global.gc()
      }
      console.log("🧹 Limpeza automática executada")
    } catch (error) {
      console.error("Erro na limpeza:", error)
    }
  }
}

class Database {
  constructor() {
    this.CONFIG_FILE = path.join(__dirname, "server-configs.json")
    this.TICKETS_FILE = path.join(__dirname, "closed-tickets.json")
    this.configs = this.loadConfigs()
    this.closedTickets = this.loadClosedTickets()
  }

  loadConfigs() {
    try {
      if (fs.existsSync(this.CONFIG_FILE)) {
        const data = fs.readFileSync(this.CONFIG_FILE, "utf8")
        return JSON.parse(data)
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
    }
    return {}
  }

  loadClosedTickets() {
    try {
      if (fs.existsSync(this.TICKETS_FILE)) {
        const data = fs.readFileSync(this.TICKETS_FILE, "utf8")
        return JSON.parse(data)
      }
    } catch (error) {
      console.error("Erro ao carregar tickets fechados:", error)
    }
    return []
  }

  saveConfigs() {
    try {
      fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(this.configs, null, 2))
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
    }
  }

  saveClosedTickets() {
    try {
      fs.writeFileSync(this.TICKETS_FILE, JSON.stringify(this.closedTickets, null, 2))
    } catch (error) {
      console.error("Erro ao salvar tickets fechados:", error)
    }
  }

  setServerConfig(guildId, config) {
    this.configs[guildId] = config
    this.saveConfigs()
  }

  getServerConfig(guildId) {
    return this.configs[guildId] || null
  }

  addClosedTicket(ticketData) {
    this.closedTickets.unshift(ticketData)
    if (this.closedTickets.length > 1000) {
      this.closedTickets = this.closedTickets.slice(0, 1000)
    }
    this.saveClosedTickets()
    console.log(`📝 Ticket ${ticketData.id} salvo no dashboard`)
  }

  getClosedTickets() {
    return this.closedTickets
  }

  getTicketById(ticketId) {
    return this.closedTickets.find((ticket) => ticket.id === ticketId)
  }
}

class WebServer {
  constructor(database) {
    this.app = express()
    this.port = process.env.PORT || 3000
    this.database = database
    this.setupMiddleware()
    this.setupRoutes()
  }

  setupMiddleware() {
    this.app.use(cors())
    this.app.use(express.json())
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        tickets: this.database.getClosedTickets().length,
      })
    })

    // API Routes
    this.app.get("/api/tickets", (req, res) => {
      try {
        const tickets = this.database.getClosedTickets()
        console.log(`📊 API: Retornando ${tickets.length} tickets`)
        res.json(tickets)
      } catch (error) {
        console.error("Erro ao buscar tickets:", error)
        res.status(500).json({ error: "Erro interno do servidor" })
      }
    })

    this.app.get("/api/tickets/:id", (req, res) => {
      try {
        const ticket = this.database.getTicketById(req.params.id)
        if (!ticket) {
          return res.status(404).json({ error: "Ticket não encontrado" })
        }
        res.json(ticket)
      } catch (error) {
        console.error("Erro ao buscar ticket:", error)
        res.status(500).json({ error: "Erro interno do servidor" })
      }
    })

    this.app.get("/api/stats", (req, res) => {
      try {
        const tickets = this.database.getClosedTickets()
        const stats = {
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
        }
        res.json(stats)
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error)
        res.status(500).json({ error: "Erro interno do servidor" })
      }
    })

    // Dashboard Route - HTML completo
    this.app.get("/", (req, res) => {
      res.send(this.getCompleteHTML())
    })

    // 404 Handler
    this.app.use((req, res) => {
      res.status(404).json({ error: "Rota não encontrada" })
    })
  }

  start() {
    this.app.listen(this.port, "0.0.0.0", () => {
      console.log(`🌐 Dashboard disponível em: http://localhost:${this.port}`)
      if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`🌍 URL pública: ${process.env.RENDER_EXTERNAL_URL}`)
      }
      console.log(`📊 API disponível em: http://localhost:${this.port}/api/tickets`)
    })
  }

  getCompleteHTML() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Tickets - Discord Bot</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .loading-spinner {
            border: 4px solid #f3f4f6;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50">
    <div id="app" class="min-h-screen">
        <!-- Loading -->
        <div id="loading" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p class="text-gray-600">Carregando dashboard...</p>
            </div>
        </div>

        <!-- Main Content -->
        <div id="content" class="hidden">
            <div class="container mx-auto p-6">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">
                        <i class="fas fa-ticket-alt text-blue-500 mr-3"></i>
                        Dashboard de Tickets
                    </h1>
                    <p class="text-gray-600">Visualize e gerencie todos os tickets fechados do seu servidor Discord</p>
                    <div class="mt-2 text-sm text-gray-500">
                        <i class="fas fa-globe mr-1"></i>
                        <span>https://ticketdashboards.onrender.com</span>
                        <span class="ml-4">
                            <i class="fas fa-sync-alt mr-1"></i>
                            Última atualização: <span id="last-update">Carregando...</span>
                        </span>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div id="stats-cards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <!-- Cards serão inseridos aqui via JavaScript -->
                </div>

                <!-- Filters -->
                <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 class="text-lg font-semibold mb-4">
                        <i class="fas fa-filter mr-2"></i>
                        Filtros
                    </h3>
                    <div class="flex flex-col md:flex-row gap-4">
                        <div class="flex-1">
                            <input 
                                type="text" 
                                id="search-input" 
                                placeholder="Buscar por ID, título ou usuário..." 
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                        </div>
                        <select id="type-filter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="all">Todos os tipos</option>
                            <option value="corregedoria">Corregedoria</option>
                            <option value="up_patente">Up de Patente</option>
                            <option value="duvidas">Dúvidas</option>
                        </select>
                        <select id="status-filter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="all">Todos os status</option>
                            <option value="resolved">Resolvido</option>
                            <option value="approved">Aprovado</option>
                            <option value="rejected">Rejeitado</option>
                        </select>
                        <button id="clear-filters" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-times mr-2"></i>
                            Limpar
                        </button>
                    </div>
                </div>

                <!-- Tickets List -->
                <div id="tickets-container">
                    <!-- Tickets serão inseridos aqui via JavaScript -->
                </div>

                <!-- No Results -->
                <div id="no-results" class="hidden bg-white rounded-lg shadow-md p-12 text-center">
                    <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
                    <p class="text-gray-600">Tente ajustar os filtros ou termos de busca para encontrar tickets.</p>
                </div>

                <!-- Empty State -->
                <div id="empty-state" class="hidden bg-white rounded-lg shadow-md p-12 text-center">
                    <i class="fas fa-ticket-alt text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold mb-2">Nenhum ticket fechado ainda</h3>
                    <p class="text-gray-600">Os tickets fechados aparecerão aqui automaticamente.</p>
                    <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 class="font-semibold text-blue-900 mb-2">Como começar:</h4>
                        <ol class="list-decimal list-inside text-sm text-blue-800 space-y-1">
                            <li>Configure o bot no Discord: <code>/ticket-config #canal</code></li>
                            <li>Crie o painel: <code>/ticket-panel</code></li>
                            <li>Usuários podem abrir tickets</li>
                            <li>Tickets fechados aparecerão aqui</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal para visualizar transcript -->
    <div id="modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div class="p-6 border-b">
                <div class="flex justify-between items-center">
                    <h2 id="modal-title" class="text-xl font-bold"></h2>
                    <button id="close-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <p id="modal-subtitle" class="text-gray-600 mt-1"></p>
            </div>
            <div id="modal-content" class="p-6 overflow-y-auto max-h-96">
                <!-- Conteúdo do modal será inserido aqui -->
            </div>
            <div id="modal-footer" class="p-6 border-t bg-gray-50">
                <!-- Footer do modal será inserido aqui -->
            </div>
        </div>
    </div>

    <script>
        class TicketDashboard {
            constructor() {
                this.tickets = []
                this.filteredTickets = []
                this.stats = {}
                this.init()
            }

            async init() {
                try {
                    await this.loadData()
                    this.setupEventListeners()
                    this.render()
                    this.hideLoading()
                    this.updateLastUpdate()
                } catch (error) {
                    console.error("Erro na inicialização:", error)
                    this.showError("Erro ao carregar o dashboard")
                }
            }

            async loadData() {
                try {
                    console.log("Carregando dados...")
                    
                    const [ticketsResponse, statsResponse] = await Promise.all([
                        fetch("/api/tickets"),
                        fetch("/api/stats")
                    ])

                    this.tickets = await ticketsResponse.json()
                    this.stats = await statsResponse.json()
                    this.filteredTickets = [...this.tickets]

                    console.log(\`Carregados \${this.tickets.length} tickets\`)
                } catch (error) {
                    console.error("Erro ao carregar dados:", error)
                    this.tickets = []
                    this.stats = { total: 0, byType: {}, byStatus: {} }
                    this.filteredTickets = []
                }
            }

            setupEventListeners() {
                document.getElementById("search-input").addEventListener("input", () => this.applyFilters())
                document.getElementById("type-filter").addEventListener("change", () => this.applyFilters())
                document.getElementById("status-filter").addEventListener("change", () => this.applyFilters())
                document.getElementById("clear-filters").addEventListener("click", () => this.clearFilters())
                document.getElementById("close-modal").addEventListener("click", () => this.closeModal())
                document.getElementById("modal").addEventListener("click", (e) => {
                    if (e.target.id === "modal") this.closeModal()
                })

                // Atualização automática a cada 30 segundos
                setInterval(() => {
                    this.loadData().then(() => {
                        this.applyFilters()
                        this.updateLastUpdate()
                    })
                }, 30000)
            }

            applyFilters() {
                const searchTerm = document.getElementById("search-input").value.toLowerCase()
                const typeFilter = document.getElementById("type-filter").value
                const statusFilter = document.getElementById("status-filter").value

                this.filteredTickets = this.tickets.filter((ticket) => {
                    const matchesSearch = 
                        ticket.id.toLowerCase().includes(searchTerm) ||
                        ticket.title.toLowerCase().includes(searchTerm) ||
                        ticket.user.username.toLowerCase().includes(searchTerm)

                    const matchesType = typeFilter === "all" || ticket.type === typeFilter
                    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter

                    return matchesSearch && matchesType && matchesStatus
                })

                this.renderTickets()
            }

            clearFilters() {
                document.getElementById("search-input").value = ""
                document.getElementById("type-filter").value = "all"
                document.getElementById("status-filter").value = "all"
                this.filteredTickets = [...this.tickets]
                this.renderTickets()
            }

            render() {
                this.renderStats()
                this.renderTickets()
            }

            renderStats() {
                const container = document.getElementById("stats-cards")

                const cards = [
                    {
                        title: "Total de Tickets",
                        value: this.stats.total || 0,
                        subtitle: "Tickets fechados",
                        icon: "fas fa-ticket-alt",
                        color: "blue",
                    },
                    {
                        title: "Corregedoria",
                        value: this.stats.byType?.corregedoria || 0,
                        subtitle: "Questões disciplinares",
                        icon: "fas fa-exclamation-triangle",
                        color: "red",
                    },
                    {
                        title: "Promoções",
                        value: this.stats.byType?.up_patente || 0,
                        subtitle: "Solicitações de up",
                        icon: "fas fa-trophy",
                        color: "yellow",
                    },
                    {
                        title: "Dúvidas",
                        value: this.stats.byType?.duvidas || 0,
                        subtitle: "Esclarecimentos",
                        icon: "fas fa-question-circle",
                        color: "blue",
                    },
                ]

                container.innerHTML = cards.map(card => \`
                    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">\${card.title}</p>
                                <p class="text-2xl font-bold text-gray-900">\${card.value}</p>
                                <p class="text-xs text-gray-500">\${card.subtitle}</p>
                            </div>
                            <div class="text-\${card.color}-500">
                                <i class="\${card.icon} text-2xl"></i>
                            </div>
                        </div>
                    </div>
                \`).join("")
            }

            renderTickets() {
                const container = document.getElementById("tickets-container")
                const noResults = document.getElementById("no-results")
                const emptyState = document.getElementById("empty-state")

                noResults.classList.add("hidden")
                emptyState.classList.add("hidden")

                if (this.tickets.length === 0) {
                    container.innerHTML = ""
                    emptyState.classList.remove("hidden")
                    return
                }

                if (this.filteredTickets.length === 0) {
                    container.innerHTML = ""
                    noResults.classList.remove("hidden")
                    return
                }

                container.innerHTML = this.filteredTickets.map(ticket => {
                    const typeConfig = this.getTypeConfig(ticket.type)
                    const statusConfig = this.getStatusConfig(ticket.status)

                    return \`
                        <div class="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow">
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="p-2 rounded-lg \${typeConfig.bgColor}">
                                            <i class="\${typeConfig.icon} \${typeConfig.textColor}"></i>
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-lg">\${ticket.title}</h3>
                                            <p class="text-sm text-gray-500">ID: \${ticket.id}</p>
                                        </div>
                                    </div>
                                    <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                        <div class="flex items-center gap-1">
                                            <i class="fas fa-user"></i>
                                            <span>\${ticket.user.username}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <i class="fas fa-calendar"></i>
                                            <span>\${this.formatDate(ticket.createdAt)}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <i class="fas fa-clock"></i>
                                            <span>\${this.formatDuration(ticket.createdAt, ticket.closedAt)}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <i class="fas fa-comments"></i>
                                            <span>\${ticket.messages?.length || 0} mensagens</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="px-3 py-1 rounded-full text-sm font-medium \${typeConfig.badgeColor}">\${typeConfig.label}</span>
                                    <span class="px-3 py-1 rounded-full text-sm font-medium \${statusConfig.badgeColor}">\${statusConfig.label}</span>
                                    <button onclick="dashboard.openModal('\${ticket.id}')" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                        <i class="fas fa-eye mr-2"></i>
                                        Ver Transcript
                                    </button>
                                </div>
                            </div>
                        </div>
                    \`
                }).join("")
            }

            async openModal(ticketId) {
                const ticket = this.tickets.find(t => t.id === ticketId)
                if (!ticket) return

                const typeConfig = this.getTypeConfig(ticket.type)

                document.getElementById("modal-title").innerHTML = \`
                    <i class="\${typeConfig.icon} \${typeConfig.textColor} mr-2"></i>
                    \${ticket.title}
                \`

                document.getElementById("modal-subtitle").textContent = 
                    \`Ticket \${ticket.id} • \${ticket.user.username} • \${this.formatDate(ticket.createdAt)}\`

                const messagesHtml = ticket.messages && ticket.messages.length > 0
                    ? ticket.messages.map(message => \`
                        <div class="flex gap-3 mb-4 \${message.isStaff ? "flex-row-reverse" : ""}">
                            <div class="flex-shrink-0 w-8 h-8 rounded-full \${message.isStaff ? "bg-blue-500" : "bg-gray-500"} flex items-center justify-center text-white text-sm font-medium">
                                \${message.author[0].toUpperCase()}
                            </div>
                            <div class="flex-1 \${message.isStaff ? "text-right" : ""}">
                                <div class="flex items-center gap-2 mb-1 \${message.isStaff ? "justify-end" : ""}">
                                    <span class="font-medium text-sm">\${message.author}</span>
                                    \${message.isStaff ? '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Staff</span>' : ""}
                                    <span class="text-xs text-gray-500">\${this.formatDate(message.timestamp)}</span>
                                </div>
                                <div class="p-3 rounded-lg \${message.isStaff ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"}">
                                    \${message.content}
                                </div>
                            </div>
                        </div>
                    \`).join("")
                    : '<div class="text-center text-gray-500 py-8"><i class="fas fa-comments text-2xl mb-2"></i><p>Nenhuma mensagem encontrada</p></div>'

                document.getElementById("modal-content").innerHTML = messagesHtml

                document.getElementById("modal-footer").innerHTML = \`
                    <div class="flex items-center justify-between text-sm text-gray-600">
                        <span>Fechado por: \${ticket.staff?.username || "Sistema"}</span>
                        <span>Motivo: \${ticket.reason || "Não especificado"}</span>
                    </div>
                \`

                document.getElementById("modal").classList.remove("hidden")
            }

            closeModal() {
                document.getElementById("modal").classList.add("hidden")
            }

            getTypeConfig(type) {
                const configs = {
                    corregedoria: {
                        label: "Corregedoria",
                        icon: "fas fa-exclamation-triangle",
                        bgColor: "bg-red-50",
                        textColor: "text-red-700",
                        badgeColor: "bg-red-500 text-white",
                    },
                    up_patente: {
                        label: "Up de Patente",
                        icon: "fas fa-trophy",
                        bgColor: "bg-yellow-50",
                        textColor: "text-yellow-700",
                        badgeColor: "bg-yellow-500 text-white",
                    },
                    duvidas: {
                        label: "Dúvidas",
                        icon: "fas fa-question-circle",
                        bgColor: "bg-blue-50",
                        textColor: "text-blue-700",
                        badgeColor: "bg-blue-500 text-white",
                    },
                }
                return configs[type] || configs.duvidas
            }

            getStatusConfig(status) {
                const configs = {
                    resolved: { label: "Resolvido", badgeColor: "bg-green-500 text-white" },
                    approved: { label: "Aprovado", badgeColor: "bg-blue-500 text-white" },
                    rejected: { label: "Rejeitado", badgeColor: "bg-red-500 text-white" },
                }
                return configs[status] || configs.resolved
            }

            formatDate(dateString) {
                try {
                    return new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    }).format(new Date(dateString))
                } catch (error) {
                    return "Data inválida"
                }
            }

            formatDuration(start, end) {
                try {
                    const diff = new Date(end).getTime() - new Date(start).getTime()
                    const hours = Math.floor(diff / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

                    if (hours > 0) {
                        return \`\${hours}h \${minutes}m\`
                    }
                    return \`\${minutes}m\`
                } catch (error) {
                    return "N/A"
                }
            }

            updateLastUpdate() {
                const now = new Date()
                document.getElementById("last-update").textContent = this.formatDate(now.toISOString())
            }

            hideLoading() {
                document.getElementById("loading").classList.add("hidden")
                document.getElementById("content").classList.remove("hidden")
            }

            showError(message) {
                console.error(message)
                document.getElementById("loading").innerHTML = \`
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h3>
                        <p class="text-gray-600">\${message}</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            Tentar novamente
                        </button>
                    </div>
                \`
            }
        }

        // Inicializar dashboard
        const dashboard = new TicketDashboard()
    </script>
</body>
</html>`
  }
}

// ==================== CONFIGURAÇÕES ====================

const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN || process.env.TOKEN,
  GUILD_ID: process.env.GUILD_ID,
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID,
  STAFF_ROLE_ID: process.env.STAFF_ROLE_ID,
  PANEL_IMAGE_URL: process.env.PANEL_IMAGE_URL || "/placeholder.svg?height=200&width=400",
}

// Validar configurações
if (!CONFIG.TOKEN || !CONFIG.GUILD_ID || !CONFIG.TICKET_CATEGORY_ID || !CONFIG.STAFF_ROLE_ID) {
  console.error("❌ Configurações obrigatórias não encontradas!")
  console.error("Certifique-se de configurar as variáveis de ambiente:")
  console.error("- DISCORD_TOKEN")
  console.error("- GUILD_ID")
  console.error("- TICKET_CATEGORY_ID")
  console.error("- STAFF_ROLE_ID")
  process.exit(1)
}

// ==================== INICIALIZAÇÃO ====================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
})

const database = new Database()
const activeTickets = new Map()

// ==================== FUNÇÕES AUXILIARES ====================

function findTicketByChannel(channelId) {
  for (const [userId, ticketData] of activeTickets.entries()) {
    if (ticketData.channelId === channelId) {
      return { userId, ticket: ticketData }
    }
  }
  return null
}

async function safeReply(interaction, options) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(options)
    } else {
      return await interaction.reply(options)
    }
  } catch (error) {
    console.error("Erro ao responder interação:", error)
    if (interaction.channel) {
      try {
        return await interaction.channel.send({
          content: options.content || "❌ Erro ao processar a interação.",
          embeds: options.embeds || [],
          components: options.components || [],
        })
      } catch (channelError) {
        console.error("Erro ao enviar mensagem no canal:", channelError)
      }
    }
  }
}

async function collectChannelMessages(channel) {
  const messages = []
  let lastMessageId = null

  try {
    while (true) {
      const options = { limit: 100 }
      if (lastMessageId) {
        options.before = lastMessageId
      }

      const fetchedMessages = await channel.messages.fetch(options)
      if (fetchedMessages.size === 0) break

      fetchedMessages.forEach((message) => {
        if (!message.author.bot || message.embeds.length > 0) {
          messages.push({
            id: message.id,
            author: message.author.username,
            content: message.content || message.embeds[0]?.description || "Embed/Anexo",
            timestamp: message.createdAt.toISOString(),
            isStaff: message.member?.roles.cache.has(CONFIG.STAFF_ROLE_ID) || false,
          })
        }
      })

      lastMessageId = fetchedMessages.last().id
      if (fetchedMessages.size < 100) break
    }
  } catch (error) {
    console.error("Erro ao coletar mensagens:", error)
  }

  return messages.reverse()
}

// ==================== EVENTOS DO BOT ====================

client.once("ready", () => {
  DiscloudMonitor.logStartup()
  console.log(`✅ Bot online como ${client.user.tag}!`)

  const dashboardUrl =
    process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.PORT || 3000}`
  console.log(`🌐 Dashboard URL: ${dashboardUrl}`)

  DiscloudMonitor.startMemoryMonitoring()
  new AutoCleanup()

  const webServer = new WebServer(database)
  webServer.start()

  registerSlashCommands()
  DiscloudMonitor.logSuccess("Bot totalmente inicializado")
})

async function registerSlashCommands() {
  const commands = [
    {
      name: "ticket-panel",
      description: "Cria o painel principal de tickets",
    },
    {
      name: "close-ticket",
      description: "Fecha o ticket atual",
    },
    {
      name: "ticket-config",
      description: "Configura o canal onde os tickets serão abertos",
      options: [
        {
          name: "canal",
          description: "Canal onde o painel de tickets será usado",
          type: 7,
          required: true,
        },
      ],
    },
    {
      name: "dashboard",
      description: "Mostra o link do dashboard de tickets",
    },
  ]

  try {
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID)
    if (!guild) {
      console.error("❌ Servidor não encontrado! Verifique o GUILD_ID na configuração.")
      return
    }
    await guild.commands.set(commands)
    console.log("✅ Comandos slash registrados!")
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error)
  }
}

// ==================== MANIPULADORES DE INTERAÇÃO ====================

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction

      if (commandName === "ticket-panel") {
        await createTicketPanel(interaction)
      } else if (commandName === "close-ticket") {
        await closeTicket(interaction)
      } else if (commandName === "ticket-config") {
        await configureTicketChannel(interaction)
      } else if (commandName === "dashboard") {
        await showDashboard(interaction)
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "ticket_select") {
        await handleTicketSelection(interaction)
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "close_ticket_modal") {
        await showCloseTicketModal(interaction)
      } else if (interaction.customId === "assume_ticket") {
        await assumeTicket(interaction)
      } else if (interaction.customId === "add_member_modal") {
        await showAddMemberModal(interaction)
      } else if (interaction.customId === "remove_member_modal") {
        await showRemoveMemberModal(interaction)
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "close_ticket_reason") {
        await handleCloseTicketModal(interaction)
      } else if (interaction.customId === "add_member_id") {
        await handleAddMemberModal(interaction)
      } else if (interaction.customId === "remove_member_id") {
        await handleRemoveMemberModal(interaction)
      }
    }
  } catch (error) {
    console.error("Erro no manipulador de interações:", error)
    try {
      await safeReply(interaction, {
        content: "❌ Ocorreu um erro ao processar sua solicitação. Tente novamente.",
        flags: MessageFlags.Ephemeral,
      })
    } catch (replyError) {
      console.error("Erro ao enviar mensagem de erro:", replyError)
    }
  }
})

// ==================== FUNÇÕES DOS COMANDOS ====================

async function showDashboard(interaction) {
  const dashboardUrl =
    process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.PORT || 3000}`

  const embed = new EmbedBuilder()
    .setTitle("📊 Dashboard de Tickets")
    .setDescription(`**Acesse o dashboard completo de tickets:**

🌐 **Link do Dashboard:** ${dashboardUrl}

**Funcionalidades disponíveis:**
• 📈 Estatísticas em tempo real
• 🔍 Sistema de busca e filtros
• 💬 Visualização completa de transcripts
• 📊 Relatórios por tipo e status`)
    .setColor("#0099ff")
    .setFooter({ text: "Dashboard de Tickets • Sistema integrado" })
    .setTimestamp()

  await safeReply(interaction, {
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  })
}

async function createTicketPanel(interaction) {
  const guildConfig = database.getServerConfig(interaction.guild.id)
  if (!guildConfig || guildConfig.ticketChannelId !== interaction.channel.id) {
    return await safeReply(interaction, {
      content: "❌ Este canal não está configurado para tickets. Use `/ticket-config` primeiro.",
      flags: MessageFlags.Ephemeral,
    })
  }

  const embed = new EmbedBuilder()
    .setTitle("🎫 SISTEMA DE TICKETS")
    .setDescription(`**Bem-vindo ao nosso sistema de atendimento!**

Para abrir um ticket, selecione o tipo de atendimento que você precisa no menu abaixo:

**⚠️ Corregedoria** - Questões disciplinares e correções
**🏆 Up de Patente** - Solicitações de promoção  
**❓ Dúvidas** - Esclarecimentos gerais

**Clique no menu abaixo para selecionar uma opção:**`)
    .setColor("#0099ff")
    .setImage(CONFIG.PANEL_IMAGE_URL)
    .setFooter({ text: "Sistema de Tickets • Desenvolvido para o servidor" })
    .setTimestamp()

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("🎫 Selecione o tipo de atendimento...")
    .addOptions([
      {
        label: "Corregedoria",
        description: "Questões disciplinares e correções",
        value: "corregedoria",
        emoji: "⚠️",
      },
      {
        label: "Up de Patente",
        description: "Solicitações de promoção",
        value: "up_patente",
        emoji: "🏆",
      },
      {
        label: "Dúvidas",
        description: "Esclarecimentos gerais",
        value: "duvidas",
        emoji: "❓",
      },
    ])

  const row = new ActionRowBuilder().addComponents(selectMenu)

  await safeReply(interaction, {
    embeds: [embed],
    components: [row],
  })
}

async function handleTicketSelection(interaction) {
  const ticketType = interaction.values[0]
  const userId = interaction.user.id

  if (activeTickets.has(userId)) {
    return await safeReply(interaction, {
      content: "❌ Você já possui um ticket aberto! Feche o ticket atual antes de abrir um novo.",
      flags: MessageFlags.Ephemeral,
    })
  }

  const ticketConfig = {
    corregedoria: {
      name: "corregedoria",
      title: "⚠️ Corregedoria",
      titleMessage: "Ticket Criado - Corregedoria",
      description: "Ticket para questões disciplinares e correções",
      color: "#000000",
      emoji: "⚠️",
    },
    up_patente: {
      name: "up-patente",
      title: "🏆 Up de Patente",
      titleMessage: "Ticket Criado - Up de Patente",
      description: "Ticket para solicitações de promoção",
      color: "#000000",
      emoji: "🏆",
    },
    duvidas: {
      name: "duvidas",
      title: "❓ Dúvidas",
      titleMessage: "Ticket Criado - Dúvidas",
      description: "Ticket para esclarecimentos gerais",
      color: "#000000",
      emoji: "❓",
    },
  }

  const config = ticketConfig[ticketType]

  try {
    const ticketChannel = await interaction.guild.channels.create({
      name: `${config.emoji}${config.name}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CONFIG.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: CONFIG.STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ],
    })

    activeTickets.set(userId, {
      channelId: ticketChannel.id,
      type: ticketType,
      createdAt: new Date(),
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL(),
      },
    })

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(config.titleMessage)
      .setDescription(`Olá ${interaction.user}! 👋

Seja muito bem-vindo(a) ao seu ticket! Nossa equipe estará aqui para te ajudar da melhor forma possível.

**Por favor, descreva detalhadamente sua solicitação para que possamos te atender rapidamente.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📋 Informações do Ticket:**
• **Usuário:** ${interaction.user}
• **Tipo:** ${config.title}
• **Criado em:** <t:${Math.floor(Date.now() / 1000)}:F>

**📝 Instruções:**
• Descreva sua solicitação com detalhes
• Aguarde o atendimento da nossa equipe
• Para fechar o ticket, use o botão abaixo`)
      .setColor(config.color)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: "Sistema de Tickets • Aguardando atendimento" })
      .setTimestamp()

    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket_modal")
      .setLabel("🔒 Fechar Ticket")
      .setStyle(ButtonStyle.Secondary)

    const assumeButton = new ButtonBuilder()
      .setCustomId("assume_ticket")
      .setLabel("👑 Assumir Ticket")
      .setStyle(ButtonStyle.Secondary)

    const addMemberButton = new ButtonBuilder()
      .setCustomId("add_member_modal")
      .setLabel("➕ Adicionar Membro")
      .setStyle(ButtonStyle.Secondary)

    const removeMemberButton = new ButtonBuilder()
      .setCustomId("remove_member_modal")
      .setLabel("➖ Remover Membro")
      .setStyle(ButtonStyle.Secondary)

    const buttonRow1 = new ActionRowBuilder().addComponents(closeButton, assumeButton, addMemberButton)
    const buttonRow2 = new ActionRowBuilder().addComponents(removeMemberButton)

    await ticketChannel.send({
      content: `${interaction.user} <@&${CONFIG.STAFF_ROLE_ID}>`,
      embeds: [welcomeEmbed],
      components: [buttonRow1, buttonRow2],
    })

    await safeReply(interaction, {
      content: `✅ Ticket criado com sucesso! Acesse: ${ticketChannel}`,
      flags: MessageFlags.Ephemeral,
    })
  } catch (error) {
    console.error("Erro ao criar ticket:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao criar o ticket. Verifique se o bot tem as permissões necessárias.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function configureTicketChannel(interaction) {
  const channel = interaction.options.getChannel("canal")

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return await safeReply(interaction, {
      content: "❌ Você não tem permissão para configurar o sistema de tickets.",
      flags: MessageFlags.Ephemeral,
    })
  }

  database.setServerConfig(interaction.guild.id, {
    ticketChannelId: channel.id,
    configuredBy: interaction.user.id,
    configuredAt: new Date(),
  })

  const embed = new EmbedBuilder()
    .setTitle("✅ Canal de Tickets Configurado")
    .setDescription(`O canal ${channel} foi configurado como canal de tickets.
    
**Próximos passos:**
• Vá até ${channel}
• Use o comando \`/ticket-panel\` para criar o painel
• Os usuários poderão abrir tickets através do painel
• Use \`/dashboard\` para acessar o painel de controle`)
    .setColor("#00ff00")
    .setFooter({ text: "Sistema de Tickets" })
    .setTimestamp()

  await safeReply(interaction, {
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  })
}

async function closeTicket(interaction) {
  const userId = interaction.user.id
  const ticket = activeTickets.get(userId)

  if (!ticket || ticket.channelId !== interaction.channel.id) {
    return await safeReply(interaction, {
      content: "❌ Este não é um canal de ticket válido ou você não é o dono deste ticket.",
      flags: MessageFlags.Ephemeral,
    })
  }

  await showCloseTicketModal(interaction)
}

async function showCloseTicketModal(interaction) {
  try {
    const modal = new ModalBuilder().setCustomId("close_ticket_reason").setTitle("Fechar Ticket")

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Motivo do fechamento:")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Digite o motivo para fechar este ticket...")
      .setRequired(true)
      .setMaxLength(500)

    const firstActionRow = new ActionRowBuilder().addComponents(reasonInput)
    modal.addComponents(firstActionRow)

    await interaction.showModal(modal)
  } catch (error) {
    console.error("Erro ao mostrar modal:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao abrir formulário. Tente novamente.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleCloseTicketModal(interaction) {
  const reason = interaction.fields.getTextInputValue("reason")
  const ticketInfo = findTicketByChannel(interaction.channel.id)

  if (!ticketInfo) {
    return await safeReply(interaction, {
      content: "❌ Ticket não encontrado.",
      flags: MessageFlags.Ephemeral,
    })
  }

  const { userId: ticketUserId, ticket } = ticketInfo

  try {
    const messages = await collectChannelMessages(interaction.channel)

    const closedTicketData = {
      id: `TKT-${Date.now()}`,
      type: ticket.type,
      title: `${ticket.type === "corregedoria" ? "Corregedoria" : ticket.type === "up_patente" ? "Up de Patente" : "Dúvidas"} - ${ticket.user.username}`,
      user: ticket.user,
      staff: {
        id: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL(),
      },
      createdAt: ticket.createdAt.toISOString(),
      closedAt: new Date().toISOString(),
      reason: reason,
      status: ticket.type === "up_patente" ? "approved" : "resolved",
      messages: messages,
    }

    database.addClosedTicket(closedTicketData)

    const logEmbed = new EmbedBuilder()
      .setTitle("🔒 Ticket Fechado")
      .setDescription(`**Usuário:** <@${ticketUserId}>
**Tipo:** ${ticket.type}
**Motivo:** ${reason}
**Criado em:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>
**Fechado em:** <t:${Math.floor(Date.now() / 1000)}:F>
**Fechado por:** ${interaction.user}

**📊 Ticket salvo no dashboard com ID:** \`${closedTicketData.id}\``)
      .setColor("#000000")
      .setTimestamp()

    activeTickets.delete(ticketUserId)

    await safeReply(interaction, {
      content: "🔒 Ticket será fechado em 10 segundos...",
      embeds: [logEmbed],
    })

    setTimeout(async () => {
      try {
        await interaction.channel.delete()
      } catch (error) {
        console.error("Erro ao deletar canal:", error)
      }
    }, 10000)
  } catch (error) {
    console.error("Erro ao fechar ticket:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao fechar o ticket.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function assumeTicket(interaction) {
  try {
    const embed = new EmbedBuilder()
      .setTitle("👑 Ticket Assumido")
      .setDescription(`${interaction.user} assumiu este ticket e será responsável pelo atendimento.`)
      .setColor("#000000")
      .setTimestamp()

    await safeReply(interaction, {
      embeds: [embed],
    })
  } catch (error) {
    console.error("Erro ao assumir ticket:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao assumir ticket.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function showAddMemberModal(interaction) {
  try {
    const modal = new ModalBuilder().setCustomId("add_member_id").setTitle("Adicionar Membro ao Ticket")

    const userIdInput = new TextInputBuilder()
      .setCustomId("user_id")
      .setLabel("ID do Discord do usuário:")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Cole o ID do Discord aqui...")
      .setRequired(true)
      .setMaxLength(20)

    const firstActionRow = new ActionRowBuilder().addComponents(userIdInput)
    modal.addComponents(firstActionRow)

    await interaction.showModal(modal)
  } catch (error) {
    console.error("Erro ao mostrar modal:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao abrir formulário. Tente novamente.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleAddMemberModal(interaction) {
  const userId = interaction.fields.getTextInputValue("user_id")

  try {
    const member = await interaction.guild.members.fetch(userId)

    await interaction.channel.permissionOverwrites.create(member.user, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    })

    const embed = new EmbedBuilder()
      .setTitle("➕ Membro Adicionado")
      .setDescription(`${member.user} foi adicionado ao ticket por ${interaction.user}.`)
      .setColor("#000000")
      .setTimestamp()

    await safeReply(interaction, {
      content: `${member.user}`,
      embeds: [embed],
    })
  } catch (error) {
    await safeReply(interaction, {
      content: "❌ Usuário não encontrado. Verifique se o ID está correto.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function showRemoveMemberModal(interaction) {
  try {
    const modal = new ModalBuilder().setCustomId("remove_member_id").setTitle("Remover Membro do Ticket")

    const userIdInput = new TextInputBuilder()
      .setCustomId("user_id")
      .setLabel("ID do Discord do usuário:")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Cole o ID do Discord aqui...")
      .setRequired(true)
      .setMaxLength(20)

    const firstActionRow = new ActionRowBuilder().addComponents(userIdInput)
    modal.addComponents(firstActionRow)

    await interaction.showModal(modal)
  } catch (error) {
    console.error("Erro ao mostrar modal de remoção:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao abrir formulário. Tente novamente.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleRemoveMemberModal(interaction) {
  const userId = interaction.fields.getTextInputValue("user_id")

  try {
    const member = await interaction.guild.members.fetch(userId)
    await interaction.channel.permissionOverwrites.delete(member.user)

    const embed = new EmbedBuilder()
      .setTitle("➖ Membro Removido")
      .setDescription(`${member.user} foi removido do ticket por ${interaction.user}.`)
      .setColor("#ff0000")
      .setTimestamp()

    await safeReply(interaction, {
      embeds: [embed],
    })
  } catch (error) {
    console.error("Erro ao remover membro:", error)
    await safeReply(interaction, {
      content: "❌ Usuário não encontrado ou erro ao remover. Verifique se o ID está correto.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

// ==================== MANIPULADORES DE ERRO ====================

client.on("error", (error) => {
  DiscloudMonitor.logError(error, "Erro do cliente Discord")
})

process.on("unhandledRejection", (error) => {
  DiscloudMonitor.logError(error, "Promise rejeitada não tratada")
})

process.on("uncaughtException", (error) => {
  DiscloudMonitor.logError(error, "Exceção não capturada")
  process.exit(1)
})

// ==================== LOGIN ====================

client.login(CONFIG.TOKEN).catch((error) => {
  console.error("❌ Erro ao fazer login:")
  console.error("Verifique se o DISCORD_TOKEN está correto nas variáveis de ambiente")
  console.error("Erro:", error.message)
  process.exit(1)
})
