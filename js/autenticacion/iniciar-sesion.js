import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

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

  // Manejo de Inicio de Sesión con Google
  const botonGoogle = document.getElementById('boton-google');
  if (botonGoogle) {
    botonGoogle.addEventListener('click', async () => {
      cajaError.hidden = true;
      cajaError.textContent = '';

      const correoSugerido = campoEmail.value.trim() || 'oier.santotomas@gmail.com';
      const emailGoogle = window.prompt('Introduce tu cuenta de correo de Google (Gmail) para conectar:', correoSugerido);

      if (!emailGoogle) return;

      if (!emailGoogle.includes('@') || !emailGoogle.includes('.')) {
        cajaError.textContent = 'La dirección proporcionada no es un correo electrónico válido.';
        cajaError.hidden = false;
        return;
      }

      try {
        botonGoogle.disabled = true;
        botonGoogle.textContent = 'Conectando con Google...';

        const nombreSugerido = emailGoogle.split('@')[0].replace(/[._-]/g, ' ');
        const nombreCapitalizado = nombreSugerido.charAt(0).toUpperCase() + nombreSugerido.slice(1);

        const respuesta = await api.auth.google({
          email: emailGoogle,
          nombre: nombreCapitalizado
        });

        if (respuesta.exito && respuesta.token) {
          estadoSesion.iniciarSesion(respuesta.token, respuesta.usuario);
          mostrarNotificacion('Autenticado con Google correctamente', 'exito');
          window.location.href = '../../html/servidores/panel.html';
        } else {
          cajaError.textContent = respuesta.mensaje || 'Error al autenticar con Google.';
          cajaError.hidden = false;
        }
      } catch (error) {
        cajaError.textContent = error.message || 'Error de conexión con el servidor.';
        cajaError.hidden = false;
      } finally {
        botonGoogle.disabled = false;
        botonGoogle.innerHTML = `
          <svg class="icono-svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.96 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Iniciar sesión con Google</span>
        `;
      }
    });
  }
});
