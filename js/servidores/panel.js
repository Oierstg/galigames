import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion, ICONOS } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

let servidorAEliminar = null;

document.addEventListener('DOMContentLoaded', async () => {
  inicializarCabecera('servidores', '../..');
  inicializarPiePagina('../..');

  if (!estadoSesion.estaAutenticado()) {
    window.location.href = '../../html/autenticacion/iniciar-sesion.html';
    return;
  }

  actualizarVisualizacionSaldo();
  await cargarServidores();

  // Modal de eliminación
  const modalEliminar = document.getElementById('modal-eliminar');
  const btnCancelar = document.getElementById('btn-cancelar-eliminar');
  const btnConfirmar = document.getElementById('btn-confirmar-eliminar');

  btnCancelar.addEventListener('click', () => {
    modalEliminar.classList.remove('abierto');
    modalEliminar.hidden = true;
    servidorAEliminar = null;
  });

  btnConfirmar.addEventListener('click', async () => {
    if (!servidorAEliminar) return;
    try {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Eliminando...';
      const respuesta = await api.servidores.eliminar(servidorAEliminar);
      if (respuesta.exito) {
        mostrarNotificacion('Servidor y contenedor Docker eliminados.', 'exito');
        modalEliminar.classList.remove('abierto');
        modalEliminar.hidden = true;
        servidorAEliminar = null;
        await cargarServidores();
      }
    } catch (error) {
      mostrarNotificacion(error.message, 'error');
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Eliminar Servidor';
    }
  });
});

function actualizarVisualizacionSaldo() {
  const elem = document.getElementById('panel-saldo-display');
  if (elem) {
    const saldo = estadoSesion.obtenerSaldo();
    elem.textContent = `${saldo.toFixed(2)} €`;
  }
}

async function cargarServidores() {
  const contenedor = document.getElementById('contenedor-servidores');
  if (!contenedor) return;

  try {
    const respuesta = await api.servidores.listar();
    const servidores = respuesta.servidores || [];

    if (servidores.length === 0) {
      contenedor.innerHTML = `
        <div class="estado-vacio">
          <div class="estado-vacio-icono">
            ${ICONOS.servidor}
          </div>
          <h2 class="estado-vacio-titulo">Aún no tienes ningún servidor creado</h2>
          <p class="estado-vacio-texto">
            Elige Minecraft, configura la versión y tus mods favoritos, y tendrás tu servidor listo en segundos por 6,00 € al mes.
          </p>
          <a href="../../html/servidores/crear.html" class="boton boton-primario boton-grande">
            Crear Mi Primer Servidor
          </a>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = '';
    servidores.forEach(srv => {
      const tarjeta = document.createElement('article');
      tarjeta.className = 'tarjeta-servidor';

      const esEnLinea = srv.estado === 'en_linea';
      const insigniaClase = esEnLinea ? 'insignia-exito' : 'insignia-atenuada';
      const textoEstado = esEnLinea ? 'En línea' : 'Detenido';

      tarjeta.innerHTML = `
        <div class="servidor-info-principal">
          <div class="servidor-icono-juego">
            ${ICONOS.servidor}
          </div>
          <div class="servidor-detalles">
            <div class="servidor-nombre-linea">
              <span class="servidor-nombre">${srv.nombre}</span>
              <span class="insignia ${insigniaClase}">
                <span class="insignia-punto"></span>
                ${textoEstado}
              </span>
            </div>

            <div class="servidor-conexion-bloque">
              <span>${srv.direccionConexion}</span>
              <button type="button" class="boton-copiar-ip" data-ip="${srv.direccionConexion}" title="Copiar IP del servidor">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>

            <div class="servidor-meta-etiquetas">
              <span class="insignia">${srv.edicion.toUpperCase()}</span>
              <span class="insignia">${srv.plataforma.toUpperCase()} ${srv.version}</span>
              <span class="insignia">${srv.ramMb / 1024} GB RAM</span>
            </div>
          </div>
        </div>

        <div class="servidor-acciones">
          ${esEnLinea ? `
            <button type="button" class="boton boton-secundario btn-detener" data-id="${srv.id}">
              ${ICONOS.detener}
              <span>Detener</span>
            </button>
            <button type="button" class="boton boton-fantasma btn-reiniciar" data-id="${srv.id}" title="Reiniciar servidor">
              ${ICONOS.reiniciar}
            </button>
          ` : `
            <button type="button" class="boton boton-primario btn-iniciar" data-id="${srv.id}">
              ${ICONOS.iniciar}
              <span>Iniciar</span>
            </button>
          `}

          <a href="../../html/servidores/consola.html?id=${srv.id}" class="boton boton-secundario" title="Ver consola y registros">
            ${ICONOS.consola}
            <span>Consola</span>
          </a>

          <button type="button" class="boton boton-peligro btn-eliminar" data-id="${srv.id}" title="Eliminar servidor definitivamente">
            ${ICONOS.basura}
          </button>
        </div>
      `;

      // Eventos de botones individuales
      const btnCopiar = tarjeta.querySelector('.boton-copiar-ip');
      btnCopiar.addEventListener('click', () => {
        navigator.clipboard.writeText(btnCopiar.dataset.ip);
        mostrarNotificacion('Dirección IP copiada al portapapeles', 'exito');
      });

      const btnIniciar = tarjeta.querySelector('.btn-iniciar');
      if (btnIniciar) {
        btnIniciar.addEventListener('click', async () => {
          btnIniciar.disabled = true;
          try {
            await api.servidores.iniciar(srv.id);
            mostrarNotificacion('Iniciando contenedor de Minecraft...', 'exito');
            await cargarServidores();
          } catch (e) {
            mostrarNotificacion(e.message, 'error');
            btnIniciar.disabled = false;
          }
        });
      }

      const btnDetener = tarjeta.querySelector('.btn-detener');
      if (btnDetener) {
        btnDetener.addEventListener('click', async () => {
          btnDetener.disabled = true;
          try {
            await api.servidores.detener(srv.id);
            mostrarNotificacion('Servidor apagado.', 'info');
            await cargarServidores();
          } catch (e) {
            mostrarNotificacion(e.message, 'error');
            btnDetener.disabled = false;
          }
        });
      }

      const btnReiniciar = tarjeta.querySelector('.btn-reiniciar');
      if (btnReiniciar) {
        btnReiniciar.addEventListener('click', async () => {
          btnReiniciar.disabled = true;
          try {
            await api.servidores.reiniciar(srv.id);
            mostrarNotificacion('Reiniciando servidor...', 'info');
            await cargarServidores();
          } catch (e) {
            mostrarNotificacion(e.message, 'error');
            btnReiniciar.disabled = false;
          }
        });
      }

      const btnEliminar = tarjeta.querySelector('.btn-eliminar');
      if (btnEliminar) {
        btnEliminar.addEventListener('click', () => {
          servidorAEliminar = srv.id;
          const modal = document.getElementById('modal-eliminar');
          modal.hidden = false;
          modal.classList.add('abierto');
        });
      }

      contenedor.appendChild(tarjeta);
    });
  } catch (error) {
    contenedor.innerHTML = `
      <div class="alerta-mensaje alerta-peligro">
        <span>No se pudieron cargar los servidores. ${error.message}</span>
      </div>
    `;
  }
}
