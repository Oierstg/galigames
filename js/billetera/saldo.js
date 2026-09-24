import { inicializarCabecera, inicializarPiePagina, mostrarNotificacion } from '../comun/componentes.js';
import { api } from '../comun/api.js';
import { estadoSesion } from '../comun/estado-sesion.js';

document.addEventListener('DOMContentLoaded', async () => {
  inicializarCabecera('billetera', '../..');
  inicializarPiePagina('../..');

  if (!estadoSesion.estaAutenticado()) {
    window.location.href = '../../html/autenticacion/iniciar-sesion.html';
    return;
  }

  await cargarDatosBilletera();
  configurarBotonesRecarga();
});

async function cargarDatosBilletera() {
  const elemSaldo = document.getElementById('valor-saldo-grande');
  const cuerpoTabla = document.getElementById('cuerpo-tabla-transacciones');

  try {
    const res = await api.billetera.saldo();

    if (res.exito) {
      const saldoActual = Number(res.saldo || 0);
      elemSaldo.textContent = `${saldoActual.toFixed(2)} €`;
      estadoSesion.actualizarSaldo(saldoActual);

      const transacciones = res.transacciones || [];
      if (transacciones.length === 0) {
        cuerpoTabla.innerHTML = `
          <tr>
            <td colspan="4" class="celda-vacia-historial">
              No tienes movimientos registrados todavía. Utiliza los botones de arriba para añadir saldo de prueba.
            </td>
          </tr>
        `;
      } else {
        cuerpoTabla.innerHTML = '';
        transacciones.forEach(t => {
          const fila = document.createElement('tr');
          const esPositivo = t.monto > 0;
          const fechaFormateada = new Date(t.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          fila.innerHTML = `
            <td>${fechaFormateada}</td>
            <td><strong>${t.concepto}</strong></td>
            <td>
              <span class="insignia ${esPositivo ? 'insignia-exito' : 'insignia-primaria'}">
                ${esPositivo ? 'Recarga Simulada' : 'Servicio Contratado'}
              </span>
            </td>
            <td class="${esPositivo ? 'monto-positivo' : 'monto-negativo'}">
              ${esPositivo ? '+' : ''}${Number(t.monto).toFixed(2)} €
            </td>
          `;
          cuerpoTabla.appendChild(fila);
        });
      }
    }
  } catch (error) {
    mostrarNotificacion(error.message, 'error');
  }
}

function configurarBotonesRecarga() {
  const botones = document.querySelectorAll('.btn-recargar');

  botones.forEach(btn => {
    btn.addEventListener('click', async () => {
      const monto = parseFloat(btn.dataset.monto);
      if (isNaN(monto) || monto <= 0) return;

      try {
        btn.disabled = true;
        const textoOriginal = btn.textContent;
        btn.textContent = 'Procesando...';

        const res = await api.billetera.recargar(monto);
        if (res.exito) {
          mostrarNotificacion(`¡Recarga de ${monto.toFixed(2)} € completada con éxito!`, 'exito');
          await cargarDatosBilletera();
        }
        btn.textContent = textoOriginal;
      } catch (err) {
        mostrarNotificacion(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });
}
