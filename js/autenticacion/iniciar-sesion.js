import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';
import { CONFIG_APP } from '../comun/configuracion.js';

document.addEventListener('DOMContentLoaded', () => {
  inicializarCabecera('', '../..');
  inicializarPiePagina('../..');

  // Si ya tiene sesión, redirigir al panel
  if (estadoSesion.estaAutenticado()) {
    window.location.href = '../../html/servidores/panel.html';
    return;
  }

  const formulario = document.getElementById('formulario-login');
  const campoEmail = document.getElementById('campo-email');
  const campoPassword = document.getElementById('campo-password');
  const cajaError = document.getElementById('caja-error');
  const botonEnviar = document.getElementById('boton-enviar');

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    cajaError.hidden = true;
    cajaError.textContent = '';

    const email = campoEmail.value.trim();
    const password = campoPassword.value;

    if (!email || !password) {
      cajaError.textContent = 'Por favor, introduce el correo y la contraseña.';
      cajaError.hidden = false;
      return;
    }

    try {
      botonEnviar.disabled = true;
      botonEnviar.textContent = 'Verificando...';

      const respuesta = await api.auth.login(email, password);

      if (respuesta.exito && respuesta.token) {
        estadoSesion.iniciarSesion(respuesta.token, respuesta.usuario);
        mostrarNotificacion('Sesión iniciada correctamente', 'exito');
        window.location.href = '../../html/servidores/panel.html';
      } else {
        cajaError.textContent = respuesta.mensaje || 'Error al iniciar sesión.';
        cajaError.hidden = false;
      }
    } catch (error) {
      cajaError.textContent = error.message || 'Error de conexión con el servidor.';
      cajaError.hidden = false;
    } finally {
      botonEnviar.disabled = false;
      botonEnviar.textContent = 'Iniciar Sesión';
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
      mostrarNotificacion('Verificando cuenta de Google...', 'info');

      const respuesta = await api.auth.google({ credential: response.credential });

      if (respuesta.exito && respuesta.token) {
        estadoSesion.iniciarSesion(respuesta.token, respuesta.usuario);
        mostrarNotificacion('¡Sesión iniciada con Google correctamente!', 'exito');
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

          // Si el botón oficial se renderizó, ocultamos el botón de respaldo
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
    // Si la librería de Google aún está descargándose
    const timer = setInterval(() => {
      if (inicializarGSI()) clearInterval(timer);
    }, 200);
    setTimeout(() => clearInterval(timer), 4000);
  }

  if (botonGoogle) {
    botonGoogle.addEventListener('click', () => {
      cajaError.hidden = true;
      cajaError.textContent = '';

      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      } else {
        cajaError.textContent = 'El servicio de Google se está cargando. Por favor, pulsa en unos instantes.';
        cajaError.hidden = false;
      }
    });
  }
}
