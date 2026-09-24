# GaliGames Frontend - Portal Web de Servidores de Juegos

Interfaz web de nivel corporativo (*Enterprise Grade*) para la creación y gestión simplificada de servidores de juegos (Minecraft Java y Bedrock) alojados en contenedores Docker independientes.

Diseñado para ejecutarse como sitio estático sin dependencias pesadas, directamente compatible con **GitHub Pages**.

## Principios y Estándares de Arquitectura

1. **Estructura Espejo Obligatoria**:
   - Carpetas raíz: `html/`, `css/` y `js/` organizadas de forma idéntica y simétrica.
   - Recursos compartidos en subdirectorio `comun/`.
   - Vistas con correspondencia exacta 1:1 (`home.html` <-> `home.css` <-> `home.js`).
2. **Separación Estricta de Tecnologías**:
   - Cero código JavaScript incrustado en HTML (únicamente scripts externos con `defer` y `type="module"`).
   - Cero estilos en línea (`style="..."`) o bloques `<style>` en HTML.
3. **Lenguaje Visual Corporativo**:
   - Cero emojis en toda la interfaz.
   - Iconografía 100% vectorial SVG monocrómica con trazo fino (`stroke-width="1.5"` y `stroke="currentColor"`).
   - Paleta de grises neutros y acento institucional en azul corporativo.
   - Retícula matemática con espaciado en múltiplos de 8px y 4px.
4. **Accesibilidad y Semántica**:
   - Etiquetas HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).
   - Formularios accesibles con `<label for="...">` asociados a `<input id="...">`.
   - Navegación por teclado con estados `:focus-visible`.

## Flujo de Usuario y Funcionalidades

- **Página de Inicio / Landing**: Explicación del servicio, tarifa plana de 6,00 € al mes por servidor y catálogo de juegos disponibles y próximos (Minecraft, Rust, Palworld, etc.).
- **Autenticación**: Registro de usuario y acceso con tokens JWT almacenados de forma segura en el navegador.
- **Asistente Visual de Creación (Wizard)**:
  - Diseñado para usuarios sin conocimientos técnicos previos.
  - Selección de Edición: Java Edition o Bedrock Edition.
  - Selección de Plataforma / Mods: PaperMC (recomendado para rendimiento y plugins), Fabric (mods modernos), Forge (modpacks clásicos), Purpur y Vanilla Oficial.
  - Selección rápida de versión (1.21.1, 1.20.4, 1.20.1, 1.19.4...).
  - Resumen de facturación (6,00 €/mes) y control de saldo. Si el usuario no tiene saldo, se le ofrece un botón de recarga de prueba instantáneo para completar el alta sin coste real.
- **Panel de Control**: Lista de servidores activos, dirección de conexión asignada (`galigamesbackend.duckdns.org:<puerto>`), botón para copiar IP y acciones directas (Iniciar, Detener, Reiniciar, Consola y Eliminar).
- **Consola Terminal en Vivo**: Salida en tiempo real de registros Docker y envío de comandos RCON interactivos.
- **Billetera de Créditos**: Consulta de saldo disponible, paquetes de recarga rápida simulada (+6 €, +12 €, +24 €) y tabla histórica de movimientos.

## Conexión con el Backend

Por defecto, el frontend se comunica con la API en el Mini PC Linux:
```text
https://galigamesbackend.duckdns.org/api
```

Si deseas cambiar la URL de conexión durante desarrollo o pruebas locales, puedes ejecutar en la consola del navegador:
```javascript
localStorage.setItem('galigames_url_api', 'http://localhost:3000/api');
```
O volver a la URL de producción con:
```javascript
localStorage.removeItem('galigames_url_api');
```

## Despliegue en GitHub Pages

1. En el repositorio de GitHub (`https://github.com/Oierstg/galigames`), dirígete a **Settings** > **Pages**.
2. En **Build and deployment** > **Source**, selecciona `Deploy from a branch`.
3. Selecciona la rama `main` y la carpeta `/ (root)`.
4. Guarda los cambios. Tu web estará disponible en:
   ```text
   https://oierstg.github.io/galigames/
   ```