import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

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

  // Manejo de Registro directo con Google
  const botonGoogle = document.getElementById('boton-google');
  if (botonGoogle) {
    botonGoogle.addEventListener('click', async () => {
      cajaError.hidden = true;
      cajaError.textContent = '';

      const correoSugerido = campoEmail.value.trim() || 'oier.santotomas@gmail.com';
      const emailGoogle = window.prompt('Introduce tu cuenta de correo de Google (Gmail) para crear tu cuenta:', correoSugerido);

      if (!emailGoogle) return;

      if (!emailGoogle.includes('@') || !emailGoogle.includes('.')) {
        cajaError.textContent = 'La dirección proporcionada no es un correo electrónico válido.';
        cajaError.hidden = false;
        return;
      }

      try {
        botonGoogle.disabled = true;
        botonGoogle.textContent = 'Conectando con Google...';

        const nombreManual = campoNombre.value.trim();
        const nombreSugerido = emailGoogle.split('@')[0].replace(/[._-]/g, ' ');
        const nombreFinal = nombreManual || (nombreSugerido.charAt(0).toUpperCase() + nombreSugerido.slice(1));

        const respuesta = await api.auth.google({
          email: emailGoogle,
          nombre: nombreFinal
        });

        if (respuesta.exito && respuesta.token) {
          estadoSesion.iniciarSesion(respuesta.token, respuesta.usuario);
          mostrarNotificacion('¡Cuenta creada y autenticada con Google con éxito!', 'exito');
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
          <span>Registrarse con Google</span>
        `;
      }
    });
  }
});
