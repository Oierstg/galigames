export const CONFIG_APP = {
  // URL por defecto del Backend Linux DuckDNS
  URL_API_PROD: 'https://galigamesbackend.duckdns.org/api',
  URL_API_LOCAL: 'http://localhost:3000/api',

  // Obtener URL activa (configurable mediante localStorage si se desea probar en local)
  obtenerUrlApi() {
    const seleccion = localStorage.getItem('galigames_url_api');
    if (seleccion) return seleccion;

    // Si estamos en localhost usando navegador, probar localhost primero
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return this.URL_API_LOCAL;
    }

    return this.URL_API_PROD;
  },

  PRECIO_MENSUAL_SERVIDOR: 6.00,
  MONEDA: 'EUR',
  SIMBOLO_MONEDA: '€',
  NOMBRE_PLATAFORMA: 'GaliGames'
};
