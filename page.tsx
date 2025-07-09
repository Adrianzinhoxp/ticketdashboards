"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  Clock,
  MessageSquare,
  Search,
  Filter,
  User,
  AlertTriangle,
  Trophy,
  HelpCircle,
  X,
} from "lucide-react"

// Dados simulados dos tickets fechados
const mockTickets = [
  {
    id: "TKT-001",
    type: "corregedoria",
    title: "Questão Disciplinar - Comportamento Inadequado",
    user: {
      id: "123456789",
      username: "usuario1",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    staff: {
      id: "987654321",
      username: "moderador1",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    createdAt: new Date("2024-01-15T10:30:00"),
    closedAt: new Date("2024-01-15T14:45:00"),
    reason: "Questão resolvida após esclarecimentos",
    status: "resolved",
    messages: [
      {
        id: "1",
        author: "usuario1",
        content: "Olá, gostaria de reportar um comportamento inadequado de outro membro.",
        timestamp: new Date("2024-01-15T10:30:00"),
        isStaff: false,
      },
      {
        id: "2",
        author: "moderador1",
        content: "Olá! Obrigado por entrar em contato. Pode me fornecer mais detalhes sobre o ocorrido?",
        timestamp: new Date("2024-01-15T10:35:00"),
        isStaff: true,
      },
      {
        id: "3",
        author: "usuario1",
        content: "O usuário estava sendo desrespeitoso no chat geral, usando linguagem ofensiva.",
        timestamp: new Date("2024-01-15T10:40:00"),
        isStaff: false,
      },
      {
        id: "4",
        author: "moderador1",
        content: "Entendi. Vou verificar os logs e tomar as medidas necessárias. Obrigado pelo report!",
        timestamp: new Date("2024-01-15T14:40:00"),
        isStaff: true,
      },
    ],
  },
  {
    id: "TKT-002",
    type: "up_patente",
    title: "Solicitação de Promoção - Cabo para Sargento",
    user: {
      id: "234567890",
      username: "soldado_elite",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    staff: {
      id: "876543210",
      username: "comandante1",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    createdAt: new Date("2024-01-14T09:15:00"),
    closedAt: new Date("2024-01-14T16:20:00"),
    reason: "Promoção aprovada após análise",
    status: "approved",
    messages: [
      {
        id: "1",
        author: "soldado_elite",
        content: "Boa tarde! Gostaria de solicitar minha promoção para Sargento.",
        timestamp: new Date("2024-01-14T09:15:00"),
        isStaff: false,
      },
      {
        id: "2",
        author: "comandante1",
        content: "Olá! Vou analisar seu histórico e atividade no servidor.",
        timestamp: new Date("2024-01-14T09:20:00"),
        isStaff: true,
      },
      {
        id: "3",
        author: "comandante1",
        content: "Após análise, sua promoção foi aprovada! Parabéns, Sargento!",
        timestamp: new Date("2024-01-14T16:15:00"),
        isStaff: true,
      },
    ],
  },
  {
    id: "TKT-003",
    type: "duvidas",
    title: "Dúvidas sobre Regras do Servidor",
    user: {
      id: "345678901",
      username: "novato123",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    staff: {
      id: "765432109",
      username: "helper1",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    createdAt: new Date("2024-01-13T14:20:00"),
    closedAt: new Date("2024-01-13T15:10:00"),
    reason: "Dúvidas esclarecidas",
    status: "resolved",
    messages: [
      {
        id: "1",
        author: "novato123",
        content: "Olá! Sou novo no servidor e tenho algumas dúvidas sobre as regras.",
        timestamp: new Date("2024-01-13T14:20:00"),
        isStaff: false,
      },
      {
        id: "2",
        author: "helper1",
        content: "Seja bem-vindo! Ficarei feliz em esclarecer suas dúvidas. O que gostaria de saber?",
        timestamp: new Date("2024-01-13T14:25:00"),
        isStaff: true,
      },
      {
        id: "3",
        author: "novato123",
        content: "Posso usar emojis personalizados de outros servidores aqui?",
        timestamp: new Date("2024-01-13T14:30:00"),
        isStaff: false,
      },
      {
        id: "4",
        author: "helper1",
        content: "Sim, pode usar emojis externos, mas com moderação. Evite spam de emojis.",
        timestamp: new Date("2024-01-13T15:05:00"),
        isStaff: true,
      },
    ],
  },
]

const ticketTypeConfig = {
  corregedoria: {
    label: "Corregedoria",
    icon: AlertTriangle,
    color: "bg-red-500",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
  up_patente: {
    label: "Up de Patente",
    icon: Trophy,
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
  },
  duvidas: {
    label: "Dúvidas",
    icon: HelpCircle,
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
}

const statusConfig = {
  resolved: { label: "Resolvido", color: "bg-green-500" },
  approved: { label: "Aprovado", color: "bg-blue-500" },
  rejected: { label: "Rejeitado", color: "bg-red-500" },
}

export default function TicketDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState(null)

  const filteredTickets = useMemo(() => {
    return mockTickets.filter((ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = typeFilter === "all" || ticket.type === typeFilter
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [searchTerm, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const total = mockTickets.length
    const byType = mockTickets.reduce((acc, ticket) => {
      acc[ticket.type] = (acc[ticket.type] || 0) + 1
      return acc
    }, {})
    const byStatus = mockTickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1
      return acc
    }, {})

    return { total, byType, byStatus }
  }, [])

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const formatDuration = (start, end) => {
    const diff = end.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Tickets</h1>
          <p className="text-gray-600">Visualize e gerencie todos os tickets fechados do seu servidor Discord</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Tickets fechados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Corregedoria</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.corregedoria || 0}</div>
              <p className="text-xs text-muted-foreground">Questões disciplinares</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promoções</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.up_patente || 0}</div>
              <p className="text-xs text-muted-foreground">Solicitações de up</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dúvidas</CardTitle>
              <HelpCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.duvidas || 0}</div>
              <p className="text-xs text-muted-foreground">Esclarecimentos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID, título ou usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Tipo de ticket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="corregedoria">Corregedoria</SelectItem>
                  <SelectItem value="up_patente">Up de Patente</SelectItem>
                  <SelectItem value="duvidas">Dúvidas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || typeFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setTypeFilter("all")
                    setStatusFilter("all")
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => {
            const typeConfig = ticketTypeConfig[ticket.type]
            const TypeIcon = typeConfig.icon
            const statusConfig_ = statusConfig[ticket.status]

            return (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
                          <TypeIcon className={`h-4 w-4 ${typeConfig.textColor}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{ticket.title}</h3>
                          <p className="text-sm text-muted-foreground">ID: {ticket.id}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{ticket.user.username}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(ticket.createdAt, ticket.closedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={`${typeConfig.color} text-white`}>{typeConfig.label}</Badge>
                      <Badge className={`${statusConfig_.color} text-white`}>{statusConfig_.label}</Badge>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Ver Transcript
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <TypeIcon className={`h-5 w-5 ${typeConfig.textColor}`} />
                              {ticket.title}
                            </DialogTitle>
                            <DialogDescription>
                              Ticket {ticket.id} • {ticket.user.username} • {formatDate(ticket.createdAt)}
                            </DialogDescription>
                          </DialogHeader>

                          <ScrollArea className="h-96 w-full border rounded-lg p-4">
                            <div className="space-y-4">
                              {ticket.messages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex gap-3 ${message.isStaff ? "flex-row-reverse" : ""}`}
                                >
                                  <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full ${
                                      message.isStaff ? "bg-blue-500" : "bg-gray-500"
                                    } flex items-center justify-center text-white text-sm font-medium`}
                                  >
                                    {message.author[0].toUpperCase()}
                                  </div>
                                  <div className={`flex-1 ${message.isStaff ? "text-right" : ""}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm">
                                        {message.author}
                                        {message.isStaff && (
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            Staff
                                          </Badge>
                                        )}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(message.timestamp)}
                                      </span>
                                    </div>
                                    <div
                                      className={`p-3 rounded-lg ${
                                        message.isStaff ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"
                                      }`}
                                    >
                                      {message.content}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>

                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>Fechado por: {ticket.staff.username}</span>
                              <span>Motivo: {ticket.reason}</span>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredTickets.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros ou termos de busca para encontrar tickets.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
