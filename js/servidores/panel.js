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
        mostrarNotificacion('Servidor eliminado definitivamente.', 'exito');
        modalEliminar.classList.remove('abierto');
        modalEliminar.hidden = true;
        servidorAEliminar = null;
        await cargarServidores();
      }
    } catch (error) {
      mostrarNotificacion(error.message, 'error');
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Eliminar Definitivamente';
    }
  });
});

async function cargarServidores() {
  const contenedor = document.getElementById('contenedor-servidores');
  const statServidores = document.getElementById('stat-total-servidores');
  const statSaldo = document.getElementById('stat-saldo-disponible');
  const statRam = document.getElementById('stat-ram-total');

  if (!contenedor) return;

  const saldo = estadoSesion.obtenerSaldo();
  if (statSaldo) statSaldo.textContent = `${saldo.toFixed(2)} €`;

  try {
    const respuesta = await api.servidores.listar();
    const servidores = respuesta.servidores || [];

    if (statServidores) statServidores.textContent = String(servidores.length);

    let ramTotalMb = 0;
    servidores.forEach(s => {
      ramTotalMb += (s.ramMb || 4096);
    });
    if (statRam) statRam.textContent = `${(ramTotalMb / 1024).toFixed(0)} GB`;

    if (servidores.length === 0) {
      contenedor.innerHTML = `
        <div class="estado-vacio">
          <div class="estado-vacio-icono">
            ${ICONOS.servidor}
          </div>
          <h2 class="estado-vacio-titulo">Aún no tienes ningún servidor activo</h2>
          <p class="estado-vacio-texto">
            Elige tu versión de Minecraft y empieza a jugar con tus amigos con máxima velocidad por solo 7 € al mes.
          </p>
          <a href="../../html/servidores/crear.html" class="boton boton-primario boton-grande">
            Crear Mi Servidor en 30 Segundos
          </a>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = '';
    servidores.forEach(srv => {
      const tarjeta = document.createElement('article');
      tarjeta.className = 'tarjeta-servidor-hostinger';

      const esEnLinea = srv.estado === 'en_linea';
      const insigniaClase = esEnLinea ? 'insignia-exito' : 'insignia-atenuada';
      const textoEstado = esEnLinea ? 'En línea' : 'Apagado';
      const ramGb = (srv.ramMb || 4096) / 1024;
      const tarifaMensual = srv.costoMensual ? `${Number(srv.costoMensual).toFixed(2)} €/mes` : (ramGb >= 6 ? '9,00 €/mes' : '7,00 €/mes');

      tarjeta.innerHTML = `
        <div class="servidor-cuerpo">
          <div class="servidor-info-izq">
            <div class="servidor-avatar-juego" title="Minecraft Server">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            </div>

            <div class="servidor-nombre-bloque">
              <div class="servidor-titulo-fila">
                <span class="servidor-nombre-texto">${srv.nombre}</span>
                <span class="insignia ${insigniaClase}">
                  <span class="insignia-punto"></span>
                  ${textoEstado}
                </span>
                <span class="insignia insignia-primaria">${tarifaMensual}</span>
              </div>

              <div class="servidor-ip-caja">
                <span>${srv.direccionConexion}</span>
                <button type="button" class="servidor-ip-copiar" data-ip="${srv.direccionConexion}" title="Copiar dirección para tus amigos">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  <span>Copiar IP</span>
                </button>
              </div>

              <div class="servidor-etiquetas-tecnicas">
                <span class="insignia">${srv.edicion.toUpperCase()}</span>
                <span class="insignia">${srv.plataforma.toUpperCase()} ${srv.version}</span>
                <span class="insignia">${ramGb} GB RAM Dedicada</span>
                <span class="insignia">0 / 20 Jugadores</span>
              </div>
            </div>
          </div>

          <div class="servidor-barra-acciones">
            <a href="../../html/servidores/consola.html?id=${srv.id}" class="boton boton-primario" title="Administrar consola y ajustes">
              ${ICONOS.consola}
              <span>Administrar</span>
            </a>

            ${esEnLinea ? `
              <button type="button" class="boton boton-secundario btn-detener" data-id="${srv.id}" title="Apagar servidor">
                ${ICONOS.detener}
                <span>Detener</span>
              </button>
              <button type="button" class="boton boton-fantasma btn-reiniciar" data-id="${srv.id}" title="Reiniciar servidor">
                ${ICONOS.reiniciar}
              </button>
            ` : `
              <button type="button" class="boton boton-secundario btn-iniciar" data-id="${srv.id}" title="Encender servidor">
                ${ICONOS.iniciar}
                <span>Iniciar</span>
              </button>
            `}

            <button type="button" class="boton boton-fantasma btn-eliminar" data-id="${srv.id}" title="Eliminar servidor">
              ${ICONOS.basura}
            </button>
          </div>
        </div>
      `;

      // Eventos
      const btnCopiar = tarjeta.querySelector('.servidor-ip-copiar');
      btnCopiar.addEventListener('click', () => {
        navigator.clipboard.writeText(btnCopiar.dataset.ip);
        mostrarNotificacion('¡IP copiada! Pásasela a tus amigos en Minecraft.', 'exito');
      });

      const btnIniciar = tarjeta.querySelector('.btn-iniciar');
      if (btnIniciar) {
        btnIniciar.addEventListener('click', async () => {
          btnIniciar.disabled = true;
          try {
            await api.servidores.iniciar(srv.id);
            mostrarNotificacion('Iniciando tu servidor Minecraft...', 'exito');
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
        <span>No se pudieron cargar los servidores: ${error.message}</span>
      </div>
    `;
  }
}
