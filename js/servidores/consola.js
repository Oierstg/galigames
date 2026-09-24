import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

let intervaloLogs = null;
let intervaloMetricas = null;
let servidorActual = null;
let rutaActualArchivos = '';
let archivoEnEdicion = null;
let archivosEnMemoria = [];
let elementoARenombrar = null;
let elementosSeleccionados = new Set();

// Estado en memoria de ajustes de servidor
const estadoAjustes = {
  edicion: 'java',
  plataforma: 'paper',
  version: '1.20.4',
  javaVersion: '21',
  nombre: '',
  subdominio: '',
  motd: '',
  dificultad: 'normal',
  modoJuego: 'survival',
  maxJugadores: 20,
  pvp: true,
  whitelist: false
};

document.addEventListener('DOMContentLoaded', async () => {
  inicializarCabecera('servidores', '../..');
  inicializarPiePagina('../..');

  if (!estadoSesion.estaAutenticado()) {
    window.location.href = '../../html/autenticacion/iniciar-sesion.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const servidorId = urlParams.get('id');

  if (!servidorId) {
    mostrarNotificacion('ID de servidor no especificado.', 'error');
    window.location.href = '../../html/servidores/panel.html';
    return;
  }

  configurarPestanas(servidorId);
  await cargarDatosServidor(servidorId);
  await actualizarLogs(servidorId);
  await cargarMetricasServidor(servidorId);

  intervaloLogs = setInterval(() => {
    actualizarLogs(servidorId);
  }, 4000);

  intervaloMetricas = setInterval(() => {
    cargarMetricasServidor(servidorId);
  }, 5000);

  configurarControles(servidorId);
  configurarAjustesServidor(servidorId);
  configurarGestorArchivos(servidorId);
});

function configurarPestanas(servidorId) {
  const botonesPestana = document.querySelectorAll('.pestana-boton');
  botonesPestana.forEach(btn => {
    btn.addEventListener('click', () => {
      botonesPestana.forEach(b => b.classList.remove('activa'));
      btn.classList.add('activa');

      const pestana = btn.dataset.pestana;
      document.querySelectorAll('.contenido-pestana').forEach(c => c.classList.remove('activa'));
      const contenido = document.getElementById(`pestana-${pestana}`);
      if (contenido) contenido.classList.add('activa');

      if (pestana === 'archivos') {
        cargarArchivos(servidorId, rutaActualArchivos);
      } else if (pestana === 'rendimiento') {
        cargarMetricasServidor(servidorId);
      } else if (pestana === 'ajustes') {
        cargarValoresEnFormularioAjustes();
      }
    });
  });
}

async function cargarDatosServidor(id) {
  try {
    const res = await api.servidores.obtener(id);
    servidorActual = res.servidor;

    document.getElementById('consola-nombre-servidor').textContent = servidorActual.nombre;
    document.getElementById('consola-ip-servidor').textContent = servidorActual.direccionConexion;

    // Token de nodo aislado para escalabilidad
    const tokenNodo = servidorActual.tokenNodo || `srv-${servidorActual.id.substring(0, 8)}`;
    const elemToken = document.getElementById('consola-token-insignia');
    if (elemToken) {
      elemToken.textContent = `Nodo: ${tokenNodo}`;
    }

    // Rellenar pestaña de información general
    const ramGb = (servidorActual.ramMb || 4096) / 1024;
    document.getElementById('detalle-ram-valor').textContent = `${ramGb} GB RAM`;
    document.getElementById('detalle-software-valor').textContent = `${servidorActual.plataforma.toUpperCase()} ${servidorActual.version}`;
    document.getElementById('detalle-puerto-valor').textContent = servidorActual.direccionConexion;
    const tarifa = servidorActual.costoMensual ? `${Number(servidorActual.costoMensual).toFixed(2)} € / mes` : (ramGb >= 6 ? '9,00 € / mes' : '7,00 € / mes');
    document.getElementById('detalle-tarifa-valor').textContent = tarifa;

    // Sincronizar estadoAjustes con datos del servidor
    estadoAjustes.edicion = servidorActual.edicion || 'java';
    estadoAjustes.plataforma = servidorActual.plataforma || 'paper';
    estadoAjustes.version = servidorActual.version || '1.20.4';
    estadoAjustes.nombre = servidorActual.nombre || 'Mi Servidor';
    estadoAjustes.subdominio = servidorActual.subdominio || '';
    estadoAjustes.motd = servidorActual.motd || '¡Bienvenidos al servidor!';

    actualizarInsigniaEstado(servidorActual.estado);

    const btnCopiar = document.getElementById('btn-copiar-ip-consola');
    if (btnCopiar) {
      btnCopiar.addEventListener('click', () => {
        navigator.clipboard.writeText(servidorActual.direccionConexion);
        mostrarNotificacion('¡Dirección copiada para Minecraft!', 'exito');
      });
    }
  } catch (error) {
    mostrarNotificacion(error.message, 'error');
  }
}

function actualizarInsigniaEstado(estado) {
  const elem = document.getElementById('consola-estado-insignia');
  if (!elem) return;
  const esEnLinea = estado === 'en_linea';

  elem.className = `insignia ${esEnLinea ? 'insignia-exito' : 'insignia-atenuada'}`;
  elem.innerHTML = `
    <span class="insignia-punto"></span>
    ${esEnLinea ? 'En línea' : 'Apagado'}
  `;
}

async function actualizarLogs(id) {
  const visor = document.getElementById('terminal-visor');
  if (!visor) return;

  try {
    const res = await api.servidores.logs(id);
    if (res.exito && res.logs) {
      const deberiaDesplazar = visor.scrollHeight - visor.scrollTop <= visor.clientHeight + 60;
      visor.textContent = res.logs;
      if (deberiaDesplazar) {
        visor.scrollTop = visor.scrollHeight;
      }
    }
  } catch {
    // Silencio en fallos transitorios
  }
}

function configurarControles(id) {
  const btnIniciar = document.getElementById('btn-iniciar-servidor');
  const btnDetener = document.getElementById('btn-detener-servidor');
  const btnReiniciar = document.getElementById('btn-reiniciar-servidor');
  const btnLimpiar = document.getElementById('btn-limpiar-terminal');
  const formComando = document.getElementById('formulario-comando');
  const campoComando = document.getElementById('campo-comando');

  btnIniciar.addEventListener('click', async () => {
    btnIniciar.disabled = true;
    try {
      await api.servidores.iniciar(id);
      mostrarNotificacion('Iniciando tu servidor Minecraft...', 'exito');
      actualizarInsigniaEstado('en_linea');
      await actualizarLogs(id);
      await cargarMetricasServidor(id);
    } catch (e) {
      mostrarNotificacion(e.message, 'error');
    } finally {
      btnIniciar.disabled = false;
    }
  });

  btnDetener.addEventListener('click', async () => {
    btnDetener.disabled = true;
    try {
      await api.servidores.detener(id);
      mostrarNotificacion('Servidor detenido.', 'info');
      actualizarInsigniaEstado('detenido');
      await actualizarLogs(id);
      await cargarMetricasServidor(id);
    } catch (e) {
      mostrarNotificacion(e.message, 'error');
    } finally {
      btnDetener.disabled = false;
    }
  });

  btnReiniciar.addEventListener('click', async () => {
    btnReiniciar.disabled = true;
    try {
      await api.servidores.reiniciar(id);
      mostrarNotificacion('Reiniciando servidor...', 'info');
      actualizarInsigniaEstado('en_linea');
      await actualizarLogs(id);
      await cargarMetricasServidor(id);
    } catch (e) {
      mostrarNotificacion(e.message, 'error');
    } finally {
      btnReiniciar.disabled = false;
    }
  });

  btnLimpiar.addEventListener('click', () => {
    const visor = document.getElementById('terminal-visor');
    if (visor) visor.textContent = '';
  });

  formComando.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comando = campoComando.value.trim();
    if (!comando) return;

    campoComando.value = '';
    const visor = document.getElementById('terminal-visor');
    visor.textContent += `\n> ${comando}\n`;
    visor.scrollTop = visor.scrollHeight;

    try {
      const res = await api.servidores.comando(id, comando);
      if (res.respuesta) {
        visor.textContent += `${res.respuesta}\n`;
        visor.scrollTop = visor.scrollHeight;
      }
    } catch (err) {
      mostrarNotificacion(err.message, 'error');
    }
  });
}

