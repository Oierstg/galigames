export const CONFIG_APP = {
  // URL por defecto del Backend Linux DuckDNS
  URL_API_PROD: 'https://galigamesbackend.duckdns.org/api',
  URL_API_LOCAL: 'http://localhost:3000/api',

  // Obtener URL activa (apunta por defecto al backend en producción)
  obtenerUrlApi() {
    const seleccion = localStorage.getItem('galigames_url_api');
    if (seleccion) return seleccion;
    return this.URL_API_PROD;
  },

  // Google OAuth Client ID para Google Identity Services
  GOOGLE_CLIENT_ID: '1082531398858-galigames.apps.googleusercontent.com',
  obtenerGoogleClientId() {
    return localStorage.getItem('galigames_google_client_id') || this.GOOGLE_CLIENT_ID;
  },

  PRECIO_PLAN_4GB: 7.00,
  PRECIO_PLAN_6GB: 9.00,
  MONEDA: 'EUR',
  SIMBOLO_MONEDA: '€',
  NOMBRE_PLATAFORMA: 'GaliGames'
};
