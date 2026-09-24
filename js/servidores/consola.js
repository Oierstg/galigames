import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

let intervaloLogs = null;
let servidorActual = null;
let rutaActualArchivos = '';
let archivoEnEdicion = null;

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

  intervaloLogs = setInterval(() => {
    actualizarLogs(servidorId);
  }, 4000);

  configurarControles(servidorId);
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

/* ==========================================================================
   Gestor de Archivos, Mods y Descarga de Mundos
   ========================================================================== */
function configurarGestorArchivos(servidorId) {
  const inputSubir = document.getElementById('input-subir-archivo');
  const btnTriggerSubir = document.getElementById('btn-trigger-subir');
  const btnRefrescar = document.getElementById('btn-refrescar-archivos');
  const btnDescargarMundo = document.getElementById('btn-descargar-mundo');
  const btnAbrirModalCarpeta = document.getElementById('btn-abrir-modal-carpeta');

  // Subida de Archivos y Mods
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
      } catch (error) {
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

  // Modal Editor de Archivos
  const modalEditor = document.getElementById('modal-editor-archivo');
  const btnCerrarEditor = document.getElementById('btn-cerrar-editor');
  const btnCancelarEditor = document.getElementById('btn-cancelar-editor');
  const btnGuardarArchivo = document.getElementById('btn-guardar-archivo');
  const textareaEditor = document.getElementById('editor-modal-textarea');

  if (modalEditor) {
    const cerrarEditor = () => {
      modalEditor.classList.remove('abierto');
      archivoEnEdicion = null;
    };
    btnCerrarEditor.addEventListener('click', cerrarEditor);
    btnCancelarEditor.addEventListener('click', cerrarEditor);

    btnGuardarArchivo.addEventListener('click', async () => {
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
    });
  }
}

async function cargarArchivos(servidorId, ruta = '') {
  const tablaCuerpo = document.getElementById('archivos-cuerpo-tabla');
  const estadoVacio = document.getElementById('archivos-estado-vacio');
  if (!tablaCuerpo) return;

  try {
    tablaCuerpo.innerHTML = `<tr><td colspan="4" class="texto-centro">Cargando archivos del servidor...</td></tr>`;
    const res = await api.archivos.listar(servidorId, ruta);

    if (!res.exito) {
      tablaCuerpo.innerHTML = `<tr><td colspan="4" class="texto-centro">${res.mensaje || 'Error al listar archivos'}</td></tr>`;
      return;
    }

    rutaActualArchivos = res.rutaActual || '';
    renderizarMigas(servidorId, rutaActualArchivos);

    const elementos = res.elementos || [];
    tablaCuerpo.innerHTML = '';

    if (elementos.length === 0) {
      if (estadoVacio) estadoVacio.hidden = false;
      return;
    }

    if (estadoVacio) estadoVacio.hidden = true;

    // Si no estamos en la raíz, añadir fila para subir de nivel (..)
    if (rutaActualArchivos) {
      const trSubir = document.createElement('tr');
      trSubir.className = 'archivos-fila-item';
      trSubir.innerHTML = `
        <td class="archivos-nombre-celda">
          <span class="archivos-icono-tipo es-carpeta">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </span>
          <button type="button" class="archivos-enlace-nombre" data-accion="subir-nivel">..</button>
        </td>
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

      const icono = item.esDirectorio
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;

      const tamanoTexto = item.esDirectorio ? '—' : formatearTamano(item.tamano);
      const fechaTexto = item.modificadoEn ? new Date(item.modificadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

      tr.innerHTML = `
        <td class="archivos-nombre-celda">
          <span class="archivos-icono-tipo ${item.esDirectorio ? 'es-carpeta' : ''}">
            ${icono}
          </span>
          <button type="button" class="archivos-enlace-nombre" data-tipo="${item.esDirectorio ? 'carpeta' : 'archivo'}" data-ruta="${rutaItem}">
            ${item.nombre}
          </button>
        </td>
        <td>${tamanoTexto}</td>
        <td>${fechaTexto}</td>
        <td>
          <div class="archivos-acciones-fila">
            ${esEditable ? `
              <button type="button" class="boton boton-fantasma" data-accion="editar" data-ruta="${rutaItem}" title="Editar archivo de configuración">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            ` : ''}
            <button type="button" class="boton boton-fantasma" data-accion="descargar" data-ruta="${rutaItem}" data-nombre="${item.nombre}" title="${item.esDirectorio ? 'Descargar carpeta comprimida (.zip)' : 'Descargar archivo'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </button>
            <button type="button" class="boton boton-fantasma" data-accion="eliminar" data-ruta="${rutaItem}" data-nombre="${item.nombre}" title="Eliminar">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;

      // Navegación al hacer clic en el nombre
      const btnNombre = tr.querySelector('.archivos-enlace-nombre');
      btnNombre.addEventListener('click', () => {
        if (item.esDirectorio) {
          cargarArchivos(servidorId, rutaItem);
        } else if (esEditable) {
          abrirEditorArchivo(servidorId, rutaItem);
        }
      });

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
  } catch (error) {
    tablaCuerpo.innerHTML = `<tr><td colspan="4" class="texto-centro">Error: ${error.message}</td></tr>`;
  }
}

function renderizarMigas(servidorId, ruta) {
  const migasNav = document.getElementById('archivos-migas');
  if (!migasNav) return;

  migasNav.innerHTML = '';

  const btnRaiz = document.createElement('button');
  btnRaiz.type = 'button';
  btnRaiz.className = `archivos-miga-item ${!ruta ? 'activo' : ''}`;
  btnRaiz.textContent = 'raíz';
  btnRaiz.addEventListener('click', () => cargarArchivos(servidorId, ''));
  migasNav.appendChild(btnRaiz);

  if (!ruta) return;

  const partes = ruta.split('/').filter(Boolean);
  let acumulador = '';

  partes.forEach((parte, index) => {
    acumulador = acumulador ? `${acumulador}/${parte}` : parte;
    const esUltima = index === partes.length - 1;

    const separador = document.createElement('span');
    separador.className = 'archivos-miga-separador';
    separador.textContent = '/';
    migasNav.appendChild(separador);

    const btnMiga = document.createElement('button');
    btnMiga.type = 'button';
    btnMiga.className = `archivos-miga-item ${esUltima ? 'activo' : ''}`;
    btnMiga.textContent = parte;
    const rutaDestino = acumulador;
    btnMiga.addEventListener('click', () => cargarArchivos(servidorId, rutaDestino));
    migasNav.appendChild(btnMiga);
  });
}

async function abrirEditorArchivo(servidorId, ruta) {
  const modalEditor = document.getElementById('modal-editor-archivo');
  const tituloModal = document.getElementById('editor-modal-titulo');
  const rutaModal = document.getElementById('editor-modal-ruta');
  const textarea = document.getElementById('editor-modal-textarea');

  try {
    mostrarNotificacion(`Cargando "${ruta}"...`, 'info');
    const res = await api.archivos.leer(servidorId, ruta);
    archivoEnEdicion = ruta;
    tituloModal.textContent = `Editar: ${res.nombre || ruta}`;
    rutaModal.textContent = `/${ruta}`;
    textarea.value = res.contenido || '';
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
