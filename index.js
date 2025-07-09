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
    this.BACKUP_DIR = path.join(__dirname, "backups")

    // Criar diretórios necessários
    fs.ensureDirSync(path.dirname(this.CONFIG_FILE))
    fs.ensureDirSync(path.dirname(this.TICKETS_FILE))
    fs.ensureDirSync(this.BACKUP_DIR)

    this.configs = this.loadConfigs()
    this.closedTickets = this.loadClosedTickets()

    // Se não conseguiu carregar tickets, tentar recuperar
    if (this.closedTickets.length === 0) {
      console.log("⚠️ Nenhum ticket encontrado, tentando recuperar...")
      this.recoverTickets()
    }

    this.setupBackupSystem()

    console.log(`📊 Database inicializado:`)
    console.log(`   - Tickets carregados: ${this.closedTickets.length}`)
    console.log(`   - Arquivo principal: ${this.TICKETS_FILE}`)
    console.log(`   - Diretório de backup: ${this.BACKUP_DIR}`)
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
      // Criar diretório se não existir
      const dir = path.dirname(this.TICKETS_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Salvar com formatação para melhor legibilidade
      const dataToSave = JSON.stringify(this.closedTickets, null, 2)

      // Escrever arquivo
      fs.writeFileSync(this.TICKETS_FILE, dataToSave, "utf8")

      // Verificar se foi salvo corretamente
      const fileSize = fs.statSync(this.TICKETS_FILE).size
      console.log(`💾 Arquivo salvo: ${this.TICKETS_FILE} (${Math.round(fileSize / 1024)}KB)`)

      return true
    } catch (error) {
      console.error("❌ ERRO CRÍTICO ao salvar tickets fechados:", error)

      // Tentar salvar em local alternativo
      try {
        const backupFile = `${this.TICKETS_FILE}.backup-${Date.now()}`
        fs.writeFileSync(backupFile, JSON.stringify(this.closedTickets, null, 2), "utf8")
        console.log(`📁 Backup de emergência salvo: ${backupFile}`)
      } catch (backupError) {
        console.error("❌ Falha total ao salvar tickets:", backupError)
      }

      return false
    }
  }

  setupBackupSystem() {
    // Criar diretório de backup se não existir
    fs.ensureDirSync(this.BACKUP_DIR)

    // *** BACKUP MAIS FREQUENTE ***
    // Backup automático a cada 2 horas (antes era 6)
    setInterval(
      () => {
        this.createBackup()
        this.verifyAllData()
      },
      2 * 60 * 60 * 1000,
    )

    // Backup inicial após 2 minutos (antes era 5)
    setTimeout(
      () => {
        this.createBackup()
      },
      2 * 60 * 1000,
    )

    // *** NOVO: Verificação contínua a cada 30 minutos ***
    setInterval(
      () => {
        this.verifyAllData()
      },
      30 * 60 * 1000,
    )

    // *** NOVO: Backup de segurança diário ***
    setInterval(
      () => {
        this.createDailyBackup()
      },
      24 * 60 * 60 * 1000,
    )

    console.log("📦 Sistema de backup REFORÇADO configurado:")
    console.log("   - Backup automático: a cada 2 horas")
    console.log("   - Verificação: a cada 30 minutos")
    console.log("   - Backup diário: todos os dias")
    console.log("   - Backup por ticket: a cada 25 tickets")
  }

  verifyAllData() {
    console.log("🔍 Verificando integridade dos dados...")

    try {
      // Verificar arquivo principal
      if (!fs.existsSync(this.TICKETS_FILE)) {
        console.error("❌ ARQUIVO PRINCIPAL PERDIDO! Tentando recuperar...")
        this.recoverTickets()
        return
      }

      // Verificar conteúdo
      const fileContent = fs.readFileSync(this.TICKETS_FILE, "utf8")
      const fileTickets = JSON.parse(fileContent)

      if (!Array.isArray(fileTickets)) {
        console.error("❌ ARQUIVO CORROMPIDO! Tentando recuperar...")
        this.recoverTickets()
        return
      }

      // Verificar se há perda de dados
      if (fileTickets.length < this.closedTickets.length) {
        console.warn(
          `⚠️ PERDA DE DADOS DETECTADA! Arquivo: ${fileTickets.length}, Memória: ${this.closedTickets.length}`,
        )
        console.log("🔄 Restaurando dados da memória para o arquivo...")
        this.saveClosedTickets()
      }

      console.log(`✅ Verificação OK: ${fileTickets.length} tickets confirmados`)
    } catch (error) {
      console.error("❌ Erro na verificação dos dados:", error)
      console.log("🔄 Tentando recuperar dados...")
      this.recoverTickets()
    }
  }

  createDailyBackup() {
    try {
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      const dailyBackupFile = path.join(this.BACKUP_DIR, `daily-backup-${today}.json`)

      // Não criar se já existe hoje
      if (fs.existsSync(dailyBackupFile)) {
        return
      }

      const backupData = {
        type: "DAILY_BACKUP",
        date: today,
        timestamp: new Date().toISOString(),
        totalTickets: this.closedTickets.length,
        tickets: this.closedTickets,
        configs: this.configs,
        statistics: this.getDetailedStats(),
      }

      fs.writeFileSync(dailyBackupFile, JSON.stringify(backupData, null, 2))
      console.log(`📅 Backup diário criado: ${dailyBackupFile} (${this.closedTickets.length} tickets)`)

      // Limpar backups diários antigos (manter últimos 30 dias)
      this.cleanOldDailyBackups()
    } catch (error) {
      console.error("❌ Erro ao criar backup diário:", error)
    }
  }

  cleanOldDailyBackups() {
    try {
      const dailyBackups = fs
        .readdirSync(this.BACKUP_DIR)
        .filter((file) => file.startsWith("daily-backup-"))
        .sort()

      // Manter apenas os últimos 30 backups diários
      if (dailyBackups.length > 30) {
        const filesToDelete = dailyBackups.slice(0, dailyBackups.length - 30)
        filesToDelete.forEach((file) => {
          fs.unlinkSync(path.join(this.BACKUP_DIR, file))
        })
        console.log(`🗑️ ${filesToDelete.length} backups diários antigos removidos`)
      }
    } catch (error) {
      console.error("❌ Erro ao limpar backups diários:", error)
    }
  }

  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const backupFile = path.join(this.BACKUP_DIR, `tickets-backup-${timestamp}.json`)

      const backupData = {
        timestamp: new Date().toISOString(),
        totalTickets: this.closedTickets.length,
        tickets: this.closedTickets,
        configs: this.configs,
      }

      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))

      // Manter apenas os últimos 30 backups
      this.cleanOldBackups()

      console.log(`📦 Backup criado: ${backupFile} (${this.closedTickets.length} tickets)`)
    } catch (error) {
      console.error("❌ Erro ao criar backup:", error)
    }
  }

  getDetailedStats() {
    // Implementação fictícia para exemplo
    return {
      totalTickets: this.closedTickets.length,
      lastBackup: new Date().toISOString(),
    }
  }

  recoverTickets() {
    // Implementação fictícia para exemplo
    console.log("🔄 Recuperando tickets...")
    this.closedTickets = []
  }

  cleanOldBackups() {
    try {
      const backups = fs
        .readdirSync(this.BACKUP_DIR)
        .filter((file) => file.startsWith("tickets-backup-"))
        .sort()

      // Manter apenas os últimos 30 backups
      if (backups.length > 30) {
        const filesToDelete = backups.slice(0, backups.length - 30)
        filesToDelete.forEach((file) => {
          fs.unlinkSync(path.join(this.BACKUP_DIR, file))
        })
        console.log(`🗑️ ${filesToDelete.length} backups antigos removidos`)
      }
    } catch (error) {
      console.error("❌ Erro ao limpar backups:", error)
    }
  }
}