/* ==========================================================================
   Pestaña de Ajustes de Servidor (Estilo Crafty Controller / Hostinger)
   ========================================================================== */
function configurarAjustesServidor(servidorId) {
  // Selector Edición
  const botonesEdicion = document.querySelectorAll('[data-edicion-val]');
  botonesEdicion.forEach(btn => {
    btn.addEventListener('click', () => {
      botonesEdicion.forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      estadoAjustes.edicion = btn.dataset.edicionVal;
    });
  });

  // Selector Loaders (NeoForge, Paper, Forge, Fabric, etc.)
  const tarjetasLoader = document.querySelectorAll('[data-loader-val]');
  tarjetasLoader.forEach(tarjeta => {
    tarjeta.addEventListener('click', () => {
      tarjetasLoader.forEach(t => t.classList.remove('seleccionada'));
      tarjeta.classList.add('seleccionada');
      estadoAjustes.plataforma = tarjeta.dataset.loaderVal;
    });

    tarjeta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tarjeta.click();
      }
    });
  });

  // Selector de Versiones
  const selectVersion = document.getElementById('select-version-minecraft');
  const wrapperPersonalizada = document.getElementById('campo-version-personalizada-envoltorio');
  const inputPersonalizada = document.getElementById('input-version-personalizada');

  if (selectVersion) {
    selectVersion.addEventListener('change', () => {
      if (selectVersion.value === 'personalizada') {
        if (wrapperPersonalizada) wrapperPersonalizada.hidden = false;
        if (inputPersonalizada) inputPersonalizada.focus();
      } else {
        if (wrapperPersonalizada) wrapperPersonalizada.hidden = true;
        estadoAjustes.version = selectVersion.value;
      }
    });
  }

  if (inputPersonalizada) {
    inputPersonalizada.addEventListener('input', (e) => {
      estadoAjustes.version = e.target.value.trim() || '1.20.4';
    });
  }

  // Java Version
  const selectJava = document.getElementById('select-java-version');
  if (selectJava) {
    selectJava.addEventListener('change', () => {
      estadoAjustes.javaVersion = selectJava.value;
    });
  }

  // Botones de Guardar (cabecera y pie)
  const btnGuardarCabecera = document.getElementById('btn-guardar-ajustes');
  const btnGuardarPie = document.getElementById('btn-guardar-ajustes-pie');

  const ejecutarGuardado = async () => {
    const inputNombre = document.getElementById('ajustes-campo-nombre');
    const inputSubdominio = document.getElementById('ajustes-campo-subdominio');
    const inputMotd = document.getElementById('ajustes-campo-motd');
    const selectDificultad = document.getElementById('ajustes-campo-dificultad');
    const selectGamemode = document.getElementById('ajustes-campo-gamemode');
    const inputMaxJugadores = document.getElementById('ajustes-campo-max-jugadores');
    const checkPvp = document.getElementById('ajustes-campo-pvp');
    const checkWhitelist = document.getElementById('ajustes-campo-whitelist');

    const nombre = inputNombre ? inputNombre.value.trim() : estadoAjustes.nombre;
    const subdominio = inputSubdominio ? inputSubdominio.value.trim().toLowerCase() : estadoAjustes.subdominio;
    const motd = inputMotd ? inputMotd.value.trim() : estadoAjustes.motd;

    let versionFinal = estadoAjustes.version;
    if (selectVersion && selectVersion.value === 'personalizada' && inputPersonalizada) {
      versionFinal = inputPersonalizada.value.trim() || versionFinal;
    }

    const payload = {
      nombre,
      subdominio,
      motd,
      edicion: estadoAjustes.edicion,
      plataforma: estadoAjustes.plataforma,
      version: versionFinal,
      javaVersion: selectJava ? selectJava.value : '21',
      dificultad: selectDificultad ? selectDificultad.value : 'normal',
      modoJuego: selectGamemode ? selectGamemode.value : 'survival',
      maxJugadores: inputMaxJugadores ? parseInt(inputMaxJugadores.value, 10) : 20,
      pvp: checkPvp ? checkPvp.checked : true,
      whitelist: checkWhitelist ? checkWhitelist.checked : false
    };

    try {
      if (btnGuardarCabecera) btnGuardarCabecera.disabled = true;
      if (btnGuardarPie) btnGuardarPie.disabled = true;
      mostrarNotificacion('Aplicando ajustes y reiniciando contenedor con el nuevo motor...', 'info');

      await api.servidores.actualizarConfiguracion(servidorId, payload);
      await api.servidores.reiniciar(servidorId);

      mostrarNotificacion('Ajustes guardados. Servidor reiniciándose con éxito.', 'exito');
      await cargarDatosServidor(servidorId);
      await actualizarLogs(servidorId);
    } catch (err) {
      mostrarNotificacion(`Error al guardar ajustes: ${err.message}`, 'error');
    } finally {
      if (btnGuardarCabecera) btnGuardarCabecera.disabled = false;
      if (btnGuardarPie) btnGuardarPie.disabled = false;
    }
  };

  if (btnGuardarCabecera) btnGuardarCabecera.addEventListener('click', ejecutarGuardado);
  if (btnGuardarPie) btnGuardarPie.addEventListener('click', ejecutarGuardado);
}

