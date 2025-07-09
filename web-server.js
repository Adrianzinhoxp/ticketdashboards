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
    // CORS configurado para Render
    this.app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )

    this.app.use(express.json({ limit: "10mb" }))
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }))
    this.app.use(express.static(path.join(__dirname, "public")))

    // Middleware de log para debug
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
      next()
    })
  }

  setupRoutes() {
    // Health check para Render
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      })
    })

    // API Routes
    this.app.get("/api/tickets", (req, res) => {
      try {
        const tickets = database.getClosedTickets()
        res.json({
          success: true,
          data: tickets,
          count: tickets.length,
        })
      } catch (error) {
        console.error("Erro ao buscar tickets:", error)
        res.status(500).json({
          success: false,
          error: "Erro interno do servidor",
          message: error.message,
        })
      }
    })

    this.app.get("/api/tickets/:id", (req, res) => {
      try {
        const ticket = database.getTicketById(req.params.id)
        if (!ticket) {
          return res.status(404).json({
            success: false,
            error: "Ticket não encontrado",
          })
        }
        res.json({
          success: true,
          data: ticket,
        })
      } catch (error) {
        console.error("Erro ao buscar ticket:", error)
        res.status(500).json({
          success: false,
          error: "Erro interno do servidor",
          message: error.message,
        })
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
          lastUpdated: new Date().toISOString(),
        }

        res.json({
          success: true,
          data: stats,
        })
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error)
        res.status(500).json({
          success: false,
          error: "Erro interno do servidor",
          message: error.message,
        })
      }
    })

    // Dashboard Route
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"))
    })

    // API Info
    this.app.get("/api", (req, res) => {
      res.json({
        name: "Discord Ticket Bot API",
        version: "1.0.0",
        endpoints: {
          tickets: "/api/tickets",
          stats: "/api/stats",
          health: "/health",
        },
        documentation: "https://github.com/seu-usuario/ticket-bot",
      })
    })

    // 404 Handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: "Rota não encontrada",
        path: req.path,
      })
    })

    // Error Handler
    this.app.use((error, req, res, next) => {
      console.error("Erro no servidor:", error)
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: process.env.NODE_ENV === "development" ? error.message : "Internal Server Error",
      })
    })
  }

  start() {
    const server = this.app.listen(this.port, "0.0.0.0", () => {
      console.log(`🌐 Servidor web iniciado!`)
      console.log(`📍 Local: http://localhost:${this.port}`)

      if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`🌍 Público: ${process.env.RENDER_EXTERNAL_URL}`)
      }

      console.log(`📊 API: http://localhost:${this.port}/api`)
      console.log(`❤️ Health: http://localhost:${this.port}/health`)
    })

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("🔄 Encerrando servidor web...")
      server.close(() => {
        console.log("✅ Servidor web encerrado")
      })
    })

    return server
  }
}

module.exports = WebServer
