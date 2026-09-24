import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

const estadoAsistente = {
  paso: 1,
  juego: 'minecraft',
  edicion: 'java',
  plataforma: 'paper',
  version: '1.20.4',
  nombre: 'Mi Servidor de Minecraft',
  motd: 'Bienvenido al servidor GaliGames',
  ramMb: 4096
};

document.addEventListener('DOMContentLoaded', async () => {
  inicializarCabecera('crear', '../..');
  inicializarPiePagina('../..');

  if (!estadoSesion.estaAutenticado()) {
    mostrarNotificacion('Debes iniciar sesión para crear un servidor', 'alerta');
    window.location.href = '../../html/autenticacion/iniciar-sesion.html';
    return;
  }

  configurarNavegacionPasos();
  configurarSeleccionadores();
  configurarPasoFinal();
});

function configurarNavegacionPasos() {
  const botonesSiguiente = document.querySelectorAll('.btn-siguiente');
  const botonesAnterior = document.querySelectorAll('.btn-anterior');

  botonesSiguiente.forEach(btn => {
    btn.addEventListener('click', () => {
      const siguientePaso = parseInt(btn.dataset.siguiente, 10);
      irAPaso(siguientePaso);
    });
  });

  botonesAnterior.forEach(btn => {
    btn.addEventListener('click', () => {
      const anteriorPaso = parseInt(btn.dataset.anterior, 10);
      irAPaso(anteriorPaso);
    });
  });
}

function irAPaso(numeroPaso) {
  // Ocultar todos los pasos
  document.querySelectorAll('.paso-contenido').forEach(el => {
    el.classList.remove('activo');
  });

  // Mostrar el paso actual
  const pasoElemento = document.getElementById(`paso-${numeroPaso}`);
  if (pasoElemento) {
    pasoElemento.classList.add('activo');
  }

  // Actualizar indicadores superiores
  document.querySelectorAll('.paso-nodo').forEach(nodo => {
    const p = parseInt(nodo.dataset.paso, 10);
    nodo.classList.remove('activo', 'completado');
    if (p === numeroPaso) {
      nodo.classList.add('activo');
    } else if (p < numeroPaso) {
      nodo.classList.add('completado');
    }
  });

  estadoAsistente.paso = numeroPaso;

  if (numeroPaso === 5) {
    actualizarResumenFinal();
  }
}

function configurarSeleccionadores() {
  // Selección de Edición (Java vs Bedrock)
  const botonesEdicion = document.querySelectorAll('[data-edicion]');
  botonesEdicion.forEach(btn => {
    btn.addEventListener('click', () => {
      botonesEdicion.forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      estadoAsistente.edicion = btn.dataset.edicion;

      // Si selecciona bedrock, por defecto asignamos la plataforma bedrock
      if (estadoAsistente.edicion === 'bedrock') {
        estadoAsistente.plataforma = 'bedrock';
      } else if (estadoAsistente.plataforma === 'bedrock') {
        estadoAsistente.plataforma = 'paper';
      }
      actualizarOpcionesPlataformas();
    });
  });

  // Selección de Plataforma / Software
  actualizarOpcionesPlataformas();

  // Selección de Versión
  const botonesVersion = document.querySelectorAll('[data-version]');
  botonesVersion.forEach(btn => {
    btn.addEventListener('click', () => {
      botonesVersion.forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      estadoAsistente.version = btn.dataset.version;
    });
  });
}

