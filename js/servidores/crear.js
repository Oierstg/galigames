import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

const estadoDespliegue = {
  juego: 'minecraft',
  edicion: 'java',
  plataforma: 'paper',
  version: '1.20.4',
  plan: '4gb',
  precioPlan: 7.00,
  ramMb: 4096,
  nombre: 'Mi Servidor Minecraft',
  subdominio: 'mi-partida'
};

document.addEventListener('DOMContentLoaded', async () => {
  inicializarCabecera('crear', '../..');
  inicializarPiePagina('../..');

  if (!estadoSesion.estaAutenticado()) {
    mostrarNotificacion('Debes iniciar sesión para desplegar un servidor', 'alerta');
    window.location.href = '../../html/autenticacion/iniciar-sesion.html';
    return;
  }

  configurarControles();
  await sincronizarSaldoUsuario();
});

function configurarControles() {
  const campoNombre = document.getElementById('campo-nombre-servidor');
  const campoSubdominio = document.getElementById('campo-subdominio');
  const textoSubdominio = document.getElementById('resumen-subdominio-texto');
  const form = document.getElementById('formulario-crear-servidor');
  const btnRecargaPrueba = document.getElementById('btn-recarga-rapida-prueba');

  if (campoNombre) {
    campoNombre.addEventListener('input', (e) => {
      estadoDespliegue.nombre = e.target.value.trim() || 'Mi Servidor Minecraft';
    });
  }

  if (campoSubdominio) {
    campoSubdominio.addEventListener('input', (e) => {
      // Forzar formato de subdominio: minúsculas, números y guiones
      let valorLimpio = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      campoSubdominio.value = valorLimpio;
      estadoDespliegue.subdominio = valorLimpio || 'mi-servidor';
      if (textoSubdominio) {
        textoSubdominio.textContent = `${estadoDespliegue.subdominio}.galigames.net`;
      }
    });
  }

  // Selección de Plan (4GB = 7€, 6GB = 9€)
  const tarjetasPlan = document.querySelectorAll('.tarjeta-plan-crear');
  tarjetasPlan.forEach(tarjeta => {
    tarjeta.addEventListener('click', () => {
      tarjetasPlan.forEach(t => t.classList.remove('seleccionada'));
      tarjeta.classList.add('seleccionada');

      estadoDespliegue.plan = tarjeta.dataset.plan;
      estadoDespliegue.precioPlan = parseFloat(tarjeta.dataset.precio);
      estadoDespliegue.ramMb = parseInt(tarjeta.dataset.ram, 10);

      actualizarResumenPlan();
    });

    tarjeta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tarjeta.click();
      }
    });
  });

  // Botón Recarga de Saldo de Prueba
  if (btnRecargaPrueba) {
    btnRecargaPrueba.addEventListener('click', async () => {
      try {
        btnRecargaPrueba.disabled = true;
        btnRecargaPrueba.textContent = 'Añadiendo saldo...';
        await api.billetera.recargar(25.00, 'recarga_prueba');
        mostrarNotificacion('¡Recargados 25,00 € de saldo de prueba con éxito!', 'exito');
        await sincronizarSaldoUsuario();
      } catch (err) {
        mostrarNotificacion(`No se pudo recargar saldo: ${err.message}`, 'error');
      } finally {
        btnRecargaPrueba.disabled = false;
        btnRecargaPrueba.textContent = 'Recargar Saldo de Prueba Ahora';
      }
    });
  }

  // Envío del formulario de despliegue
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await ejecutarDespliegueServidor();
    });
  }
}

