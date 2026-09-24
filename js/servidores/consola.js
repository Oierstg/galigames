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

  configurarPestanas();
  await cargarDatosServidor(servidorId);
  await actualizarLogs(servidorId);

  intervaloLogs = setInterval(() => {
    actualizarLogs(servidorId);
  }, 4000);

  configurarControles(servidorId);
});

function configurarPestanas() {
  const botonesPestana = document.querySelectorAll('.pestana-boton');
  botonesPestana.forEach(btn => {
    btn.addEventListener('click', () => {
      botonesPestana.forEach(b => b.classList.remove('activa'));
      btn.classList.add('activa');

      const pestana = btn.dataset.pestana;
      document.querySelectorAll('.contenido-pestana').forEach(c => c.classList.remove('activa'));
      const contenido = document.getElementById(`pestana-${pestana}`);
      if (contenido) contenido.classList.add('activa');
    });
  });
}

async function cargarDatosServidor(id) {
  try {
    const res = await api.servidores.obtener(id);
    servidorActual = res.servidor;

    document.getElementById('consola-nombre-servidor').textContent = servidorActual.nombre;
    document.getElementById('consola-ip-servidor').textContent = servidorActual.direccionConexion;

    // Rellenar pestaña de recursos
    const ramGb = (servidorActual.ramMb || 4096) / 1024;
    document.getElementById('detalle-ram-valor').textContent = `${ramGb} GB RAM`;
    document.getElementById('detalle-software-valor').textContent = `${servidorActual.plataforma.toUpperCase()} ${servidorActual.version}`;
    document.getElementById('detalle-puerto-valor').textContent = servidorActual.direccionConexion;
    const tarifa = servidorActual.costoMensual ? `${Number(servidorActual.costoMensual).toFixed(2)} € / mes` : (ramGb >= 6 ? '9,00 € / mes' : '7,00 € / mes');
    document.getElementById('detalle-tarifa-valor').textContent = tarifa;

    actualizarInsigniaEstado(servidorActual.estado);

    const btnCopiar = document.getElementById('btn-copiar-ip-consola');
    if (btnCopiar) {
      btnCopiar.addEventListener('click', () => {
        navigator.clipboard.writeText(servidorActual.direccionConexion);
        mostrarNotificacion('¡Dirección IP copiada!', 'exito');
      });
    }
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
    ${esEnLinea ? 'En línea' : 'Apagado'}
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
