import { inicializarCabecera, inicializarPiePagina } from '../comun/componentes.js';
import { estadoSesion } from '../comun/estado-sesion.js';

document.addEventListener('DOMContentLoaded', () => {
  inicializarCabecera('home', '../..');
  inicializarPiePagina('../..');

  const btnHero = document.getElementById('hero-btn-empezar');
  if (btnHero && estadoSesion.estaAutenticado()) {
    btnHero.href = '../../html/servidores/panel.html';
    btnHero.innerHTML = `
      <span>Ir a Mis Servidores</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    `;
  }
});
