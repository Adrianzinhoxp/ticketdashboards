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

const DiscloudMonitor = require("./utils/discloud-monitor")
const AutoCleanup = require("./utils/cleanup")
const WebServer = require("./web-server")
const database = require("./database")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
})

// Configurações usando variáveis de ambiente (para Render)
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

// Armazenamento temporário de tickets
const activeTickets = new Map()

// Função auxiliar para encontrar ticket pelo canal
function findTicketByChannel(channelId) {
  for (const [userId, ticketData] of activeTickets.entries()) {
    if (ticketData.channelId === channelId) {
      return { userId, ticket: ticketData }
    }
  }
  return null
}

// Função auxiliar para responder interações com tratamento de erro
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

// Função para coletar mensagens do canal
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

// Funções para modal de remoção de membro
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

    // Remover permissões do canal
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

client.once("ready", () => {
  DiscloudMonitor.logStartup()
  console.log(`✅ Bot online como ${client.user.tag}!`)

  // URL do dashboard baseada no ambiente
  const dashboardUrl =
    process.env.RENDER_EXTERNAL_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${process.env.PORT || 3000}`

  console.log(`🌐 Dashboard URL: ${dashboardUrl}`)

  // Iniciar monitoramento de memória
  DiscloudMonitor.startMemoryMonitoring()

  // Iniciar sistema de limpeza
  new AutoCleanup()

  // Iniciar servidor web
  const webServer = new WebServer()
  webServer.start()

  // Registrar comandos slash
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

// Manipulador de comandos slash
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
      } else if (interaction.customId === "warn_member") {
        await warnMember(interaction)
      } else if (interaction.customId === "rename_ticket") {
        await renameTicket(interaction)
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "close_ticket_reason") {
        await handleCloseTicketModal(interaction)
      } else if (interaction.customId === "add_member_id") {
        await handleAddMemberModal(interaction)
      } else if (interaction.customId === "remove_member_id") {
        await handleRemoveMemberModal(interaction)
      } else if (interaction.customId === "rename_ticket_id") {
        await handleRenameTicketModal(interaction)
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
• 📊 Relatórios por tipo e status

**Como usar:**
1. Acesse o link acima
2. Visualize todos os tickets fechados
3. Use os filtros para encontrar tickets específicos
4. Clique em "Ver Transcript" para detalhes completos`)
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

    const warnButton = new ButtonBuilder()
      .setCustomId("warn_member")
      .setLabel("⚠️ Avisar Membro")
      .setStyle(ButtonStyle.Secondary)

    const buttonRow1 = new ActionRowBuilder().addComponents(closeButton, assumeButton, addMemberButton)

    const buttonRow2 = new ActionRowBuilder().addComponents(removeMemberButton, warnButton)

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

async function warnMember(interaction) {
  const ticketInfo = findTicketByChannel(interaction.channel.id)

  if (!ticketInfo) {
    return await safeReply(interaction, {
      content: "❌ Não foi possível encontrar o dono do ticket.",
      flags: MessageFlags.Ephemeral,
    })
  }

  const { userId: ticketUserId } = ticketInfo

  const embed = new EmbedBuilder()
    .setTitle("⚠️ Aviso ao Membro")
    .setDescription(`<@${ticketUserId}>, você tem um ticket em aberto que precisa de sua atenção.
    
**Por favor:**
• Responda às perguntas da equipe
• Forneça as informações solicitadas
• Mantenha-se ativo no ticket

**Lembre-se:** Tickets inativos podem ser fechados automaticamente.`)
    .setColor("#000000")
    .setTimestamp()

  await safeReply(interaction, {
    content: `<@${ticketUserId}>`,
    embeds: [embed],
  })
}

async function renameTicket(interaction) {
  try {
    const modal = new ModalBuilder().setCustomId("rename_ticket_id").setTitle("Renomear Ticket")

    const newTitleInput = new TextInputBuilder()
      .setCustomId("new_title")
      .setLabel("Novo título do ticket:")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Digite o novo título aqui...")
      .setRequired(true)
      .setMaxLength(100)

    const firstActionRow = new ActionRowBuilder().addComponents(newTitleInput)
    modal.addComponents(firstActionRow)

    await interaction.showModal(modal)
  } catch (error) {
    console.error("Erro ao mostrar modal de renomeação:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao abrir formulário. Tente novamente.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function handleRenameTicketModal(interaction) {
  const newTitle = interaction.fields.getTextInputValue("new_title")
  const ticketInfo = findTicketByChannel(interaction.channel.id)

  if (!ticketInfo) {
    return await safeReply(interaction, {
      content: "❌ Ticket não encontrado.",
      flags: MessageFlags.Ephemeral,
    })
  }

  const { ticket } = ticketInfo

  try {
    const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId)
    await ticketChannel.setName(newTitle)

    const embed = new EmbedBuilder()
      .setTitle("🏷️ Ticket Renomeado")
      .setDescription(`O ticket foi renomeado para **${newTitle}** por ${interaction.user}.`)
      .setColor("#000000")
      .setTimestamp()

    await safeReply(interaction, {
      embeds: [embed],
    })
  } catch (error) {
    console.error("Erro ao renomear ticket:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao renomear o ticket. Verifique se o bot tem as permissões necessárias.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

// Manipulador de erros
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

// Login do bot
client.login(CONFIG.TOKEN).catch((error) => {
  console.error("❌ Erro ao fazer login:")
  console.error("Verifique se o DISCORD_TOKEN está correto nas variáveis de ambiente")
  process.exit(1)
})
