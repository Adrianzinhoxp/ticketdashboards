const express = require("express")
const cors = require("cors")
const path = require("path")
const database = require("./database")

class WebServer {
  constructor() {
    this.app = express()
    this.port = process.env.PORT || 3000
    this.setupMiddleware()
    this.setupRoutes()
  }

  setupMiddleware() {
    this.app.use(cors())
    this.app.use(express.json())
    this.app.use(express.static(path.join(__dirname, "public")))
  }

  setupRoutes() {
    // API Routes
    this.app.get("/api/tickets", (req, res) => {
      try {
        const tickets = database.getClosedTickets()
        res.json(tickets)
      } catch (error) {
        console.error("Erro ao buscar tickets:", error)
        res.status(500).json({ error: "Erro interno do servidor" })
      }
    })

    this.app.get("/api/tickets/:id", (req, res) => {
      try {
        const ticket = database.getTicketById(req.params.id)
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
        const tickets = database.getClosedTickets()

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

    // Dashboard Route
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"))
    })

    // 404 Handler
    this.app.use((req, res) => {
      res.status(404).json({ error: "Rota não encontrada" })
    })
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🌐 Dashboard disponível em: http://localhost:${this.port}`)
      console.log(`📊 API disponível em: http://localhost:${this.port}/api/tickets`)
    })
  }
}

module.exports = WebServer