function actualizarResumenPlan() {
  const elemPlanNombre = document.getElementById('resumen-plan-nombre');
  const elemTotalPagar = document.getElementById('resumen-total-pagar');
  const textoBtn = document.getElementById('texto-btn-desplegar');

  const esPlan6Gb = estadoDespliegue.plan === '6gb';
  const nombrePlan = esPlan6Gb ? 'Plan Pro Modpacks (6 GB RAM)' : 'Plan Amigos (4 GB RAM)';
  const precioTexto = `${estadoDespliegue.precioPlan.toFixed(2).replace('.', ',')} € / mes`;

  if (elemPlanNombre) elemPlanNombre.textContent = nombrePlan;
  if (elemTotalPagar) elemTotalPagar.textContent = precioTexto;
  if (textoBtn) textoBtn.textContent = `Desplegar Servidor (${estadoDespliegue.precioPlan.toFixed(2).replace('.', ',')} €/mes)`;

  verificarSaldoSuficiente();
}

async function sincronizarSaldoUsuario() {
  try {
    const res = await api.billetera.obtener();
    if (res.exito) {
      estadoSesion.actualizarSaldo(res.saldo);
      const elemSaldo = document.getElementById('resumen-saldo-actual');
      if (elemSaldo) {
        elemSaldo.textContent = `${Number(res.saldo).toFixed(2).replace('.', ',')} €`;
      }
    }
  } catch {
    const saldoCache = estadoSesion.obtenerSaldo();
    const elemSaldo = document.getElementById('resumen-saldo-actual');
    if (elemSaldo) {
      elemSaldo.textContent = `${Number(saldoCache).toFixed(2).replace('.', ',')} €`;
    }
  }

  verificarSaldoSuficiente();
}

function verificarSaldoSuficiente() {
  const saldoActual = estadoSesion.obtenerSaldo();
  const cajaAvisoSaldo = document.getElementById('caja-aviso-saldo');
  const btnDesplegar = document.getElementById('btn-desplegar-servidor');

  const tieneSaldo = saldoActual >= estadoDespliegue.precioPlan;

  if (cajaAvisoSaldo) {
    cajaAvisoSaldo.hidden = tieneSaldo;
  }

  if (btnDesplegar) {
    btnDesplegar.disabled = !tieneSaldo;
  }
}

async function ejecutarDespliegueServidor() {
  const btnDesplegar = document.getElementById('btn-desplegar-servidor');
  const textoBtn = document.getElementById('texto-btn-desplegar');
  const cajaError = document.getElementById('caja-error-crear');

  if (cajaError) {
    cajaError.hidden = true;
    cajaError.textContent = '';
  }

  const nombreFinal = estadoDespliegue.nombre || 'Mi Servidor Minecraft';
  const subdominioFinal = estadoDespliegue.subdominio || 'mi-servidor';

  if (!subdominioFinal || subdominioFinal.length < 3) {
    mostrarNotificacion('El subdominio debe contener al menos 3 caracteres alfanuméricos.', 'error');
    return;
  }

  btnDesplegar.disabled = true;
  textoBtn.textContent = 'Aprovisionando contenedor dedicado...';

  try {
    const payload = {
      nombre: nombreFinal,
      subdominio: subdominioFinal,
      juego: estadoDespliegue.juego,
      edicion: estadoDespliegue.edicion,
      plataforma: estadoDespliegue.plataforma,
      version: estadoDespliegue.version,
      ramMb: estadoDespliegue.ramMb,
      plan: estadoDespliegue.plan,
      costoMensual: estadoDespliegue.precioPlan,
      motd: `¡Bienvenidos a ${nombreFinal}!`
    };

    const res = await api.servidores.crear(payload);

    if (res.exito && res.servidor) {
      mostrarNotificacion('¡Servidor desplegado con éxito! Redirigiendo a tu consola...', 'exito');
      setTimeout(() => {
        window.location.href = `../../html/servidores/consola.html?id=${res.servidor.id}`;
      }, 1200);
    } else {
      throw new Error(res.mensaje || 'Error al desplegar el servidor');
    }
  } catch (err) {
    if (cajaError) {
      cajaError.hidden = false;
      cajaError.textContent = `No se pudo desplegar el servidor: ${err.message}`;
    }
    mostrarNotificacion(err.message, 'error');
    btnDesplegar.disabled = false;
    textoBtn.textContent = `Desplegar Servidor (${estadoDespliegue.precioPlan.toFixed(2).replace('.', ',')} €/mes)`;
  }
}
