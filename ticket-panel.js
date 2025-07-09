// Comando separado para o painel de tickets (estrutura modular)
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js")

module.exports = {
  name: "ticket-panel",
  description: "Cria o painel principal de tickets",

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🎫 SISTEMA DE TICKETS")
      .setDescription(`**Bem-vindo ao nosso sistema de atendimento!**

Para abrir um ticket, selecione o tipo de atendimento que você precisa no menu abaixo:

**⚠️ Corregedoria** - Questões disciplinares e correções
**🏆 Up de Patente** - Solicitações de promoção  
**❓ Dúvidas** - Esclarecimentos gerais

**Clique no menu abaixo para selecionar uma opção:**`)
      .setColor("#0099ff")
      .setImage("/placeholder.svg?height=200&width=400")
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

    await interaction.reply({
      embeds: [embed],
      components: [row],
    })
  },
}
