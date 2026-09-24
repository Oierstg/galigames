import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

const estadoAsistente = {
  paso: 1,
  juego: 'minecraft',
  edicion: 'java',
  plataforma: 'paper',
  version: '1.20.4',
  plan: '4gb',
  precioPlan: 7.00,
  ramMb: 4096,
  nombre: 'Mi Servidor Minecraft',
  motd: '¡Bienvenidos al servidor!'
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
  document.querySelectorAll('.paso-contenido').forEach(el => {
    el.classList.remove('activo');
  });

  const pasoElemento = document.getElementById(`paso-${numeroPaso}`);
  if (pasoElemento) {
    pasoElemento.classList.add('activo');
  }

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

  if (numeroPaso === 6) {
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

      if (estadoAsistente.edicion === 'bedrock') {
        estadoAsistente.plataforma = 'bedrock';
      } else if (estadoAsistente.plataforma === 'bedrock') {
        estadoAsistente.plataforma = 'paper';
      }
      actualizarOpcionesPlataformas();
    });
  });

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

  // Selección de Plan (4GB = 7€, 6GB = 9€)
  const botonesPlan = document.querySelectorAll('[data-plan]');
  botonesPlan.forEach(btn => {
    btn.addEventListener('click', () => {
      botonesPlan.forEach(b => b.classList.remove('seleccionada'));
      btn.classList.add('seleccionada');
      estadoAsistente.plan = btn.dataset.plan;
      estadoAsistente.precioPlan = parseFloat(btn.dataset.precio);
      estadoAsistente.ramMb = parseInt(btn.dataset.ram, 10);
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
          <p class="tarjeta-opcion-texto">Rendimiento óptimo para jugar sin lag. Soporte total para plugins Spigot y Paper.</p>
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
  const elemPlanNombre = document.getElementById('resumen-plan-nombre');
  const elemSaldoActual = document.getElementById('resumen-saldo-actual');
  const elemTotalPagar = document.getElementById('resumen-total-pagar');
  const textoBtnPagar = document.getElementById('texto-btn-pagar');
  const cajaAvisoSaldo = document.getElementById('caja-aviso-saldo');
  const btnPagarCrear = document.getElementById('btn-pagar-crear');
  const btnRecargaRapida = document.getElementById('btn-recarga-rapida-prueba');
  const textoAvisoSaldo = document.getElementById('texto-aviso-saldo');

  const edicionTexto = estadoAsistente.edicion === 'java' ? 'Java Edition' : 'Bedrock Edition';
  elemJuegoEdicion.textContent = `Minecraft (${edicionTexto})`;
  elemPlataformaVersion.textContent = `${estadoAsistente.plataforma.toUpperCase()} - v${estadoAsistente.version}`;

  const planTexto = estadoAsistente.plan === '6gb' ? 'Plan Pro Modpacks (6 GB RAM)' : 'Plan Amigos (4 GB RAM)';
  elemPlanNombre.textContent = planTexto;

  const precio = estadoAsistente.precioPlan;
  elemTotalPagar.textContent = `${precio.toFixed(2)} € / mes`;
  textoBtnPagar.textContent = `Pagar ${precio.toFixed(2)} € y Activar Servidor`;

  const saldo = estadoSesion.obtenerSaldo();
  elemSaldoActual.textContent = `${saldo.toFixed(2)} €`;

  if (saldo < precio) {
    cajaAvisoSaldo.hidden = false;
    btnPagarCrear.disabled = true;
    textoAvisoSaldo.textContent = `Tu saldo actual (${saldo.toFixed(2)} €) no cubre los ${precio.toFixed(2)} € del plan seleccionado. Pulsa el botón de abajo para recargar los ${precio.toFixed(2)} € de prueba de forma instantánea.`;
    btnRecargaRapida.textContent = `Recargar ${precio.toFixed(2)} € de Prueba Ahora`;
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

  btnRecargaRapida.addEventListener('click', async () => {
    try {
      const montoARecargar = estadoAsistente.precioPlan;
      btnRecargaRapida.disabled = true;
      btnRecargaRapida.textContent = 'Procesando recarga de prueba...';

      const respuesta = await api.billetera.recargar(montoARecargar);
      if (respuesta.exito) {
        estadoSesion.actualizarSaldo(respuesta.saldo);
        mostrarNotificacion(`¡Recarga de prueba de ${montoARecargar.toFixed(2)} € completada!`, 'exito');
        actualizarResumenFinal();
      }
    } catch (error) {
      mostrarNotificacion(error.message, 'error');
    } finally {
      btnRecargaRapida.disabled = false;
    }
  });

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
      btnPagarCrear.innerHTML = `<span>Activando tu servidor...</span>`;

      const datosServidor = {
        juego: 'minecraft',
        nombre,
        motd: motd || '¡Bienvenidos al servidor!',
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
        mostrarNotificacion('¡Servidor activado con éxito! Listo para jugar.', 'exito');
        window.location.href = '../../html/servidores/panel.html';
      } else {
        cajaError.textContent = respuesta.mensaje || 'Error al crear el servidor.';
        cajaError.hidden = false;
      }
    } catch (error) {
      cajaError.textContent = error.message || 'Error en la solicitud.';
      cajaError.hidden = false;
    } finally {
      btnPagarCrear.disabled = false;
      btnPagarCrear.innerHTML = `<span id="texto-btn-pagar">Pagar ${estadoAsistente.precioPlan.toFixed(2)} € y Activar Servidor</span>`;
    }
  });
}
