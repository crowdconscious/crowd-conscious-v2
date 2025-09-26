// Simple internationalization utility

interface Translations {
  [key: string]: {
    [language: string]: string
  }
}

const translations: Translations = {
  // Common UI elements
  'dashboard': {
    'en': 'Dashboard',
    'es': 'Panel de Control'
  },
  'communities': {
    'en': 'Communities',
    'es': 'Comunidades'
  },
  'profile': {
    'en': 'Profile',
    'es': 'Perfil'
  },
  'settings': {
    'en': 'Settings',
    'es': 'Configuración'
  },
  'welcome': {
    'en': 'Welcome',
    'es': 'Bienvenido'
  },
  'sign_out': {
    'en': 'Sign Out',
    'es': 'Cerrar Sesión'
  },
  'search': {
    'en': 'Search...',
    'es': 'Buscar...'
  },
  'create_community': {
    'en': 'Create Community',
    'es': 'Crear Comunidad'
  },
  'join_community': {
    'en': 'Join Community',
    'es': 'Unirse a Comunidad'
  },
  'members': {
    'en': 'members',
    'es': 'miembros'
  },
  'votes_cast': {
    'en': 'Votes Cast',
    'es': 'Votos Emitidos'
  },
  'content_created': {
    'en': 'Content Created',
    'es': 'Contenido Creado'
  },
  'level': {
    'en': 'Level',
    'es': 'Nivel'
  },
  'total_xp': {
    'en': 'Total XP',
    'es': 'XP Total'
  },
  'day_streak': {
    'en': 'Day Streak',
    'es': 'Racha de Días'
  },
  'achievements': {
    'en': 'Achievements',
    'es': 'Logros'
  },
  'save_changes': {
    'en': 'Save Changes',
    'es': 'Guardar Cambios'
  },
  'cancel': {
    'en': 'Cancel',
    'es': 'Cancelar'
  },
  'loading': {
    'en': 'Loading...',
    'es': 'Cargando...'
  },
  'error': {
    'en': 'Error',
    'es': 'Error'
  },
  'success': {
    'en': 'Success',
    'es': 'Éxito'
  }
}

export const t = (key: string, language: string = 'en'): string => {
  return translations[key]?.[language] || translations[key]?.['en'] || key
}

// Currency formatting
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  } catch (error) {
    // Fallback for unsupported currencies
    const symbol = currency === 'MXN' ? '$' : '$'
    return `${symbol}${amount.toLocaleString()}`
  }
}

// Date formatting based on language
export const formatDate = (date: string | Date, language: string = 'en'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  try {
    const locale = language === 'es' ? 'es-ES' : 'en-US'
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    return dateObj.toLocaleDateString()
  }
}

// Number formatting
export const formatNumber = (num: number, language: string = 'en'): string => {
  const locale = language === 'es' ? 'es-ES' : 'en-US'
  return num.toLocaleString(locale)
}

// Get user's preferred language from localStorage or browser
export const getUserLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language')
    if (saved && ['en', 'es'].includes(saved)) {
      return saved
    }
    
    // Fallback to browser language
    const browserLang = navigator.language.split('-')[0]
    return ['en', 'es'].includes(browserLang) ? browserLang : 'en'
  }
  return 'en'
}

// Get user's preferred currency from localStorage
export const getUserCurrency = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('currency')
    if (saved && ['USD', 'MXN'].includes(saved)) {
      return saved
    }
  }
  return 'USD'
}
