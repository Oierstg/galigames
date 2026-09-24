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
});