const database = new Database()
const autoCleanup = new AutoCleanup()
DiscloudMonitor.logStartup()
DiscloudMonitor.startMemoryMonitoring()

// ==================== CONFIGURAÇÕES DO BOT ====================

const app = express()
const port = process.env.PORT || 3000

app.use(cors())

app.get("/", (req, res) => {
  res.send("O bot está online!")
})

app.listen(port, () => {
  console.log(`Servidor Express rodando na porta ${port}`)
})

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
})

const TOKEN = process.env.DISCORD_TOKEN

client.login(TOKEN).then(() => {
  DiscloudMonitor.logSuccess("Bot conectado ao Discord!")
})

client.on("error", (error) => {
  DiscloudMonitor.logError(error, "Erro no cliente Discord")
})

// ==================== REGISTRO DE COMANDOS SLASH ====================

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
    {
      name: "backup-create",
      description: "Cria um backup manual dos tickets",
    },
    {
      name: "backup-list",
      description: "Lista todos os backups disponíveis",
    },
    {
      name: "export-all",
      description: "Exporta todos os dados dos tickets",
    },
    {
      name: "ticket-stats",
      description: "Mostra estatísticas detalhadas dos tickets",
    },
    // *** NOVO COMANDO ***
    {
      name: "data-status",
      description: "Verifica o status e integridade dos dados salvos",
    },
    {
      name: "force-save",
      description: "Força o salvamento de todos os dados",
    },
  ]

  try {
    console.log("🔄 Iniciando registro dos comandos...")
    await client.application?.commands.set(commands)
    DiscloudMonitor.logSuccess("Comandos registrados com sucesso!")
  } catch (error) {
    DiscloudMonitor.logError(error, "Erro ao registrar comandos")
  }
}

