import { CONFIG_APP } from './configuracion.js';
import { estadoSesion } from './estado-sesion.js';

class ClienteApi {
  constructor() {
    this.urlBase = CONFIG_APP.obtenerUrlApi();
  }

  establecerUrlBase(nuevaUrl) {
    this.urlBase = nuevaUrl;
    localStorage.setItem('galigames_url_api', nuevaUrl);
  }

  async peticion(ruta, opciones = {}) {
    const url = `${this.urlBase}${ruta}`;
    const cabeceras = {
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    };

    const token = estadoSesion.obtenerToken();
    if (token) {
      cabeceras['Authorization'] = `Bearer ${token}`;
    }

    try {
      const respuesta = await fetch(url, {
        ...opciones,
        headers: cabeceras
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        if (respuesta.status === 401 || respuesta.status === 403) {
          // Sesión inválida o expirada
          if (estadoSesion.estaAutenticado()) {
            estadoSesion.cerrarSesion();
          }
        }
        const error = new Error(datos.mensaje || `Error en la solicitud HTTP (${respuesta.status})`);
        error.estado = respuesta.status;
        error.datos = datos;
        throw error;
      }

      return datos;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const errorRed = new Error(`No se pudo conectar con el servidor backend (${this.urlBase}). Verifique si el Mini PC Linux está encendido y accesible.`);
        errorRed.esErrorConexion = true;
        throw errorRed;
      }
      throw error;
    }
  }

  // --- Módulos de la API ---
  auth = {
    registro: (nombre, email, password) =>
      this.peticion('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password })
      }),
    login: (email, password) =>
      this.peticion('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    perfil: () => this.peticion('/auth/perfil')
  };

  juegos = {
    catalogo: () => this.peticion('/juegos/catalogo')
  };

  billetera = {
    saldo: () => this.peticion('/billetera/saldo'),
    recargar: (monto) =>
      this.peticion('/billetera/recargar', {
        method: 'POST',
        body: JSON.stringify({ monto })
      })
  };

  servidores = {
    listar: () => this.peticion('/servidores'),
    obtener: (id) => this.peticion(`/servidores/${id}`),
    crear: (datos) =>
      this.peticion('/servidores', {
        method: 'POST',
        body: JSON.stringify(datos)
      }),
    iniciar: (id) =>
      this.peticion(`/servidores/${id}/iniciar`, { method: 'POST' }),
    detener: (id) =>
      this.peticion(`/servidores/${id}/detener`, { method: 'POST' }),
    reiniciar: (id) =>
      this.peticion(`/servidores/${id}/reiniciar`, { method: 'POST' }),
    logs: (id, lineas = 80) =>
      this.peticion(`/servidores/${id}/logs?lineas=${lineas}`),
    comando: (id, comando) =>
      this.peticion(`/servidores/${id}/comando`, {
        method: 'POST',
        body: JSON.stringify({ comando })
      }),
    eliminar: (id) =>
      this.peticion(`/servidores/${id}`, { method: 'DELETE' })
  };
}

export const api = new ClienteApi();
