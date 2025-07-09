const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js")

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

// Função auxiliar para responder interações
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

module.exports = {
  showRemoveMemberModal,
  handleRemoveMemberModal,
}