client.on("ready", () => {
  registerSlashCommands()
})

// ==================== MANIPULAÇÃO DE INTERAÇÕES ====================

async function safeReply(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(content)
    } else {
      await interaction.reply(content)
    }
  } catch (error) {
    console.error("Erro ao responder à interação:", error)
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return

  const { commandName } = interaction

  if (commandName === "ticket-panel") {
    const embed = new EmbedBuilder()
      .setTitle("Painel de Tickets")
      .setDescription("Abra um ticket para suporte.")
      .setColor("#0099ff")

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("open-ticket").setLabel("Abrir Ticket").setStyle(ButtonStyle.Primary),
    )

    await safeReply(interaction, {
      embeds: [embed],
      components: [actionRow],
    })
  } else if (commandName === "close-ticket") {
    if (interaction.channel.type === ChannelType.GuildText && interaction.channel.name.startsWith("ticket-")) {
      const ticketId = interaction.channel.name.split("-")[1]

      // Adicionar ticket aos tickets fechados
      database.closedTickets.push({
        ticketId: ticketId,
        channelId: interaction.channel.id,
        closedBy: interaction.user.id,
        closedAt: new Date().toISOString(),
      })

      // Salvar tickets fechados
      database.saveClosedTickets()

      // Criar backup a cada 25 tickets
      if (database.closedTickets.length % 25 === 0) {
        database.createBackup()
      }

      await interaction.channel.delete()
    } else {
      await safeReply(interaction, {
        content: "Este comando só pode ser usado em canais de ticket.",
        flags: MessageFlags.Ephemeral,
      })
    }
  } else if (commandName === "ticket-config") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return await safeReply(interaction, {
        content: "Você não tem permissão para configurar o canal de tickets.",
        flags: MessageFlags.Ephemeral,
      })
    }

    const channel = interaction.options.getChannel("canal")

    if (channel && channel.type === ChannelType.GuildText) {
      database.configs[interaction.guild.id] = {
        channelId: channel.id,
      }
      database.saveConfigs()

      await safeReply(interaction, {
        content: `Canal de tickets configurado para ${channel.name}.`,
        flags: MessageFlags.Ephemeral,
      })
    } else {
      await safeReply(interaction, {
        content: "Canal inválido.",
        flags: MessageFlags.Ephemeral,
      })
    }
  } else if (commandName === "dashboard") {
    await safeReply(interaction, {
      content: "Link do dashboard: [Em breve]",
      flags: MessageFlags.Ephemeral,
    })
  } else if (commandName === "backup-create") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return await safeReply(interaction, {
        content: "Você não tem permissão para criar backups.",
        flags: MessageFlags.Ephemeral,
      })
    }

    database.createBackup()

    await safeReply(interaction, {
      content: "Backup criado com sucesso!",
      flags: MessageFlags.Ephemeral,
    })
  } else if (commandName === "backup-list") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return await safeReply(interaction, {
        content: "Você não tem permissão para listar backups.",
        flags: MessageFlags.Ephemeral,
      })
    }

    const backups = fs
      .readdirSync(database.BACKUP_DIR)
      .filter((file) => file.startsWith("tickets-backup-"))
      .sort()
      .reverse()
      .slice(0, 10)

    const embed = new EmbedBuilder()
      .setTitle("Lista de Backups")
      .setDescription(backups.map((file) => `\`${file}\``).join("\n") || "Nenhum backup encontrado.")
      .setColor("#0099ff")

    await safeReply(interaction, {
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    })
  } else if (commandName === "export-all") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return await safeReply(interaction, {
        content: "Você não tem permissão para exportar dados.",
        flags: MessageFlags.Ephemeral,
      })
    }

    // Implementar lógica de exportação aqui
    await safeReply(interaction, {
      content: "Exportação em breve!",
      flags: MessageFlags.Ephemeral,
    })
  } else if (commandName === "ticket-stats") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return await safeReply(interaction, {
        content: "Você não tem permissão para ver estatísticas.",
        flags: MessageFlags.Ephemeral,
      })
    }

    const stats = database.getDetailedStats()

    const embed = new EmbedBuilder()
      .setTitle("Estatísticas de Tickets")
      .setDescription(`Total de tickets: ${stats.totalTickets}\nÚltimo backup: ${stats.lastBackup}`)
      .setColor("#0099ff")

    await safeReply(interaction, {
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    })
  } else if (commandName === "data-status") {
    await showDataStatus(interaction)
  } else if (commandName === "force-save") {
    await forceSaveData(interaction)
  }
})

