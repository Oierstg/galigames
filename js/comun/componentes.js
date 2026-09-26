import { estadoSesion } from './estado-sesion.js';

// SVG Iconos vectoriales de trazo fino (sin emojis)
export const ICONOS = {
  servidor: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`,
  monedas: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>`,
  iniciar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  detener: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="5" y="5" rx="2"/></svg>`,
  reiniciar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
  consola: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`,
  basura: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  mas: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alerta: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`
};

export function mostrarNotificacion(mensaje, tipo = 'info') {
  let contenedor = document.getElementById('notificaciones-toast');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'notificaciones-toast';
    contenedor.className = 'notificaciones-contenedor';
    document.body.appendChild(contenedor);
  }

  const toast = document.createElement('div');
  toast.className = `notificacion-item notificacion-${tipo}`;

  const texto = document.createElement('span');
  texto.textContent = mensaje;
  toast.appendChild(texto);

  contenedor.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('notificacion-saliendo');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 4000);
}

export function inicializarCabecera(paginaActiva = '', prefijoRuta = '../..') {
  const headerElem = document.getElementById('cabecera-principal');
  if (!headerElem) return;

  const estaAutenticado = estadoSesion.estaAutenticado();
  const usuario = estadoSesion.obtenerUsuario();
  const saldo = estadoSesion.obtenerSaldo();

  headerElem.className = 'cabecera-global';
  headerElem.innerHTML = `
    <div class="contenedor cabecera-contenedor">
      <a href="${prefijoRuta}/html/inicio/home.html" class="cabecera-marca" aria-label="GaliGames Inicio">
        <span class="cabecera-logo-icono">${ICONOS.servidor}</span>
        <span>GaliGames</span>
      </a>

      <nav class="cabecera-nav" aria-label="Navegación principal">
        ${estaAutenticado ? `
          <a href="${prefijoRuta}/html/servidores/panel.html" class="cabecera-enlace ${paginaActiva === 'servidores' ? 'activo' : ''}">Mis Servidores</a>
          <a href="${prefijoRuta}/html/servidores/crear.html" class="cabecera-enlace ${paginaActiva === 'crear' ? 'activo' : ''}">Crear Servidor</a>
          <a href="${prefijoRuta}/html/billetera/saldo.html" class="cabecera-enlace ${paginaActiva === 'billetera' ? 'activo' : ''}">Billetera</a>
        ` : `
          <a href="${prefijoRuta}/html/inicio/home.html#inicio" class="cabecera-enlace">Inicio</a>
          <a href="${prefijoRuta}/html/inicio/home.html#juegos" class="cabecera-enlace">Juegos</a>
          <a href="${prefijoRuta}/html/inicio/home.html#precios" class="cabecera-enlace">Tarifas y Precios</a>
          <a href="${prefijoRuta}/html/inicio/home.html#ventajas" class="cabecera-enlace">Ventajas</a>
        `}
      </nav>

      <div class="cabecera-acciones">
        ${estaAutenticado ? `
          <a href="${prefijoRuta}/html/billetera/saldo.html" class="cabecera-saldo-pill" title="Gestionar saldo y recargas">
            ${ICONOS.monedas}
            <span id="cabecera-saldo-valor">${saldo.toFixed(2)} €</span>
          </a>
          <span class="cabecera-usuario-nombre" title="${usuario.nombre}">${usuario.nombre}</span>
          <button type="button" id="btn-cerrar-sesion" class="boton boton-fantasma" aria-label="Cerrar sesión">Salir</button>
        ` : `
          <a href="${prefijoRuta}/html/autenticacion/iniciar-sesion.html" class="boton boton-fantasma">Iniciar sesión</a>
          <a href="${prefijoRuta}/html/autenticacion/registro.html" class="boton boton-primario">Crear cuenta</a>
        `}
      </div>
    </div>
  `;

  const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
      estadoSesion.cerrarSesion();
      window.location.href = `${prefijoRuta}/html/inicio/home.html`;
    });
  }

  // Escuchar actualizaciones de saldo reactivas
  window.addEventListener('galigames:sesion_actualizada', (e) => {
    const elemSaldo = document.getElementById('cabecera-saldo-valor');
    if (elemSaldo && e.detail.usuario) {
      elemSaldo.textContent = `${Number(e.detail.usuario.saldo || 0).toFixed(2)} €`;
    }
  });
}

export function inicializarPiePagina(prefijoRuta = '../..') {
  const footerElem = document.getElementById('pie-principal');
  if (!footerElem) return;

  footerElem.className = 'pie-pagina-global';
  footerElem.innerHTML = `
    <div class="contenedor">
      <div class="pie-pagina-rejilla">
        <div>
          <div class="cabecera-marca">
            <span class="cabecera-logo-icono">${ICONOS.servidor}</span>
            <span>GaliGames</span>
          </div>
          <p class="pie-pagina-descripcion">
            Infraestructura de alto rendimiento para servidores de juegos en Linux y Docker. Aislamiento nativo, modloaders modernos y gestión simplificada por 6,00 € al mes.
          </p>
        </div>

        <div>
          <h4 class="pie-pagina-columna-titulo">Navegación</h4>
          <ul class="pie-pagina-lista">
            <li><a href="${prefijoRuta}/html/inicio/home.html" class="pie-pagina-enlace">Inicio</a></li>
            <li><a href="${prefijoRuta}/html/servidores/panel.html" class="pie-pagina-enlace">Mis Servidores</a></li>
            <li><a href="${prefijoRuta}/html/servidores/crear.html" class="pie-pagina-enlace">Crear Servidor</a></li>
            <li><a href="${prefijoRuta}/html/billetera/saldo.html" class="pie-pagina-enlace">Billetera de Créditos</a></li>
          </ul>
        </div>

        <div>
          <h4 class="pie-pagina-columna-titulo">Garantías</h4>
          <ul class="pie-pagina-lista">
            <li><span class="pie-pagina-enlace">Servidores 24/7 sin caídas</span></li>
            <li><span class="pie-pagina-enlace">Copias de seguridad descargables</span></li>
            <li><span class="pie-pagina-enlace">Minecraft Java y Bedrock</span></li>
            <li><span class="pie-pagina-enlace">Desde 7,00 € / mes</span></li>
          </ul>
        </div>
      </div>

      <div class="pie-pagina-inferior">
        <span>&copy; ${new Date().getFullYear()} GaliGames Cloud Gaming. Todos los derechos reservados.</span>
        <span>Desarrollo corporativo por Oier Santo Tomás.</span>
      </div>
    </div>
  `;
}
