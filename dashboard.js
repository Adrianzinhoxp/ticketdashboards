class TicketDashboard {
  constructor() {
    this.tickets = []
    this.filteredTickets = []
    this.stats = {}

    this.init()
  }

  async init() {
    await this.loadData()
    this.setupEventListeners()
    this.render()
    this.hideLoading()
  }

  async loadData() {
    try {
      const [ticketsResponse, statsResponse] = await Promise.all([fetch("/api/tickets"), fetch("/api/stats")])

      this.tickets = await ticketsResponse.json()
      this.stats = await statsResponse.json()
      this.filteredTickets = [...this.tickets]
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      this.showError("Erro ao carregar dados do servidor")
    }
  }

  setupEventListeners() {
    // Filtros
    document.getElementById("search-input").addEventListener("input", () => this.applyFilters())
    document.getElementById("type-filter").addEventListener("change", () => this.applyFilters())
    document.getElementById("status-filter").addEventListener("change", () => this.applyFilters())
    document.getElementById("clear-filters").addEventListener("click", () => this.clearFilters())

    // Modal
    document.getElementById("close-modal").addEventListener("click", () => this.closeModal())
    document.getElementById("modal").addEventListener("click", (e) => {
      if (e.target.id === "modal") this.closeModal()
    })
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

    container.innerHTML = cards
      .map(
        (card) => `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">${card.title}</p>
                        <p class="text-2xl font-bold text-gray-900">${card.value}</p>
                        <p class="text-xs text-gray-500">${card.subtitle}</p>
                    </div>
                    <div class="text-${card.color}-500">
                        <i class="${card.icon} text-2xl"></i>
                    </div>
                </div>
            </div>
        `,
      )
      .join("")
  }

  renderTickets() {
    const container = document.getElementById("tickets-container")
    const noResults = document.getElementById("no-results")

    if (this.filteredTickets.length === 0) {
      container.innerHTML = ""
      noResults.classList.remove("hidden")
      return
    }

    noResults.classList.add("hidden")

    container.innerHTML = this.filteredTickets
      .map((ticket) => {
        const typeConfig = this.getTypeConfig(ticket.type)
        const statusConfig = this.getStatusConfig(ticket.status)

        return `
                <div class="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="p-2 rounded-lg ${typeConfig.bgColor}">
                                    <i class="${typeConfig.icon} ${typeConfig.textColor}"></i>
                                </div>
                                <div>
                                    <h3 class="font-semibold text-lg">${ticket.title}</h3>
                                    <p class="text-sm text-gray-500">ID: ${ticket.id}</p>
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div class="flex items-center gap-1">
                                    <i class="fas fa-user"></i>
                                    <span>${ticket.user.username}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <i class="fas fa-calendar"></i>
                                    <span>${this.formatDate(ticket.createdAt)}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <i class="fas fa-clock"></i>
                                    <span>${this.formatDuration(ticket.createdAt, ticket.closedAt)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 rounded-full text-sm font-medium ${typeConfig.badgeColor}">${typeConfig.label}</span>
                            <span class="px-3 py-1 rounded-full text-sm font-medium ${statusConfig.badgeColor}">${statusConfig.label}</span>
                            <button onclick="dashboard.openModal('${ticket.id}')" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                <i class="fas fa-eye mr-2"></i>
                                Ver Transcript
                            </button>
                        </div>
                    </div>
                </div>
            `
      })
      .join("")
  }

  async openModal(ticketId) {
    const ticket = this.tickets.find((t) => t.id === ticketId)
    if (!ticket) return

    const typeConfig = this.getTypeConfig(ticket.type)

    document.getElementById("modal-title").innerHTML = `
            <i class="${typeConfig.icon} ${typeConfig.textColor} mr-2"></i>
            ${ticket.title}
        `

    document.getElementById("modal-subtitle").textContent =
      `Ticket ${ticket.id} • ${ticket.user.username} • ${this.formatDate(ticket.createdAt)}`

    // Renderizar mensagens
    const messagesHtml = ticket.messages
      .map(
        (message) => `
            <div class="flex gap-3 mb-4 ${message.isStaff ? "flex-row-reverse" : ""}">
                <div class="flex-shrink-0 w-8 h-8 rounded-full ${message.isStaff ? "bg-blue-500" : "bg-gray-500"} flex items-center justify-center text-white text-sm font-medium">
                    ${message.author[0].toUpperCase()}
                </div>
                <div class="flex-1 ${message.isStaff ? "text-right" : ""}">
                    <div class="flex items-center gap-2 mb-1 ${message.isStaff ? "justify-end" : ""}">
                        <span class="font-medium text-sm">${message.author}</span>
                        ${message.isStaff ? '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Staff</span>' : ""}
                        <span class="text-xs text-gray-500">${this.formatDate(message.timestamp)}</span>
                    </div>
                    <div class="p-3 rounded-lg ${message.isStaff ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"}">
                        ${message.content}
                    </div>
                </div>
            </div>
        `,
      )
      .join("")

    document.getElementById("modal-content").innerHTML = messagesHtml

    document.getElementById("modal-footer").innerHTML = `
            <div class="flex items-center justify-between text-sm text-gray-600">
                <span>Fechado por: ${ticket.staff.username}</span>
                <span>Motivo: ${ticket.reason}</span>
            </div>
        `

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
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString))
  }

  formatDuration(start, end) {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  hideLoading() {
    document.getElementById("loading").classList.add("hidden")
    document.getElementById("content").classList.remove("hidden")
  }

  showError(message) {
    console.error(message)
    // Implementar notificação de erro se necessário
  }
}

// Inicializar dashboard
const dashboard = new TicketDashboard()