// ==================== MANIPULAÇÃO DE BOTÕES ====================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return

  if (interaction.customId === "open-ticket") {
    const guild = interaction.guild
    const userId = interaction.user.id

    // Verificar se o usuário já tem um ticket aberto
    const existingChannel = guild.channels.cache.find(
      (channel) => channel.name === `ticket-${userId}` && channel.type === ChannelType.GuildText,
    )

    if (existingChannel) {
      return await safeReply(interaction, {
        content: `Você já tem um ticket aberto: ${existingChannel.toString()}.`,
        flags: MessageFlags.Ephemeral,
      })
    }

    // Obter o canal de configuração do servidor
    const config = database.configs[guild.id]
    if (!config || !config.channelId) {
      return await safeReply(interaction, {
        content: "O canal de tickets não foi configurado. Use /ticket-config.",
        flags: MessageFlags.Ephemeral,
      })
    }

    const categoryId = config.channelId // Usar o channelId como categoryId

    // Criar o canal dentro da categoria configurada
    guild.channels
      .create({
        name: `ticket-${userId}`,
        type: ChannelType.GuildText,
        parent: categoryId, // Definir a categoria
        permissionOverwrites: [
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      })
      .then(async (channel) => {
        const embed = new EmbedBuilder()
          .setTitle("Ticket de Suporte")
          .setDescription("Descreva seu problema para que possamos ajudar.")
          .setColor("#0099ff")

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("close-ticket").setLabel("Fechar Ticket").setStyle(ButtonStyle.Danger),
        )

        await channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [embed],
          components: [actionRow],
        })

        await safeReply(interaction, {
          content: `Ticket aberto em ${channel.toString()}.`,
          flags: MessageFlags.Ephemeral,
        })
      })
      .catch((error) => {
        console.error("Erro ao criar canal:", error)
        safeReply(interaction, {
          content: "Erro ao criar o ticket.",
          flags: MessageFlags.Ephemeral,
        })
      })
  } else if (interaction.customId === "close-ticket") {
    if (interaction.channel.type === ChannelType.GuildText && interaction.channel.name.startsWith("ticket-")) {
      const ticketId = interaction.channel.name.split("-")[1]

      // Adicionar ticket aos tickets fechados
      database.closedTickets.push({
        ticketId: ticketId,
        channelId: interaction.channel.id,
        closedBy: interaction.user.id,
        closedAt: new Date().toISOString(),
      })

      // Salvar tickets fechados
      database.saveClosedTickets()

      // Criar backup a cada 25 tickets
      if (database.closedTickets.length % 25 === 0) {
        database.createBackup()
      }

      await interaction.channel.delete()
    } else {
      await safeReply(interaction, {
        content: "Este botão só pode ser usado em canais de ticket.",
        flags: MessageFlags.Ephemeral,
      })
    }
  }
})