function cargarValoresEnFormularioAjustes() {
  if (!servidorActual) return;

  // Edición
  const botonesEdicion = document.querySelectorAll('[data-edicion-val]');
  botonesEdicion.forEach(b => {
    b.classList.toggle('seleccionada', b.dataset.edicionVal === (servidorActual.edicion || 'java'));
  });

  // Loader
  const tarjetasLoader = document.querySelectorAll('[data-loader-val]');
  tarjetasLoader.forEach(t => {
    t.classList.toggle('seleccionada', t.dataset.loaderVal === (servidorActual.plataforma || 'paper'));
  });

  // Versión
  const selectVersion = document.getElementById('select-version-minecraft');
  const wrapperPersonalizada = document.getElementById('campo-version-personalizada-envoltorio');
  const inputPersonalizada = document.getElementById('input-version-personalizada');

  if (selectVersion) {
    let encontrada = false;
    for (let i = 0; i < selectVersion.options.length; i++) {
      if (selectVersion.options[i].value === servidorActual.version) {
        selectVersion.selectedIndex = i;
        encontrada = true;
        break;
      }
    }
    if (!encontrada) {
      selectVersion.value = 'personalizada';
      if (wrapperPersonalizada) wrapperPersonalizada.hidden = false;
      if (inputPersonalizada) inputPersonalizada.value = servidorActual.version || '';
    } else {
      if (wrapperPersonalizada) wrapperPersonalizada.hidden = true;
    }
  }

  // Campos de texto
  const inputNombre = document.getElementById('ajustes-campo-nombre');
  if (inputNombre) inputNombre.value = servidorActual.nombre || '';

  const inputSubdominio = document.getElementById('ajustes-campo-subdominio');
  if (inputSubdominio) inputSubdominio.value = servidorActual.subdominio || '';

  const inputToken = document.getElementById('ajustes-campo-token');
  if (inputToken) inputToken.value = servidorActual.tokenNodo || `srv-${servidorActual.id.substring(0, 8)}`;

  const inputMotd = document.getElementById('ajustes-campo-motd');
  if (inputMotd) inputMotd.value = servidorActual.motd || '¡Bienvenidos al servidor!';
}

/* ==========================================================================
   Pestaña de Rendimiento y Jugadores (Métricas Reales de Docker)
   ========================================================================== */
async function cargarMetricasServidor(servidorId) {
  try {
    const res = await api.servidores.metricas(servidorId);
    if (!res.exito) return;

    // CPU
    const elemCpu = document.getElementById('metrica-cpu-valor');
    const barraCpu = document.getElementById('barra-progreso-cpu');
    if (elemCpu) elemCpu.textContent = `${res.cpu.porcentaje.toFixed(1)}%`;
    if (barraCpu) barraCpu.style.width = `${Math.min(100, Math.max(0, res.cpu.porcentaje))}%`;

    // RAM
    const elemRam = document.getElementById('metrica-ram-valor');
    const barraRam = document.getElementById('barra-progreso-ram');
    const subtextoRam = document.getElementById('metrica-ram-subtexto');
    if (elemRam) elemRam.textContent = `${res.ram.usoMb} MB / ${res.ram.limiteMb} MB`;
    if (barraRam) {
      barraRam.style.width = `${Math.min(100, Math.max(0, res.ram.porcentaje))}%`;
      if (res.alertaRamAlta || res.ram.porcentaje >= 80) {
        barraRam.classList.add('alerta-alta');
      } else {
        barraRam.classList.remove('alerta-alta');
      }
    }
    if (subtextoRam) subtextoRam.textContent = `${res.ram.porcentaje}% consumido`;

    // Alerta RAM > 80%
    const cajaAlerta = document.getElementById('alerta-ram-servidor');
    if (cajaAlerta) {
      cajaAlerta.hidden = !res.alertaRamAlta && res.ram.porcentaje < 80;
    }

    // Almacenamiento NVMe
    const elemDisco = document.getElementById('metrica-disco-valor');
    const barraDisco = document.getElementById('barra-progreso-disco');
    if (elemDisco) elemDisco.textContent = `${res.disco.usoMb} MB / ${res.disco.totalMb} MB`;
    if (barraDisco) barraDisco.style.width = `${Math.min(100, Math.max(0, res.disco.porcentaje))}%`;

    // Jugadores
    const elemJugadores = document.getElementById('metrica-jugadores-valor');
    const barraJugadores = document.getElementById('barra-progreso-jugadores');
    const subtextoJugadores = document.getElementById('metrica-jugadores-subtexto');
    const insigniaConteo = document.getElementById('insignia-conteo-jugadores');
    if (elemJugadores) elemJugadores.textContent = `${res.jugadores.online} / ${res.jugadores.max}`;
    if (barraJugadores) {
      const pct = (res.jugadores.online / res.jugadores.max) * 100;
      barraJugadores.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }
    if (subtextoJugadores) subtextoJugadores.textContent = `${res.jugadores.online} jugador(es) activos`;
    if (insigniaConteo) {
      insigniaConteo.textContent = `${res.jugadores.online} activos`;
      insigniaConteo.className = `insignia ${res.jugadores.online > 0 ? 'insignia-exito' : 'insignia-atenuada'}`;
    }

    // Renderizar gráfica histórica con telemetría real
    if (res.historico24h) {
      renderizarGrafica24h(res.historico24h);
    }

    // Renderizar tabla de jugadores activos (o estado vacío sin mock)
    if (res.jugadores) {
      renderizarTablaJugadores(servidorId, res.jugadores.lista || []);
    }

    // Renderizar registro de conexiones real
    if (res.historicoConexiones) {
      renderizarEventosConexion(res.historicoConexiones);
    }
  } catch {
    // Silencio en fallos transitorios
  }
}

