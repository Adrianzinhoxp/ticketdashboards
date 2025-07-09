// Utilitários para o sistema de tickets
const { EmbedBuilder } = require("discord.js")

class TicketUtils {
  static createTicketEmbed(type, user, config) {
    return new EmbedBuilder()
      .setTitle(config.titleMessage)
      .setDescription(`Olá ${user}! 👋

Seja muito bem-vindo(a) ao seu ticket! Nossa equipe estará aqui para te ajudar da melhor forma possível.

**Por favor, descreva detalhadamente sua solicitação para que possamos te atender rapidamente.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📋 Informações do Ticket:**
• **Usuário:** ${user}
• **Tipo:** ${config.title}
• **Criado em:** <t:${Math.floor(Date.now() / 1000)}:F>

**📝 Instruções:**
• Descreva sua solicitação com detalhes
• Aguarde o atendimento da nossa equipe
• Para fechar o ticket, use o botão abaixo`)
      .setColor(config.color)
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: "Sistema de Tickets • Aguardando atendimento" })
      .setTimestamp()
  }

  static createConfigEmbed(channel) {
    return new EmbedBuilder()
      .setTitle("✅ Canal de Tickets Configurado")
      .setDescription(`O canal ${channel} foi configurado como canal de tickets.
      
**Próximos passos:**
• Vá até ${channel}
• Use o comando \`/ticket-panel\` para criar o painel
• Os usuários poderão abrir tickets através do painel`)
      .setColor("#00ff00")
      .setFooter({ text: "Sistema de Tickets" })
      .setTimestamp()
  }

  static getTicketTypes() {
    return {
      corregedoria: {
        name: "⚠️-corregedoria",
        title: "⚠️ Corregedoria",
        titleMessage: "Ticket Criado - Corregedoria",
        description: "Ticket para questões disciplinares e correções",
        color: "#ff6b6b",
      },
      up_patente: {
        name: "🏆-up-patente",
        title: "🏆 Up de Patente",
        titleMessage: "Ticket Criado - Up de Patente",
        description: "Ticket para solicitações de promoção",
        color: "#ffd93d",
      },
      duvidas: {
        name: "❓-duvidas",
        title: "❓ Dúvidas",
        titleMessage: "Ticket Criado - Dúvidas",
        description: "Ticket para esclarecimentos gerais",
        color: "#6bcf7f",
      },
    }
  }
}

module.exports = TicketUtils
