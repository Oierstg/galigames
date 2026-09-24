const CLAVE_TOKEN = 'galigames_token';
const CLAVE_USUARIO = 'galigames_usuario';

class EstadoSesion {
  constructor() {
    this.token = localStorage.getItem(CLAVE_TOKEN) || null;
    this.usuario = null;
    try {
      const guardado = localStorage.getItem(CLAVE_USUARIO);
      if (guardado) this.usuario = JSON.parse(guardado);
    } catch {
      this.usuario = null;
    }
  }

  estaAutenticado() {
    return Boolean(this.token && this.usuario);
  }

  obtenerToken() {
    return this.token;
  }

  obtenerUsuario() {
    return this.usuario;
  }

  obtenerSaldo() {
    return this.usuario ? Number(this.usuario.saldo || 0) : 0;
  }

  iniciarSesion(token, usuario) {
    this.token = token;
    this.usuario = usuario;
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    this.notificarCambio();
  }

  actualizarSaldo(nuevoSaldo) {
    if (this.usuario) {
      this.usuario.saldo = Number(nuevoSaldo);
      localStorage.setItem(CLAVE_USUARIO, JSON.stringify(this.usuario));
      this.notificarCambio();
    }
  }

  cerrarSesion() {
    this.token = null;
    this.usuario = null;
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this.notificarCambio();
  }

  notificarCambio() {
    window.dispatchEvent(new CustomEvent('galigames:sesion_actualizada', {
      detail: {
        autenticado: this.estaAutenticado(),
        usuario: this.usuario
      }
    }));
  }
}

export const estadoSesion = new EstadoSesion();