function actualizarOpcionesPlataformas() {
  const contenedor = document.getElementById('opciones-plataformas');
  if (!contenedor) return;

  if (estadoAsistente.edicion === 'bedrock') {
    contenedor.innerHTML = `
      <button type="button" class="tarjeta-opcion-grande seleccionada" data-plataforma="bedrock">
        <div class="tarjeta-opcion-cabecera">
          <div class="tarjeta-opcion-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
          </div>
          <span class="insignia insignia-exito">Oficial</span>
        </div>
        <div>
          <h3 class="tarjeta-opcion-titulo">Bedrock Vanilla</h3>
          <p class="tarjeta-opcion-texto">Servidor oficial de Mojang optimizado para dispositivos móviles, consolas y Windows.</p>
        </div>
      </button>

      <button type="button" class="tarjeta-opcion-grande" data-plataforma="geyser">
        <div class="tarjeta-opcion-cabecera">
          <div class="tarjeta-opcion-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          </div>
          <span class="insignia insignia-primaria">Crossplay</span>
        </div>
        <div>
          <h3 class="tarjeta-opcion-titulo">GeyserMC (Crossplay)</h3>
          <p class="tarjeta-opcion-texto">Permite que jugadores de Java y jugadores de Bedrock compartan la misma partida.</p>
        </div>
      </button>
    `;
  } else {
    contenedor.innerHTML = `
      <button type="button" class="tarjeta-opcion-grande ${estadoAsistente.plataforma === 'paper' ? 'seleccionada' : ''}" data-plataforma="paper">
        <div class="tarjeta-opcion-cabecera">
          <div class="tarjeta-opcion-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <span class="insignia insignia-exito">Recomendado</span>
        </div>
        <div>
          <h3 class="tarjeta-opcion-titulo">PaperMC</h3>
          <p class="tarjeta-opcion-texto">Rendimiento ultraoptimizado y compatibilidad completa con plugins (Spigot/Bukkit/Paper).</p>
        </div>
      </button>

      <button type="button" class="tarjeta-opcion-grande ${estadoAsistente.plataforma === 'fabric' ? 'seleccionada' : ''}" data-plataforma="fabric">
        <div class="tarjeta-opcion-cabecera">
          <div class="tarjeta-opcion-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </div>
          <span class="insignia insignia-primaria">Mods Modernos</span>
        </div>
        <div>
          <h3 class="tarjeta-opcion-titulo">Fabric</h3>
          <p class="tarjeta-opcion-texto">Modloader rápido y ligero, ideal para mods modernos de optimización y jugabilidad.</p>
        </div>
      </button>

      <button type="button" class="tarjeta-opcion-grande ${estadoAsistente.plataforma === 'forge' ? 'seleccionada' : ''}" data-plataforma="forge">
        <div class="tarjeta-opcion-cabecera">
          <div class="tarjeta-opcion-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 3.26-6.36 6.36"/></svg>
          </div>
          <span class="insignia">Modpacks</span>
        </div>
        <div>
          <h3 class="tarjeta-opcion-titulo">Forge</h3>
          <p class="tarjeta-opcion-texto">El sistema clásico para grandes paquetes de mods tecnológicos y mundos complejos.</p>
        </div>
      </button>

      <button type="button" class="tarjeta-opcion-grande ${estadoAsistente.plataforma === 'purpur' ? 'seleccionada' : ''}" data-plataforma="purpur">
        <div class="tarjeta-opcion-cabecera">
          <div class="tarjeta-opcion-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <span class="insignia">Personalizado</span>
        </div>
        <div>
          <h3 class="tarjeta-opcion-titulo">Purpur</h3>
          <p class="tarjeta-opcion-texto">Bifurcación de Paper con ajustes avanzados de mecánicas de juego y redstone.</p>
        </div>
      </button>

      <button type="button" class="tarjeta-opcion-grande ${estadoAsistente.plataforma === 'vanilla' ? 'seleccionada' : ''}" data-plataforma="vanilla">
        <div class="tarjeta-opcion-cabecera">
          <div class="tarjeta-opcion-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          </div>
          <span class="insignia">Oficial</span>
        </div>
        <div>
          <h3 class="tarjeta-opcion-titulo">Vanilla Oficial</h3>
          <p class="tarjeta-opcion-texto">Servidor original de Mojang sin alteraciones de terceros.</p>
        </div>
      </button>
    `;
  }

  // Volver a asociar eventos en las nuevas opciones
  const botonesPlataforma = contenedor.querySelectorAll('[data-plataforma]');
  botonesPlataforma.forEach(btn => {
    btn.addEventListener('click', () => {
      botonesPlataforma.forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      estadoAsistente.plataforma = btn.dataset.plataforma;
    });
  });
}

