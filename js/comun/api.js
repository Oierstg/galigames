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
      ...(opciones.headers || {})
    };

    if (!(opciones.body instanceof FormData) && !cabeceras['Content-Type']) {
      cabeceras['Content-Type'] = 'application/json';
    }

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
        const errorRed = new Error(`No se pudo conectar con el servidor backend (${this.urlBase}). Verifique si el servidor está encendido y accesible.`);
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
    google: (credencial) =>
      this.peticion('/auth/google', {
        method: 'POST',
        body: JSON.stringify(typeof credencial === 'string' ? { credencial } : credencial)
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

  archivos = {
    listar: (servidorId, ruta = '') =>
      this.peticion(`/servidores/${servidorId}/archivos?ruta=${encodeURIComponent(ruta)}`),
    leer: (servidorId, ruta) =>
      this.peticion(`/servidores/${servidorId}/archivos/leer?ruta=${encodeURIComponent(ruta)}`),
    guardar: (servidorId, ruta, contenido) =>
      this.peticion(`/servidores/${servidorId}/archivos/guardar`, {
        method: 'PUT',
        body: JSON.stringify({ ruta, contenido })
      }),
    crearCarpeta: (servidorId, ruta, nombreCarpeta) =>
      this.peticion(`/servidores/${servidorId}/archivos/carpeta`, {
        method: 'POST',
        body: JSON.stringify({ ruta, nombreCarpeta })
      }),
    subir: (servidorId, ruta, archivo) => {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('ruta', ruta);
      return this.peticion(`/servidores/${servidorId}/archivos/subir`, {
        method: 'POST',
        body: formData
      });
    },
    eliminar: (servidorId, ruta) =>
      this.peticion(`/servidores/${servidorId}/archivos`, {
        method: 'DELETE',
        body: JSON.stringify({ ruta })
      }),
    descargar: async (servidorId, ruta, nombreDescarga) => {
      const token = estadoSesion.obtenerToken();
      const url = `${this.urlBase}/servidores/${servidorId}/archivos/descargar?ruta=${encodeURIComponent(ruta)}&token=${encodeURIComponent(token || '')}`;
      
      const respuesta = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!respuesta.ok) {
        throw new Error('Error al descargar el archivo.');
      }
      const blob = await respuesta.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = nombreDescarga || 'descarga';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(link.href), 1000);
    }
  };
}

export const api = new ClienteApi();
