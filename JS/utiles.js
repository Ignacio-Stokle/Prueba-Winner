/*
    ============================================================
    UTILIDADES GENERALES
    ============================================================

    Funciones pequeñas que usa el resto del proyecto:

      - normalizar(): deja un texto listo para comparar.
      - slug():       convierte un nombre en un identificador
                      ("Atlético Tucumán" -> "atletico-tucuman").
                      Es también el nombre del archivo del escudo.
      - h():          crea elementos HTML sin usar innerHTML
                      (así ningún dato de la hoja puede inyectar código).
      - icono():      íconos SVG del sitio.
*/
(function (W) {
    'use strict';

    /* ---------- TEXTO ---------- */

    function normalizar(valor) {
        return String(valor == null ? '' : valor)
            .trim()
            .toLocaleLowerCase('es')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ');
    }

    function slug(valor) {
        const s = normalizar(valor)
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return s || 'sin-nombre';
    }

    function plural(n, singular, varios) {
        return n + ' ' + (n === 1 ? singular : varios);
    }

    const formatoNumero = new Intl.NumberFormat('es-AR');
    const formatoHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

    function numero(n) { return formatoNumero.format(n); }
    function hora(fecha) { return formatoHora.format(fecha); }


    /* ---------- DOM ---------- */

    function agregar(padre, hijos) {
        for (const hijo of hijos) {
            if (hijo == null || hijo === false) continue;
            if (Array.isArray(hijo)) agregar(padre, hijo);
            else padre.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
        }
    }

    /*
        h("a", { class: "boton", href: "#/" }, "Texto", otroElemento)

        - Las propiedades que empiezan con "on" son eventos (onclick, oninput...).
        - true se escribe como atributo vacío (hidden: true).
        - null, undefined y false se ignoran.
    */
    function h(etiqueta, props, ...hijos) {
        const el = document.createElement(etiqueta);
        if (props) {
            for (const [clave, valor] of Object.entries(props)) {
                if (valor == null || valor === false) continue;
                if (clave === 'class') el.className = valor;
                else if (clave.startsWith('on') && typeof valor === 'function') {
                    el.addEventListener(clave.slice(2), valor);
                } else el.setAttribute(clave, valor === true ? '' : valor);
            }
        }
        agregar(el, hijos);
        return el;
    }


    /* ---------- ÍCONOS ---------- */

    const SVG_NS = 'http://www.w3.org/2000/svg';

    const ICONOS = {
        inicio: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h4.5v-6h4v6h4.5V10"/>',
        copa: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H4.5v2A3 3 0 0 0 8 11"/><path d="M16 6h3.5v2A3 3 0 0 1 16 11"/><path d="M12 14v4"/><path d="M8 20h8"/>',
        escudo: '<path d="M12 3 20 6v6c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V6z"/>',
        tabla: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14.5h18M9 9v11"/>',
        luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
        sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
        actualizar: '<path d="M20 11a8 8 0 0 0-14.3-4.2M4.5 4.5v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.2M19.5 19.5v-4h-4"/>',
        buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
        atras: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
        alerta: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
        ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
    };

    function icono(nombre, tam) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        const t = String(tam || 20);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', t);
        svg.setAttribute('height', t);
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.innerHTML = ICONOS[nombre] || '';   // solo textos fijos de este archivo
        return svg;
    }


    W.u = { normalizar, slug, plural, numero, hora, h, icono };

})(window.WINNER = window.WINNER || {});
