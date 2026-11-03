/*
    ============================================================
    CONFIGURACIÓN DE WINNER
    ============================================================

    Este es el único archivo que hace falta tocar para:

      - cambiar las hojas de Google Sheets (bloque "urls"),
      - agregar el logo de una competición nueva (bloque "competiciones"),
      - ocultar una competición (bloque "competicionesOcultas"),
      - aceptar otro nombre de columna en las hojas (bloque "columnas").

    Los clubes y los títulos NO se cargan acá: se cargan en Google Sheets.
*/
(function (W) {
    'use strict';

    W.config = {

        /* Las tres hojas publicadas como CSV
           (Archivo > Compartir > Publicar en la web > formato CSV). */
        urls: {
            equipos:
                'https://docs.google.com/spreadsheets/d/e/2PACX-1vSl6kWG9GH-wEc5pi80HOypcaqXwCxUwh34Dv9mB5QnuZcrVdsr1sz_eDzBMCJssT8aFF95uWpcCFj2/pub?gid=1209858657&single=true&output=csv',
            competiciones:
                'https://docs.google.com/spreadsheets/d/e/2PACX-1vSl6kWG9GH-wEc5pi80HOypcaqXwCxUwh34Dv9mB5QnuZcrVdsr1sz_eDzBMCJssT8aFF95uWpcCFj2/pub?gid=359945927&single=true&output=csv',
            titulos:
                'https://docs.google.com/spreadsheets/d/e/2PACX-1vSl6kWG9GH-wEc5pi80HOypcaqXwCxUwh34Dv9mB5QnuZcrVdsr1sz_eDzBMCJssT8aFF95uWpcCFj2/pub?gid=101958128&single=true&output=csv'
        },

        /* Si los datos guardados en el navegador tienen menos de estos
           segundos, no se vuelve a pedir la hoja al abrir el sitio. */
        segundosSinActualizar: 45,

        /* Clave con la que se guarda la copia local de los datos. */
        claveCache: 'winner:datos:v2',

        /* ----------------------------------------------------
           COMPETICIONES OCULTAS
           ----------------------------------------------------
           Las competiciones cuyo nombre empiece con alguno de estos
           textos se ignoran por completo: no aparecen en el sitio y
           sus títulos no se cuentan. No importan mayúsculas ni tildes.
        */
        competicionesOcultas: ['Amateurismo'],

        /* ----------------------------------------------------
           COMPETICIONES CONOCIDAS
           ----------------------------------------------------
           id:         nombre interno (se usa en la dirección de la página).
           nombre:     cómo se muestra en el sitio.
           alias:      otras formas de escribirla en la hoja de Títulos.
           sigla:      abreviatura para las columnas de la tabla.
           logo:       imagen para el tema claro (fondo transparente).
           logoOscuro: imagen para el tema oscuro (opcional: si falta,
                       se usa "logo" en los dos temas).

           Si en la hoja aparece una competición que no está acá,
           igual se muestra: solo le faltará el logo.
        */
        competiciones: [
            {
                id: 'liga-profesional',
                nombre: 'Liga Profesional',
                alias: ['LPF', 'Liga Profesional de Fútbol'],
                sigla: 'LPF',
                logo: 'IMG/assets/liga-profesional.png'
            },
            {
                id: 'primera-nacional',
                nombre: 'Primera Nacional',
                alias: ['Primera B Nacional', 'Nacional B'],
                sigla: 'PN',
                logo: 'IMG/assets/primera-nacional.png',
                logoOscuro: 'IMG/assets/primera-nacional-oscuro.png'
            },
            {
                id: 'copa-argentina',
                nombre: 'Copa Argentina',
                alias: [],
                sigla: 'CA',
                logo: 'IMG/assets/copa-argentina.png',
                logoOscuro: 'IMG/assets/copa-argentina-oscuro.png'
            },
            {
                id: 'supercopa',
                nombre: 'Supercopa Argentina',
                alias: ['Supercopa', 'Supercopa Argentina'],
                sigla: 'SC',
                logo: 'IMG/assets/supercopa-claro.png',
                logoOscuro: 'IMG/assets/supercopa.png'
            },
            {
                id: 'copa-libertadores',
                nombre: 'Copa Libertadores',
                alias: ['Libertadores', 'CONMEBOL Libertadores'],
                sigla: 'CL',
                logo: 'IMG/assets/copa-libertadores.png',
                logoOscuro: 'IMG/assets/copa-libertadores-oscuro.png'
            }
        ],

        /* ----------------------------------------------------
           REGIONES (columna "Región" de la hoja Equipos)
           ---------------------------------------------------- */
        regiones: {
            argentina: { nombre: 'Argentina', logo: 'IMG/assets/afa-logo.png' },
            internacional: { nombre: 'Internacional', logo: 'IMG/assets/conmebol-logo.png' }
        },

        /* ----------------------------------------------------
           NOMBRES DE COLUMNA ACEPTADOS
           ----------------------------------------------------
           No importan mayúsculas ni tildes: "Año" y "ANO" son lo mismo.
           Se usa la primera columna que exista y tenga contenido.
        */
        columnas: {
            equipo: ['Equipo', 'Nombre', 'Club'],
            region: ['Región', 'Categoría'],

            tituloEquipo: ['Equipo', 'Club'],
            tituloCompeticion: ['Competición', 'Torneo'],
            tituloAnio: ['Año / temporada', 'Año', 'Temporada'],
            tituloEstado: ['Estado', 'Confirmado', 'Situación'],

            competicion: ['Competición', 'Torneo', 'Nombre'],
            competicionOrden: ['Orden', 'Posición'],
            competicionLogo: ['Logo', 'Imagen']
        },

        /* Valores de la columna "Estado" que hacen que un título
           NO se cuente. Cualquier otro valor (o vacío) se cuenta. */
        estadosNoValidos: [
            'no', 'no confirmado', 'no confirmada', 'pendiente',
            'rechazado', 'rechazada', 'falso', 'false', '0',
            'anulado', 'anulada', 'descartado', 'descartada'
        ]
    };

})(window.WINNER = window.WINNER || {});