function renderizarGrafica24h(puntos) {
  const contenedor = document.getElementById('contenedor-grafica-svg');
  if (!contenedor || !puntos || puntos.length === 0) return;

  const ancho = 700;
  const alto = 200;
  const margenX = 35;
  const margenY = 20;
  const anchoUtil = ancho - margenX * 2;
  const altoUtil = alto - margenY * 2;

  const pasoX = puntos.length > 1 ? anchoUtil / (puntos.length - 1) : anchoUtil;

  const coordsRam = puntos.map((p, idx) => {
    const x = margenX + idx * pasoX;
    const y = margenY + altoUtil - (p.ramPorcentaje / 100) * altoUtil;
    return { x, y };
  });

  const coordsCpu = puntos.map((p, idx) => {
    const x = margenX + idx * pasoX;
    const y = margenY + altoUtil - (p.cpuPorcentaje / 100) * altoUtil;
    return { x, y };
  });

  const coordsJugadores = puntos.map((p, idx) => {
    const x = margenX + idx * pasoX;
    const maxEscala = 10;
    const y = margenY + altoUtil - (Math.min(maxEscala, p.jugadores) / maxEscala) * altoUtil;
    return { x, y, valor: p.jugadores, hora: p.hora };
  });

  const dRam = coordsRam.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');
  const dRamArea = `${dRam} L ${coordsRam[coordsRam.length - 1].x.toFixed(1)} ${alto - margenY} L ${coordsRam[0].x.toFixed(1)} ${alto - margenY} Z`;
  const dCpu = coordsCpu.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');
  const dJugadores = coordsJugadores.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');

  let lineasCuadricula = '';
  const niveles = [0, 25, 50, 75, 100];
  niveles.forEach(n => {
    const y = margenY + altoUtil - (n / 100) * altoUtil;
    lineasCuadricula += `
      <line x1="${margenX}" y1="${y}" x2="${ancho - margenX}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${margenX - 6}" y="${y + 3}" fill="#6b7280" font-size="9" text-anchor="end" font-family="monospace">${n}%</text>
    `;
  });

  let etiquetasX = '';
  puntos.forEach((p, idx) => {
    if (idx % 2 === 0 || idx === puntos.length - 1) {
      const x = margenX + idx * pasoX;
      etiquetasX += `<text x="${x}" y="${alto - 4}" fill="#6b7280" font-size="10" text-anchor="middle" font-family="monospace">${p.hora}</text>`;
    }
  });

  let puntosSvg = '';
  coordsJugadores.forEach(c => {
    puntosSvg += `
      <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#10b981" stroke="#090e0b" stroke-width="2">
        <title>${c.hora}: ${c.valor} jugador(es)</title>
      </circle>
    `;
  });

  contenedor.innerHTML = `
    <svg class="grafica-svg-elemento" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" aria-label="Gráfica histórica de concurrencia">
      <defs>
        <linearGradient id="degradado-ram" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${lineasCuadricula}
      <path d="${dRamArea}" fill="url(#degradado-ram)"/>
      <path d="${dRam}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
      <path d="${dCpu}" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="4,2"/>
      <path d="${dJugadores}" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
      ${puntosSvg}
      ${etiquetasX}
    </svg>
  `;
}

function renderizarTablaJugadores(servidorId, jugadores) {
  const tablaCuerpo = document.getElementById('cuerpo-tabla-jugadores');
  if (!tablaCuerpo) return;

  if (jugadores.length === 0) {
    tablaCuerpo.innerHTML = `
      <tr>
        <td colspan="5" class="texto-centro">
          <div style="padding: 24px 0; color: var(--color-texto-atenuado);">
            0 jugadores conectados actualmente.
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tablaCuerpo.innerHTML = '';
  jugadores.forEach(j => {
    const tr = document.createElement('tr');
    tr.className = 'archivos-fila-item';

    tr.innerHTML = `
      <td>
        <div class="jugador-celda">
          <img src="https://mc-heads.net/avatar/${encodeURIComponent(j.nombre)}/28" alt="${j.nombre}" class="jugador-avatar-img" onerror="this.src='https://minotar.net/avatar/${encodeURIComponent(j.nombre)}/28'">
          <div>
            <span class="jugador-nombre-texto">${j.nombre}</span>
            ${j.esOp ? '<span class="insignia-op">OP</span>' : ''}
          </div>
        </div>
      </td>
      <td>${j.tiempoSesionMinutos || 0} min</td>
      <td>${j.horasTotales || 0} h</td>
      <td>
        <span class="ping-indicador">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V4"/></svg>
          ${j.ping || 25} ms
        </span>
      </td>
      <td class="texto-derecha">
        <div class="archivos-acciones-fila">
          <button type="button" class="boton boton-fantasma" data-accion-jugador="op" data-nombre="${j.nombre}" title="${j.esOp ? 'Quitar privilegios OP' : 'Otorgar permisos de Administrador (OP)'}">
            ${j.esOp ? 'DeOP' : 'Hacer OP'}
          </button>
          <button type="button" class="boton boton-fantasma" data-accion-jugador="kick" data-nombre="${j.nombre}" title="Expulsar jugador">
            Expulsar
          </button>
          <button type="button" class="boton boton-fantasma" data-accion-jugador="ban" data-nombre="${j.nombre}" title="Banear jugador">
            Banear
          </button>
        </div>
      </td>
    `;

    const btnOp = tr.querySelector('[data-accion-jugador="op"]');
    const btnKick = tr.querySelector('[data-accion-jugador="kick"]');
    const btnBan = tr.querySelector('[data-accion-jugador="ban"]');

    btnOp.addEventListener('click', async () => {
      const accion = j.esOp ? 'deop' : 'op';
      try {
        await api.servidores.accionJugador(servidorId, j.nombre, accion);
        mostrarNotificacion(`Permisos de ${j.nombre} actualizados con éxito.`, 'exito');
        await cargarMetricasServidor(servidorId);
      } catch (e) {
        mostrarNotificacion(e.message, 'error');
      }
    });

    btnKick.addEventListener('click', async () => {
      const confirmar = window.confirm(`¿Expulsar a "${j.nombre}" del servidor?`);
      if (!confirmar) return;
      try {
        await api.servidores.accionJugador(servidorId, j.nombre, 'kick', 'Expulsado por administrador');
        mostrarNotificacion(`Jugador ${j.nombre} expulsado.`, 'info');
        await cargarMetricasServidor(servidorId);
      } catch (e) {
        mostrarNotificacion(e.message, 'error');
      }
    });

    btnBan.addEventListener('click', async () => {
      const confirmar = window.confirm(`¿Banear permanentemente a "${j.nombre}" del servidor?`);
      if (!confirmar) return;
      try {
        await api.servidores.accionJugador(servidorId, j.nombre, 'ban', 'Baneado del servidor');
        mostrarNotificacion(`Jugador ${j.nombre} baneado.`, 'info');
        await cargarMetricasServidor(servidorId);
      } catch (e) {
        mostrarNotificacion(e.message, 'error');
      }
    });

    tablaCuerpo.appendChild(tr);
  });
}

function renderizarEventosConexion(eventos) {
  const lista = document.getElementById('lista-eventos-conexiones');
  if (!lista) return;

  if (eventos.length === 0) {
    lista.innerHTML = `<li class="evento-item"><span class="evento-detalle">Sin eventos de conexión en esta sesión.</span></li>`;
    return;
  }

  lista.innerHTML = '';
  eventos.slice(0, 10).forEach(e => {
    const li = document.createElement('li');
    li.className = 'evento-item';

    const esConexion = e.accion === 'conexion';
    const icono = esConexion
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="evento-icono-conectar" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="evento-icono-desconectar" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`;

    const horaTexto = e.fecha
      ? new Date(e.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : 'reciente';

    li.innerHTML = `
      ${icono}
      <div class="evento-cuerpo">
        <span class="evento-jugador">${e.jugador}</span>
        <span class="evento-detalle">${esConexion ? 'se conectó al servidor' : (e.motivo ? `se desconectó (${e.motivo})` : 'se desconectó')}</span>
      </div>
      <span class="evento-hora">${horaTexto}</span>
    `;

    lista.appendChild(li);
  });
}

