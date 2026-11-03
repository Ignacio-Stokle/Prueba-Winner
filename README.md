# WINNER (versión 2)

Contador de títulos de clubes. Vos cargás los datos en Google Sheets y el sitio los lee solo.

## Cómo usarlo
- Abrilo con Live Server o subilo a GitHub Pages: todo el sitio es `index.html`.
- Para copiarlo sobre tu repo: borrá los HTML viejos (`equipos.html`, `competiciones.html`, `inside-html/`) y los JS viejos (`datos.js`, `torneo.js`, `listado-equipos.js`), y copiá esta carpeta encima.

## Cargar datos (Google Sheets, sin tocar código)
- **Equipos**: columnas `Equipo` y `Región` (Argentina, Internacional u otra: aparece sola como pestaña).
- **Títulos**: columnas `Equipo`, `Competición`, `Año / temporada` y `Estado` (si dice "No" o "Pendiente", el título no se cuenta).
- **Competiciones** (opcional): `Competición`, `Orden`, `Logo`.
- Para que todos los escudos se vean del mismo tamaño, corré `python herramientas/normalizar-escudos.py IMG/escudos nuevo-club.png` cada vez que agregues uno (necesita `pip install pillow`). Los de esta carpeta ya están normalizados.
- Escudo nuevo: `IMG/escudos/<nombre-del-club>.png`, en minúsculas, sin tildes y con guiones (`Atlético Tucumán` es `atletico-tucuman.png`). Si falta, se muestran las iniciales.
- Competición nueva: aparece sola. Para ponerle logo y sigla, agregala en `JS/config.js`. Los logos deben tener fondo transparente; si no se leen en el tema oscuro, agregá una versión clara con `logoOscuro`.
- Ocultar una competición (hoy: Amateurismo): `competicionesOcultas` en `JS/config.js`. Sus títulos no se cuentan en ningún lado.
- Mirá `#/datos` (enlace "Revisar la carga de datos" al pie): te dice qué fila corregir.

## Archivos
- `JS/config.js` URLs de las hojas, competiciones, nombres de columnas.
- `JS/datos.js` descarga, copia local y cálculo de rankings.
- `JS/vistas.js` cada pantalla. `JS/componentes.js` piezas reutilizables.
- `JS/app.js` rutas, tema, actualización. `CSS/style.css` todo el diseño.
