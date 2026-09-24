import { inicializarCabecera, inicializarPiePagina } from '../comun/componentes.js';
import { api } from '../comun/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  inicializarCabecera('home', '../..');
  inicializarPiePagina('../..');

  try {
    const salud = await api.peticion('/salud').catch(() => null);
    if (salud && salud.nodo) {
      console.log(`[GaliGames] Conectado al nodo ${salud.nodo.dominio} (Docker: ${salud.nodo.dockerConectado})`);
    }
  } catch {
    // Si no está disponible aún el backend DuckDNS, la interfaz se mantiene limpia y operativa
  }
});
