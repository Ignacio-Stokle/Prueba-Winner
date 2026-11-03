/*
    ============================================================
    LECTOR DE CSV
    ============================================================

    Convierte el texto que devuelve Google Sheets en objetos.
    Reemplaza a PapaParse: son pocas líneas y así el sitio no
    depende de ninguna librería externa.

    Entiende:
      - campos entre comillas ("Boca, Juniors"),
      - comillas dobles escapadas ("dijo ""hola"""),
      - saltos de línea dentro de un campo entre comillas,
      - finales de línea \r\n y \n,
      - el carácter invisible (BOM) que a veces agrega Excel.
*/
(function (W) {
    'use strict';

    const { normalizar } = W.u;

    /* Texto -> lista de filas, cada fila es una lista de textos. */
    function parsear(texto) {
        if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);

        const filas = [];
        let fila = [];
        let campo = '';
        let entreComillas = false;
        let i = 0;
        const n = texto.length;

        while (i < n) {
            const c = texto[i];

            if (entreComillas) {
                if (c === '"') {
                    if (texto[i + 1] === '"') { campo += '"'; i += 2; continue; }
                    entreComillas = false;
                    i++;
                    continue;
                }
                campo += c;
                i++;
                continue;
            }

            if (c === '"' && campo === '') { entreComillas = true; i++; continue; }
            if (c === ',') { fila.push(campo); campo = ''; i++; continue; }
            if (c === '\r') { i++; continue; }
            if (c === '\n') {
                fila.push(campo);
                filas.push(fila);
                fila = [];
                campo = '';
                i++;
                continue;
            }
            campo += c;
            i++;
        }

        if (campo !== '' || fila.length > 0) {
            fila.push(campo);
            filas.push(fila);
        }
        return filas;
    }

    /*
        Texto -> { columnas, filas }

        - columnas: nombres de columna ya normalizados ("año / temporada" -> "ano / temporada").
        - filas: objetos { columnaNormalizada: valor }.
          Cada fila trae además __fila: el número de fila en la hoja
          (la fila 1 son los encabezados), útil para avisar qué corregir.
    */
    function aObjetos(texto) {
        const crudo = parsear(texto);
        if (crudo.length === 0) return { columnas: [], originales: [], filas: [] };

        const columnas = crudo[0].map(normalizar);
        const originales = crudo[0].map(texto => texto.trim());
        const filas = [];

        for (let r = 1; r < crudo.length; r++) {
            const celdas = crudo[r];
            if (!celdas.some(celda => celda.trim() !== '')) continue;

            const objeto = { __fila: r + 1 };
            columnas.forEach((nombre, c) => {
                if (nombre === '' || nombre in objeto) return;   // se usa la primera columna repetida
                objeto[nombre] = (celdas[c] || '').trim();
            });
            filas.push(objeto);
        }
        return { columnas, originales, filas };
    }

    W.csv = { parsear, aObjetos };

})(window.WINNER = window.WINNER || {});
