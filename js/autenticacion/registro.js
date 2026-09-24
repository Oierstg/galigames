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
});
