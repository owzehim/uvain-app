export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development'

export const isProductionEnv = APP_ENV === 'production'