/* ==========================================================================
   Gestor de Archivos Enterprise (Checkboxes, Drag&Drop, Editor Numerado)
   ========================================================================== */
function configurarGestorArchivos(servidorId) {
  const inputSubir = document.getElementById('input-subir-archivo');
  const btnTriggerSubir = document.getElementById('btn-trigger-subir');
  const btnRefrescar = document.getElementById('btn-refrescar-archivos');
  const btnDescargarMundo = document.getElementById('btn-descargar-mundo');
  const btnAbrirModalCarpeta = document.getElementById('btn-abrir-modal-carpeta');
  const btnAbrirModalNuevoArchivo = document.getElementById('btn-abrir-modal-nuevo-archivo');
  const inputBuscar = document.getElementById('input-buscar-archivos');

  // Checkbox Seleccionar Todos
  const checkTodos = document.getElementById('check-seleccionar-todos');
  if (checkTodos) {
    checkTodos.addEventListener('change', () => {
      const estaMarcado = checkTodos.checked;
      const checkboxesFilas = document.querySelectorAll('.check-archivo-fila');
      elementosSeleccionados.clear();

      checkboxesFilas.forEach(cb => {
        cb.checked = estaMarcado;
        if (estaMarcado) {
          elementosSeleccionados.add(cb.dataset.ruta);
        }
      });
      actualizarBarraLote(servidorId);
    });
  }

  // Botón Deseleccionar en Lote
  const btnDeseleccionar = document.getElementById('btn-deseleccionar-lote');
  if (btnDeseleccionar) {
    btnDeseleccionar.addEventListener('click', () => {
      elementosSeleccionados.clear();
      const checkboxesFilas = document.querySelectorAll('.check-archivo-fila');
      checkboxesFilas.forEach(cb => { cb.checked = false; });
      if (checkTodos) checkTodos.checked = false;
      actualizarBarraLote(servidorId);
    });
  }

  // Botón Eliminar en Lote
  const btnEliminarLote = document.getElementById('btn-eliminar-lote');
  if (btnEliminarLote) {
    btnEliminarLote.addEventListener('click', async () => {
      if (elementosSeleccionados.size === 0) return;
      const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente los ${elementosSeleccionados.size} elementos seleccionados?`);
      if (!confirmacion) return;

      mostrarNotificacion(`Eliminando ${elementosSeleccionados.size} elementos...`, 'info');
      for (const ruta of elementosSeleccionados) {
        try {
          await api.archivos.eliminar(servidorId, ruta);
        } catch {
          // Continuar con los demás
        }
      }

      elementosSeleccionados.clear();
      mostrarNotificacion('Elementos eliminados correctamente', 'exito');
      await cargarArchivos(servidorId, rutaActualArchivos);
    });
  }

  // Drag and Drop de Archivos
  const dropzoneContenedor = document.getElementById('archivos-contenedor-dropzone');
  const dropzoneIndicador = document.getElementById('archivos-dropzone-indicador');

  if (dropzoneContenedor && dropzoneIndicador) {
    let contadorDrag = 0;

    dropzoneContenedor.addEventListener('dragenter', (e) => {
      e.preventDefault();
      contadorDrag++;
      dropzoneIndicador.hidden = false;
    });

    dropzoneContenedor.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    dropzoneContenedor.addEventListener('dragleave', (e) => {
      e.preventDefault();
      contadorDrag--;
      if (contadorDrag <= 0) {
        contadorDrag = 0;
        dropzoneIndicador.hidden = true;
      }
    });

    dropzoneContenedor.addEventListener('drop', async (e) => {
      e.preventDefault();
      contadorDrag = 0;
      dropzoneIndicador.hidden = true;

      const archivos = e.dataTransfer.files;
      if (!archivos || archivos.length === 0) return;

      mostrarNotificacion(`Subiendo ${archivos.length} archivo(s)...`, 'info');
      for (let i = 0; i < archivos.length; i++) {
        try {
          await api.archivos.subir(servidorId, rutaActualArchivos, archivos[i]);
          mostrarNotificacion(`"${archivos[i].name}" subido con éxito`, 'exito');
        } catch (error) {
          mostrarNotificacion(`Error en "${archivos[i].name}": ${error.message}`, 'error');
        }
      }
      await cargarArchivos(servidorId, rutaActualArchivos);
    });
  }

  // Filtrado / Búsqueda en vivo
  if (inputBuscar) {
    inputBuscar.addEventListener('input', (e) => {
      const termino = e.target.value.toLowerCase().trim();
      if (!termino) {
        renderizarFilasArchivos(servidorId, archivosEnMemoria);
        return;
      }
      const filtrados = archivosEnMemoria.filter(item =>
        item.nombre.toLowerCase().includes(termino) ||
        (item.extension && item.extension.toLowerCase().includes(termino))
      );
      renderizarFilasArchivos(servidorId, filtrados);
    });
  }

  // Subida de Archivos tradicional
  if (btnTriggerSubir && inputSubir) {
    btnTriggerSubir.addEventListener('click', () => inputSubir.click());
    inputSubir.addEventListener('change', async () => {
      const archivos = inputSubir.files;
      if (!archivos || archivos.length === 0) return;

      mostrarNotificacion(`Subiendo ${archivos.length} archivo(s)...`, 'info');
      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        try {
          await api.archivos.subir(servidorId, rutaActualArchivos, archivo);
          mostrarNotificacion(`"${archivo.name}" subido con éxito`, 'exito');
        } catch (error) {
          mostrarNotificacion(`Error al subir "${archivo.name}": ${error.message}`, 'error');
        }
      }

      inputSubir.value = '';
      await cargarArchivos(servidorId, rutaActualArchivos);
    });
  }

  // Refrescar
  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', () => cargarArchivos(servidorId, rutaActualArchivos));
  }

  // Descargar Mundo (.zip)
  if (btnDescargarMundo) {
    btnDescargarMundo.addEventListener('click', async () => {
      try {
        mostrarNotificacion('Comprimiendo y preparando la descarga del mundo...', 'info');
        await api.archivos.descargar(servidorId, 'world', 'mundo-servidor.zip');
        mostrarNotificacion('Descarga del mundo iniciada con éxito', 'exito');
      } catch {
        mostrarNotificacion('No se pudo descargar el mundo o la carpeta aún no se ha generado.', 'error');
      }
    });
  }

  // Chips de acceso rápido
  const chipsCarpetas = document.querySelectorAll('[data-ruta-rapida]');
  chipsCarpetas.forEach(chip => {
    chip.addEventListener('click', () => {
      const ruta = chip.dataset.rutaRapida;
      cargarArchivos(servidorId, ruta);
    });
  });

  const chipsArchivos = document.querySelectorAll('[data-archivo-rapido]');
  chipsArchivos.forEach(chip => {
    chip.addEventListener('click', () => {
      const archivo = chip.dataset.archivoRapido;
      abrirEditorArchivo(servidorId, archivo);
    });
  });

  // Modal Nueva Carpeta
  const modalCarpeta = document.getElementById('modal-nueva-carpeta');
  const campoNombreCarpeta = document.getElementById('campo-nombre-carpeta');
  const btnCerrarCarpeta = document.getElementById('btn-cerrar-modal-carpeta');
  const btnCancelarCarpeta = document.getElementById('btn-cancelar-crear-carpeta');
  const btnConfirmarCarpeta = document.getElementById('btn-confirmar-crear-carpeta');

  if (btnAbrirModalCarpeta && modalCarpeta) {
    btnAbrirModalCarpeta.addEventListener('click', () => {
      campoNombreCarpeta.value = '';
      modalCarpeta.classList.add('abierto');
      campoNombreCarpeta.focus();
    });

    const cerrarModalCarpeta = () => modalCarpeta.classList.remove('abierto');
    btnCerrarCarpeta.addEventListener('click', cerrarModalCarpeta);
    btnCancelarCarpeta.addEventListener('click', cerrarModalCarpeta);

    btnConfirmarCarpeta.addEventListener('click', async () => {
      const nombre = campoNombreCarpeta.value.trim();
      if (!nombre) {
        mostrarNotificacion('Introduce un nombre para la carpeta.', 'error');
        return;
      }
      try {
        await api.archivos.crearCarpeta(servidorId, rutaActualArchivos, nombre);
        mostrarNotificacion(`Carpeta "${nombre}" creada correctamente`, 'exito');
        cerrarModalCarpeta();
        await cargarArchivos(servidorId, rutaActualArchivos);
      } catch (error) {
        mostrarNotificacion(error.message, 'error');
      }
    });
  }

  // Modal Nuevo Archivo
  const modalNuevoArchivo = document.getElementById('modal-nuevo-archivo');
  const campoNombreNuevoArchivo = document.getElementById('campo-nombre-nuevo-archivo');
  const btnCerrarModalNuevoArchivo = document.getElementById('btn-cerrar-modal-nuevo-archivo');
  const btnCancelarNuevoArchivo = document.getElementById('btn-cancelar-crear-archivo');
  const btnConfirmarNuevoArchivo = document.getElementById('btn-confirmar-crear-archivo');

  if (btnAbrirModalNuevoArchivo && modalNuevoArchivo) {
    btnAbrirModalNuevoArchivo.addEventListener('click', () => {
      campoNombreNuevoArchivo.value = '';
      modalNuevoArchivo.classList.add('abierto');
      campoNombreNuevoArchivo.focus();
    });

    const cerrarModalNuevoArchivo = () => modalNuevoArchivo.classList.remove('abierto');
    btnCerrarModalNuevoArchivo.addEventListener('click', cerrarModalNuevoArchivo);
    btnCancelarNuevoArchivo.addEventListener('click', cerrarModalNuevoArchivo);

    btnConfirmarNuevoArchivo.addEventListener('click', async () => {
      const nombre = campoNombreNuevoArchivo.value.trim();
      if (!nombre) {
        mostrarNotificacion('Introduce un nombre para el archivo.', 'error');
        return;
      }
      try {
        await api.archivos.crearArchivo(servidorId, rutaActualArchivos, nombre, '');
        mostrarNotificacion(`Archivo "${nombre}" creado correctamente`, 'exito');
        cerrarModalNuevoArchivo();
        await cargarArchivos(servidorId, rutaActualArchivos);

        const rutaFinal = rutaActualArchivos ? `${rutaActualArchivos}/${nombre}` : nombre;
        abrirEditorArchivo(servidorId, rutaFinal);
      } catch (error) {
        mostrarNotificacion(error.message, 'error');
      }
    });
  }

  // Modal Renombrar Elemento
  const modalRenombrar = document.getElementById('modal-renombrar');
  const campoNuevoNombre = document.getElementById('campo-nuevo-nombre');
  const btnCerrarRenombrar = document.getElementById('btn-cerrar-modal-renombrar');
  const btnCancelarRenombrar = document.getElementById('btn-cancelar-renombrar');
  const btnConfirmarRenombrar = document.getElementById('btn-confirmar-renombrar');

  if (modalRenombrar) {
    const cerrarModalRenombrar = () => {
      modalRenombrar.classList.remove('abierto');
      elementoARenombrar = null;
    };
    btnCerrarRenombrar.addEventListener('click', cerrarModalRenombrar);
    btnCancelarRenombrar.addEventListener('click', cerrarModalRenombrar);

    btnConfirmarRenombrar.addEventListener('click', async () => {
      if (!elementoARenombrar) return;
      const nuevoNombre = campoNuevoNombre.value.trim();
      if (!nuevoNombre) {
        mostrarNotificacion('Introduce un nombre válido.', 'error');
        return;
      }
      try {
        await api.archivos.renombrar(servidorId, elementoARenombrar.rutaOriginal, nuevoNombre);
        mostrarNotificacion(`Elemento renombrado a "${nuevoNombre}" con éxito`, 'exito');
        cerrarModalRenombrar();
        await cargarArchivos(servidorId, rutaActualArchivos);
      } catch (error) {
        mostrarNotificacion(error.message, 'error');
      }
    });
  }

  // Modal Editor de Archivos con Números de Línea y atajo Ctrl+S
  const modalEditor = document.getElementById('modal-editor-archivo');
  const btnCerrarEditor = document.getElementById('btn-cerrar-editor');
  const btnCancelarEditor = document.getElementById('btn-cancelar-editor');
  const btnGuardarArchivo = document.getElementById('btn-guardar-archivo');
  const textareaEditor = document.getElementById('editor-modal-textarea');
  const lineasNumeros = document.getElementById('editor-lineas-numeros');

  if (modalEditor) {
    const cerrarEditor = () => {
      modalEditor.classList.remove('abierto');
      archivoEnEdicion = null;
    };
    btnCerrarEditor.addEventListener('click', cerrarEditor);
    btnCancelarEditor.addEventListener('click', cerrarEditor);

    const guardarArchivoAccion = async () => {
      if (!archivoEnEdicion) return;
      try {
        btnGuardarArchivo.disabled = true;
        btnGuardarArchivo.textContent = 'Guardando...';
        await api.archivos.guardar(servidorId, archivoEnEdicion, textareaEditor.value);
        mostrarNotificacion('Archivo guardado correctamente', 'exito');
        cerrarEditor();
      } catch (error) {
        mostrarNotificacion(`Error al guardar: ${error.message}`, 'error');
      } finally {
        btnGuardarArchivo.disabled = false;
        btnGuardarArchivo.textContent = 'Guardar Cambios';
      }
    };

    btnGuardarArchivo.addEventListener('click', guardarArchivoAccion);

    // Actualizar numeración de líneas y sincronizar scroll
    if (textareaEditor && lineasNumeros) {
      const actualizarLineas = () => {
        const lineas = textareaEditor.value.split('\n').length;
        let salida = '';
        for (let i = 1; i <= lineas; i++) {
          salida += `${i}\n`;
        }
        lineasNumeros.textContent = salida;
      };

      textareaEditor.addEventListener('input', actualizarLineas);
      textareaEditor.addEventListener('scroll', () => {
        lineasNumeros.scrollTop = textareaEditor.scrollTop;
      });

      // Atajo Ctrl+S / Cmd+S
      textareaEditor.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          guardarArchivoAccion();
        }
      });
    }
  }
}

function actualizarBarraLote() {
  const barraLote = document.getElementById('archivos-lote-barra');
  const conteoTexto = document.getElementById('archivos-seleccionados-conteo');
  const checkTodos = document.getElementById('check-seleccionar-todos');

  const cantidad = elementosSeleccionados.size;
  if (!barraLote) return;

  if (cantidad > 0) {
    barraLote.hidden = false;
    if (conteoTexto) {
      conteoTexto.textContent = `${cantidad} elemento(s) seleccionado(s)`;
    }
  } else {
    barraLote.hidden = true;
    if (checkTodos) checkTodos.checked = false;
  }
}

async function cargarArchivos(servidorId, ruta = '') {
  const tablaCuerpo = document.getElementById('archivos-cuerpo-tabla');
  if (!tablaCuerpo) return;

  try {
    tablaCuerpo.innerHTML = `<tr><td colspan="6" class="texto-centro">Cargando archivos del servidor...</td></tr>`;
    elementosSeleccionados.clear();
    actualizarBarraLote();

    const res = await api.archivos.listar(servidorId, ruta);

    if (!res.exito) {
      tablaCuerpo.innerHTML = `<tr><td colspan="6" class="texto-centro">${res.mensaje || 'Error al listar archivos'}</td></tr>`;
      return;
    }

    rutaActualArchivos = res.rutaActual || '';
    renderizarMigas(servidorId, rutaActualArchivos);

    archivosEnMemoria = res.elementos || [];
    renderizarFilasArchivos(servidorId, archivosEnMemoria);
  } catch (error) {
    tablaCuerpo.innerHTML = `<tr><td colspan="6" class="texto-centro">Error: ${error.message}</td></tr>`;
  }
}

function renderizarMigas(servidorId, ruta) {
  const contenedor = document.getElementById('archivos-migas');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  const btnRaiz = document.createElement('button');
  btnRaiz.type = 'button';
  btnRaiz.className = `archivos-miga-item ${!ruta ? 'activo' : ''}`;
  btnRaiz.dataset.ruta = '';
  btnRaiz.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    <span>raíz</span>
  `;
  if (ruta) {
    btnRaiz.addEventListener('click', () => cargarArchivos(servidorId, ''));
  }
  contenedor.appendChild(btnRaiz);

  if (!ruta) return;

  const partes = ruta.split('/').filter(Boolean);
  let rutaAcumulada = '';

  partes.forEach((parte, index) => {
    rutaAcumulada = rutaAcumulada ? `${rutaAcumulada}/${parte}` : parte;
    const esUltima = index === partes.length - 1;

    const separador = document.createElement('span');
    separador.className = 'archivos-miga-separador';
    separador.textContent = '/';
    contenedor.appendChild(separador);

    const btnParte = document.createElement('button');
    btnParte.type = 'button';
    btnParte.className = `archivos-miga-item ${esUltima ? 'activo' : ''}`;
    btnParte.dataset.ruta = rutaAcumulada;
    btnParte.textContent = parte;

    if (!esUltima) {
      const rutaDestino = rutaAcumulada;
      btnParte.addEventListener('click', () => cargarArchivos(servidorId, rutaDestino));
    }

    contenedor.appendChild(btnParte);
  });
}

function renderizarFilasArchivos(servidorId, elementos) {
  const tablaCuerpo = document.getElementById('archivos-cuerpo-tabla');
  const estadoVacio = document.getElementById('archivos-estado-vacio');
  if (!tablaCuerpo) return;

  tablaCuerpo.innerHTML = '';

  if (elementos.length === 0) {
    if (estadoVacio) estadoVacio.hidden = false;
    return;
  }

  if (estadoVacio) estadoVacio.hidden = true;

  // Subir de nivel (..)
  if (rutaActualArchivos) {
    const trSubir = document.createElement('tr');
    trSubir.className = 'archivos-fila-item';
    trSubir.innerHTML = `
      <td class="celda-checkbox"></td>
      <td class="archivos-nombre-celda">
        <span class="archivos-icono-tipo es-carpeta">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </span>
        <button type="button" class="archivos-enlace-nombre" data-accion="subir-nivel">.. (Subir un nivel)</button>
      </td>
      <td><span class="insignia-tipo-archivo insignia-tipo-general">CARPETA</span></td>
      <td>—</td>
      <td>—</td>
      <td></td>
    `;
    const btnSubirNivel = trSubir.querySelector('[data-accion="subir-nivel"]');
    btnSubirNivel.addEventListener('click', () => {
      const partes = rutaActualArchivos.split('/').filter(Boolean);
      partes.pop();
      cargarArchivos(servidorId, partes.join('/'));
    });
    tablaCuerpo.appendChild(trSubir);
  }

  elementos.forEach(item => {
    const rutaItem = rutaActualArchivos ? `${rutaActualArchivos}/${item.nombre}` : item.nombre;
    const extensionesEditables = ['.properties', '.yml', '.yaml', '.json', '.txt', '.toml', '.cfg', '.conf', '.log'];
    const esEditable = !item.esDirectorio && extensionesEditables.includes(item.extension);

    const tr = document.createElement('tr');
    tr.className = 'archivos-fila-item';

    let claseIcono = 'archivos-icono-tipo';
    let icono = '';
    let insigniaTipo = '<span class="insignia-tipo-archivo insignia-tipo-general">ARCHIVO</span>';

    if (item.esDirectorio) {
      if (item.nombre.toLowerCase() === 'world') {
        claseIcono += ' es-mundo';
        icono = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
        insigniaTipo = '<span class="insignia-tipo-archivo insignia-tipo-mundo">MUNDO</span>';
      } else if (item.nombre.toLowerCase() === 'mods') {
        claseIcono += ' es-mod';
        icono = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;
        insigniaTipo = '<span class="insignia-tipo-archivo insignia-tipo-mod">MODS</span>';
      } else {
        claseIcono += ' es-carpeta';
        icono = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`;
        insigniaTipo = '<span class="insignia-tipo-archivo insignia-tipo-general">CARPETA</span>';
      }
    } else if (item.extension === '.jar') {
      claseIcono += ' es-mod';
      icono = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="12" y2="22"/></svg>`;
      insigniaTipo = '<span class="insignia-tipo-archivo insignia-tipo-mod">MOD JAR</span>';
    } else if (['.yml', '.yaml', '.properties', '.toml', '.json'].includes(item.extension)) {
      claseIcono += ' es-config';
      icono = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="12" y1="17" y2="17"/></svg>`;
      insigniaTipo = '<span class="insignia-tipo-archivo insignia-tipo-config">CONFIG</span>';
    } else if (item.extension === '.log') {
      icono = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="15" y1="17" y2="17"/></svg>`;
      insigniaTipo = '<span class="insignia-tipo-archivo insignia-tipo-log">LOG</span>';
    } else {
      icono = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    }

    const tamanoTexto = item.esDirectorio ? '—' : formatearTamano(item.tamano);
    const fechaTexto = item.modificadoEn ? new Date(item.modificadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    tr.innerHTML = `
      <td class="celda-checkbox">
        <input type="checkbox" class="check-archivo-fila" data-ruta="${rutaItem}" aria-label="Seleccionar ${item.nombre}">
      </td>
      <td class="archivos-nombre-celda">
        <span class="${claseIcono}">
          ${icono}
        </span>
        <button type="button" class="archivos-enlace-nombre" data-tipo="${item.esDirectorio ? 'carpeta' : 'archivo'}" data-ruta="${rutaItem}">
          ${item.nombre}
        </button>
      </td>
      <td>${insigniaTipo}</td>
      <td>${tamanoTexto}</td>
      <td>${fechaTexto}</td>
      <td>
        <div class="archivos-acciones-fila">
          ${esEditable ? `
            <button type="button" class="boton boton-fantasma" data-accion="editar" data-ruta="${rutaItem}" title="Editar archivo de configuración" aria-label="Editar archivo">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          ` : ''}
          <button type="button" class="boton boton-fantasma" data-accion="renombrar" data-ruta="${rutaItem}" data-nombre="${item.nombre}" title="Renombrar" aria-label="Renombrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </button>
          <button type="button" class="boton boton-fantasma" data-accion="descargar" data-ruta="${rutaItem}" data-nombre="${item.nombre}" title="${item.esDirectorio ? 'Descargar carpeta comprimida (.zip)' : 'Descargar archivo'}" aria-label="Descargar">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>
          <button type="button" class="boton boton-fantasma" data-accion="eliminar" data-ruta="${rutaItem}" data-nombre="${item.nombre}" title="Eliminar" aria-label="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;

    // Checkbox individual
    const cb = tr.querySelector('.check-archivo-fila');
    cb.addEventListener('change', () => {
      if (cb.checked) {
        elementosSeleccionados.add(rutaItem);
      } else {
        elementosSeleccionados.delete(rutaItem);
      }
      actualizarBarraLote();
    });

    // Navegación al hacer clic en el nombre
    const btnNombre = tr.querySelector('.archivos-enlace-nombre');
    btnNombre.addEventListener('click', () => {
      if (item.esDirectorio) {
        cargarArchivos(servidorId, rutaItem);
      } else if (esEditable) {
        abrirEditorArchivo(servidorId, rutaItem);
      }
    });

    // Acción Renombrar
    const btnRenombrar = tr.querySelector('[data-accion="renombrar"]');
    if (btnRenombrar) {
      btnRenombrar.addEventListener('click', () => {
        elementoARenombrar = { rutaOriginal: rutaItem, nombreActual: item.nombre };
        const modalRenombrar = document.getElementById('modal-renombrar');
        const campoNuevoNombre = document.getElementById('campo-nuevo-nombre');
        if (modalRenombrar && campoNuevoNombre) {
          campoNuevoNombre.value = item.nombre;
          modalRenombrar.classList.add('abierto');
          campoNuevoNombre.focus();
        }
      });
    }

    // Acción Descargar
    const btnDescargar = tr.querySelector('[data-accion="descargar"]');
    if (btnDescargar) {
      btnDescargar.addEventListener('click', async () => {
        try {
          mostrarNotificacion(`Descargando "${item.nombre}"...`, 'info');
          const nombreDescarga = item.esDirectorio ? `${item.nombre}.zip` : item.nombre;
          await api.archivos.descargar(servidorId, rutaItem, nombreDescarga);
        } catch (err) {
          mostrarNotificacion(err.message, 'error');
        }
      });
    }

    // Acción Editar
    const btnEditar = tr.querySelector('[data-accion="editar"]');
    if (btnEditar) {
      btnEditar.addEventListener('click', () => {
        abrirEditorArchivo(servidorId, rutaItem);
      });
    }

    // Acción Eliminar
    const btnEliminar = tr.querySelector('[data-accion="eliminar"]');
    if (btnEliminar) {
      btnEliminar.addEventListener('click', async () => {
        const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${item.nombre}"?`);
        if (!confirmar) return;
        try {
          await api.archivos.eliminar(servidorId, rutaItem);
          mostrarNotificacion(`"${item.nombre}" eliminado correctamente`, 'exito');
          await cargarArchivos(servidorId, rutaActualArchivos);
        } catch (err) {
          mostrarNotificacion(err.message, 'error');
        }
      });
    }

    tablaCuerpo.appendChild(tr);
  });
}



async function abrirEditorArchivo(servidorId, ruta) {
  const modalEditor = document.getElementById('modal-editor-archivo');
  const tituloModal = document.getElementById('editor-modal-titulo');
  const rutaModal = document.getElementById('editor-modal-ruta');
  const textarea = document.getElementById('editor-modal-textarea');
  const lineasNumeros = document.getElementById('editor-lineas-numeros');

  try {
    mostrarNotificacion(`Cargando "${ruta}"...`, 'info');
    const res = await api.archivos.leer(servidorId, ruta);
    archivoEnEdicion = ruta;
    tituloModal.textContent = `Editar: ${res.nombre || ruta}`;
    rutaModal.textContent = `/${ruta}`;
    textarea.value = res.contenido || '';

    // Renderizar líneas
    if (lineasNumeros) {
      const lineas = textarea.value.split('\n').length;
      let salida = '';
      for (let i = 1; i <= lineas; i++) {
        salida += `${i}\n`;
      }
      lineasNumeros.textContent = salida;
    }

    modalEditor.classList.add('abierto');
  } catch (error) {
    mostrarNotificacion(`No se pudo abrir el archivo: ${error.message}`, 'error');
  }
}

function formatearTamano(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const unidades = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${unidades[i]}`;
}
