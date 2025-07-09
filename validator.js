// Utilitário para validar configurações
class ConfigValidator {
  static validateToken(token) {
    return token && token.length > 50 && token.includes(".")
  }

  static validateSnowflake(id) {
    return /^\d{17,19}$/.test(id)
  }

  static validateUrl(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  static validateConfig(config) {
    const errors = []

    if (!this.validateToken(config.TOKEN)) {
      errors.push("Token do bot inválido")
    }

    if (!this.validateSnowflake(config.GUILD_ID)) {
      errors.push("ID do servidor inválido")
    }

    if (!this.validateSnowflake(config.TICKET_CATEGORY_ID)) {
      errors.push("ID da categoria inválido")
    }

    if (!this.validateSnowflake(config.STAFF_ROLE_ID)) {
      errors.push("ID do cargo staff inválido")
    }

    if (
      config.PANEL_IMAGE_URL &&
      !config.PANEL_IMAGE_URL.startsWith("/placeholder") &&
      !this.validateUrl(config.PANEL_IMAGE_URL)
    ) {
      errors.push("URL da imagem inválida")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

module.exports = ConfigValidator
