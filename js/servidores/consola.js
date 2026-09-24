import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

let intervaloLogs = null;
let servidorActual = null;

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

  await cargarDatosServidor(servidorId);
  await actualizarLogs(servidorId);

  // Intervalo de sondeo periódico de logs (cada 4 segundos)
  intervaloLogs = setInterval(() => {
    actualizarLogs(servidorId);
  }, 4000);

  configurarControles(servidorId);
});

async function cargarDatosServidor(id) {
  try {
    const res = await api.servidores.obtener(id);
    servidorActual = res.servidor;

    document.getElementById('consola-nombre-servidor').textContent = servidorActual.nombre;
    document.getElementById('consola-ip-servidor').textContent = servidorActual.direccionConexion;

    actualizarInsigniaEstado(servidorActual.estado);
  } catch (error) {
    mostrarNotificacion(error.message, 'error');
  }
}

function actualizarInsigniaEstado(estado) {
  const elem = document.getElementById('consola-estado-insignia');
  const esEnLinea = estado === 'en_linea';

  elem.className = `insignia ${esEnLinea ? 'insignia-exito' : 'insignia-atenuada'}`;
  elem.innerHTML = `
    <span class="insignia-punto"></span>
    ${esEnLinea ? 'En línea' : 'Detenido'}
  `;
}

async function actualizarLogs(id) {
  const visor = document.getElementById('terminal-visor');
  if (!visor) return;

  try {
    const res = await api.servidores.logs(id);
    if (res.exito && res.logs) {
      const deberiaDesplazar = visor.scrollHeight - visor.scrollTop <= visor.clientHeight + 50;
      visor.textContent = res.logs;
      if (deberiaDesplazar) {
        visor.scrollTop = visor.scrollHeight;
      }
    }
  } catch {
    // Si falla temporalmente no saturar la pantalla
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
      mostrarNotificacion('Iniciando servidor Minecraft...', 'exito');
      actualizarInsigniaEstado('en_linea');
      await actualizarLogs(id);
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