function actualizarResumenFinal() {
  const elemJuegoEdicion = document.getElementById('resumen-juego-edicion');
  const elemPlataformaVersion = document.getElementById('resumen-plataforma-version');
  const elemSaldoActual = document.getElementById('resumen-saldo-actual');
  const cajaAvisoSaldo = document.getElementById('caja-aviso-saldo');
  const btnPagarCrear = document.getElementById('btn-pagar-crear');

  const edicionTexto = estadoAsistente.edicion === 'java' ? 'Java Edition' : 'Bedrock Edition';
  elemJuegoEdicion.textContent = `Minecraft (${edicionTexto})`;
  elemPlataformaVersion.textContent = `${estadoAsistente.plataforma.toUpperCase()} - v${estadoAsistente.version}`;

  const saldo = estadoSesion.obtenerSaldo();
  elemSaldoActual.textContent = `${saldo.toFixed(2)} €`;

  if (saldo < 6.00) {
    cajaAvisoSaldo.hidden = false;
    btnPagarCrear.disabled = true;
  } else {
    cajaAvisoSaldo.hidden = true;
    btnPagarCrear.disabled = false;
  }
}

function configurarPasoFinal() {
  const btnRecargaRapida = document.getElementById('btn-recarga-rapida-prueba');
  const btnPagarCrear = document.getElementById('btn-pagar-crear');
  const campoNombre = document.getElementById('campo-nombre-servidor');
  const campoMotd = document.getElementById('campo-motd');
  const cajaError = document.getElementById('caja-error-crear');

  // Botón de recarga rápida de prueba
  btnRecargaRapida.addEventListener('click', async () => {
    try {
      btnRecargaRapida.disabled = true;
      btnRecargaRapida.textContent = 'Procesando recarga de prueba...';

      const respuesta = await api.billetera.recargar(6.00);
      if (respuesta.exito) {
        estadoSesion.actualizarSaldo(respuesta.saldo);
        mostrarNotificacion('¡Recarga simulada de 6,00 € completada con éxito!', 'exito');
        actualizarResumenFinal();
      }
    } catch (error) {
      mostrarNotificacion(error.message, 'error');
    } finally {
      btnRecargaRapida.disabled = false;
      btnRecargaRapida.textContent = 'Recargar 6,00 € de Prueba Ahora';
    }
  });

  // Botón de creación final y pago simulado
  btnPagarCrear.addEventListener('click', async () => {
    cajaError.hidden = true;
    cajaError.textContent = '';

    const nombre = campoNombre.value.trim();
    const motd = campoMotd.value.trim();

    if (!nombre || nombre.length < 3) {
      cajaError.textContent = 'El nombre del servidor debe tener al menos 3 caracteres.';
      cajaError.hidden = false;
      return;
    }

    try {
      btnPagarCrear.disabled = true;
      btnPagarCrear.innerHTML = `<span>Desplegando en Docker...</span>`;

      const datosServidor = {
        juego: 'minecraft',
        nombre,
        motd: motd || 'Servidor GaliGames en Docker',
        edicion: estadoAsistente.edicion,
        plataforma: estadoAsistente.plataforma,
        version: estadoAsistente.version,
        ramMb: estadoAsistente.ramMb
      };

      const respuesta = await api.servidores.crear(datosServidor);

      if (respuesta.exito) {
        if (typeof respuesta.saldoActualizado === 'number') {
          estadoSesion.actualizarSaldo(respuesta.saldoActualizado);
        }
        mostrarNotificacion('¡Servidor creado e instanciado en Docker con éxito!', 'exito');
        window.location.href = '../../html/servidores/panel.html';
      } else {
        cajaError.textContent = respuesta.mensaje || 'Error al desplegar el servidor.';
        cajaError.hidden = false;
      }
    } catch (error) {
      cajaError.textContent = error.message || 'Error en la solicitud al backend.';
      cajaError.hidden = false;
    } finally {
      btnPagarCrear.disabled = false;
      btnPagarCrear.innerHTML = `<span>Pagar 6,00 € y Desplegar Servidor</span>`;
    }
  });
}