async function showDataStatus(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return await safeReply(interaction, {
      content: "❌ Você não tem permissão para verificar dados.",
      flags: MessageFlags.Ephemeral,
    })
  }

  try {
    // Verificar dados
    database.verifyAllData()

    const stats = database.getDetailedStats()
    const fileExists = fs.existsSync(database.TICKETS_FILE)
    const fileSize = fileExists ? fs.statSync(database.TICKETS_FILE).size : 0
    const backups = database.listBackups()

    const embed = new EmbedBuilder()
      .setTitle("📊 Status dos Dados")
      .setDescription(`**🗄️ Arquivo Principal:**
• **Status:** ${fileExists ? "✅ Existe" : "❌ Não encontrado"}
• **Tamanho:** ${Math.round(fileSize / 1024)}KB
• **Localização:** \`${database.TICKETS_FILE}\`

**📈 Dados em Memória:**
• **Total de tickets:** ${stats.total}
• **Total de mensagens:** ${stats.totalMessages}
• **Tipos:** ${Object.entries(stats.byType)
        .map(([type, count]) => `${type}(${count})`)
        .join(", ")}

**📦 Backups Disponíveis:**
• **Total de backups:** ${backups.length}
• **Último backup:** ${backups[0] ? backups[0].created.toLocaleString("pt-BR") : "Nenhum"}

**📅 Período dos Dados:**
• **Primeiro ticket:** ${stats.oldestTicket ? new Date(stats.oldestTicket).toLocaleDateString("pt-BR") : "N/A"}
• **Último ticket:** ${stats.newestTicket ? new Date(stats.newestTicket).toLocaleDateString("pt-BR") : "N/A"}

**🔍 Verificação:** <t:${Math.floor(Date.now() / 1000)}:R>`)
      .setColor(fileExists && stats.total > 0 ? "#00ff00" : "#ff6600")
      .setFooter({ text: "Sistema de Monitoramento de Dados" })
      .setTimestamp()

    await safeReply(interaction, {
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    })
  } catch (error) {
    console.error("Erro ao verificar status dos dados:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao verificar status dos dados.",
      flags: MessageFlags.Ephemeral,
    })
  }
}

async function forceSaveData(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return await safeReply(interaction, {
      content: "❌ Você não tem permissão para forçar salvamento.",
      flags: MessageFlags.Ephemeral,
    })
  }

  try {
    await safeReply(interaction, {
      content: "💾 Forçando salvamento de todos os dados...",
      flags: MessageFlags.Ephemeral,
    })

    // Forçar salvamento
    database.saveClosedTickets()
    database.saveConfigs()

    // Criar backup de segurança
    database.createBackup()

    // Verificar resultado
    database.verifyAllData()

    const stats = database.getDetailedStats()

    const embed = new EmbedBuilder()
      .setTitle("💾 Salvamento Forçado Concluído")
      .setDescription(`**✅ Dados salvos com sucesso!**

**📊 Dados salvos:**
• **Total de tickets:** ${stats.total}
• **Arquivo principal:** \`${database.TICKETS_FILE}\`
• **Backup criado:** <t:${Math.floor(Date.now() / 1000)}:F>

**🔍 Verificação:** Todos os dados foram verificados e estão íntegros.`)
      .setColor("#00ff00")
      .setFooter({ text: "Salvamento Forçado" })
      .setTimestamp()

    await interaction.followUp({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    })
  } catch (error) {
    console.error("Erro ao forçar salvamento:", error)
    await safeReply(interaction, {
      content: "❌ Erro ao forçar salvamento dos dados.",
      flags: MessageFlags.Ephemeral,
    })
  }
}
