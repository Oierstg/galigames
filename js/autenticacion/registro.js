import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';
import { CONFIG_APP } from '../comun/configuracion.js';

document.addEventListener('DOMContentLoaded', () => {
  inicializarCabecera('', '../..');
  inicializarPiePagina('../..');

  if (estadoSesion.estaAutenticado()) {
    window.location.href = '../../html/servidores/panel.html';
    return;
  }

  const formulario = document.getElementById('formulario-registro');
  const campoNombre = document.getElementById('campo-nombre');
  const campoEmail = document.getElementById('campo-email');
  const campoPassword = document.getElementById('campo-password');
  const cajaError = document.getElementById('caja-error');
  const botonEnviar = document.getElementById('boton-enviar');

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    cajaError.hidden = true;
    cajaError.textContent = '';

    const nombre = campoNombre.value.trim();
    const email = campoEmail.value.trim();
    const password = campoPassword.value;

    if (!nombre || !email || !password) {
      cajaError.textContent = 'Por favor, completa todos los campos del formulario.';
      cajaError.hidden = false;
      return;
    }

    if (password.length < 6) {
      cajaError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      cajaError.hidden = false;
      return;
    }

    try {
      botonEnviar.disabled = true;
      botonEnviar.textContent = 'Creando cuenta...';

      const respuesta = await api.auth.registro(nombre, email, password);

      if (respuesta.exito && respuesta.token) {
        estadoSesion.iniciarSesion(respuesta.token, respuesta.usuario);
        mostrarNotificacion('¡Cuenta creada con éxito! Bienvenido a GaliGames.', 'exito');
        window.location.href = '../../html/servidores/panel.html';
      } else {
        cajaError.textContent = respuesta.mensaje || 'Error al procesar el registro.';
        cajaError.hidden = false;
      }
    } catch (error) {
      cajaError.textContent = error.message || 'Error de conexión con el backend.';
      cajaError.hidden = false;
    } finally {
      botonEnviar.disabled = false;
      botonEnviar.textContent = 'Registrarme y Acceder';
    }
  });

  // Configuración oficial de Google Identity Services (GSI)
  configurarGoogleAuth(cajaError);
});

function configurarGoogleAuth(cajaError) {
  const contenedorGoogle = document.getElementById('contenedor-google-oficial');
  const botonGoogle = document.getElementById('boton-google');

  const manejarCredencial = async (response) => {
    if (!response || !response.credential) {
      cajaError.textContent = 'No se ha podido obtener la credencial de Google.';
      cajaError.hidden = false;
      return;
    }

    try {
      cajaError.hidden = true;
      cajaError.textContent = '';
      mostrarNotificacion('Registrando y verificando con Google...', 'info');

      const respuesta = await api.auth.google({ credential: response.credential });

      if (respuesta.exito && respuesta.token) {
        estadoSesion.iniciarSesion(respuesta.token, respuesta.usuario);
        mostrarNotificacion('¡Cuenta registrada y autenticada con Google!', 'exito');
        window.location.href = '../../html/servidores/panel.html';
      } else {
        cajaError.textContent = respuesta.mensaje || 'Error al autenticar con Google.';
        cajaError.hidden = false;
      }
    } catch (error) {
      cajaError.textContent = error.message || 'Error de comunicación con el servidor.';
      cajaError.hidden = false;
    }
  };

  const inicializarGSI = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: CONFIG_APP.obtenerGoogleClientId(),
          callback: manejarCredencial,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (contenedorGoogle) {
          window.google.accounts.id.renderButton(contenedorGoogle, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 376
          });

          if (botonGoogle) {
            botonGoogle.classList.add('oculto');
          }
        }
        return true;
      } catch (err) {
        console.warn('[GSI] Inicialización:', err);
      }
    }
    return false;
  };

  if (!inicializarGSI()) {
    const timer = setInterval(() => {
      if (inicializarGSI()) clearInterval(timer);
    }, 200);
    setTimeout(() => clearInterval(timer), 4000);
  }

  if (botonGoogle) {
    botonGoogle.addEventListener('click', () => {
      cajaError.hidden = true;
      cajaError.textContent = '';

      const clientId = CONFIG_APP.obtenerGoogleClientId();
      if (!clientId || clientId.includes('galigames.apps.googleusercontent.com')) {
        cajaError.textContent = 'Google requiere un Client ID real registrado en console.cloud.google.com. Pégalo en js/comun/configuracion.js o regístrate directamente con tu correo y contraseña arriba.';
        cajaError.hidden = false;
        return;
      }

      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      } else {
        cajaError.textContent = 'El servicio de Google se está cargando. Por favor, pulsa en unos instantes.';
        cajaError.hidden = false;
      }
    });
  }
}
