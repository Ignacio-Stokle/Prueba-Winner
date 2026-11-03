/*
    ============================================================
    COMPONENTES
    ============================================================

    Piezas de interfaz que se repiten en varias pantallas:

      - escudo():          escudo de un club (con iniciales si falta la imagen).
      - placa():           logo de una competición sobre su "placa".
      - medallas():        lista de años en los que un club fue campeón.
      - pestanasEnlaces(): pestañas que cambian de dirección.
      - pestanasBotones(): pestañas que cambian el contenido en el lugar.
      - tablaPosiciones(): la tabla de títulos (ordenable y filtrable).
      - aviso():           mensaje breve que aparece abajo.
*/
(function (W) {
    'use strict';

    const { h, icono, normalizar, numero } = W.u;


    /* ============================================================
       ESCUDOS Y LOGOS
       ============================================================ */

    const PALABRAS_MENORES = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e']);

    function iniciales(nombre) {
        const palabras = normalizar(nombre)
            .split(/[^a-z0-9]+/)
            .filter(p => p && !PALABRAS_MENORES.has(p));
        if (palabras.length === 0) return '?';
        if (palabras.length === 1) return palabras[0][0].toUpperCase();
        return (palabras[0][0] + palabras[1][0]).toUpperCase();
    }

    /* Un color estable para cada club, calculado a partir del nombre. */
    function tono(nombre) {
        let suma = 0;
        for (const letra of nombre) suma = (suma * 31 + letra.charCodeAt(0)) % 360;
        return suma;
    }

    /* El archivo del escudo se llama igual que el id del club:
       IMG/escudos/river-plate.png */
    function escudo(equipo, tam) {
        const caja = h('span', { class: 'escudo', style: `--t:${tam}px`, 'aria-hidden': 'true' });
        const imagen = h('img', {
            src: `IMG/escudos/${equipo.id}.png`,
            alt: '', width: tam, height: tam,
            loading: 'lazy', decoding: 'async'
        });
        imagen.addEventListener('error', () => {
            imagen.remove();
            caja.classList.add('escudo--iniciales');
            caja.style.setProperty('--tono', tono(equipo.nombre));
            caja.append(iniciales(equipo.nombre));
        }, { once: true });
        caja.append(imagen);
        return caja;
    }

    /* Logo de una competición sobre fondo transparente.
       Si hay una versión para el tema oscuro, se dibujan las dos y el CSS
       muestra la que corresponde. */
    function placa(competicion, tam) {
        const caja = h('span', { class: 'placa', style: `--t:${tam}px`, 'aria-hidden': 'true' });
        const logos = [];
        if (competicion.logo) logos.push(['', competicion.logo]);
        if (competicion.logo && competicion.logoOscuro) {
            logos[0][0] = ' logo--claro';
            logos.push([' logo--oscuro', competicion.logoOscuro]);
        } else if (!competicion.logo && competicion.logoOscuro) {
            logos.push(['', competicion.logoOscuro]);
        }

        const copa = () => icono('copa', Math.round(tam * 0.5));
        if (logos.length === 0) {
            caja.append(copa());
            return caja;
        }
        logos.forEach(([clase, ruta]) => {
            const imagen = h('img', { class: 'logo' + clase, src: ruta, alt: '', loading: 'lazy', decoding: 'async' });
            imagen.addEventListener('error', () => {
                imagen.remove();
                if (!caja.querySelector('img') && !caja.querySelector('svg')) caja.append(copa());
            }, { once: true });
            caja.append(imagen);
        });
        return caja;
    }

    function medallas(titulos, chica) {
        return h('ul', { class: 'medallas' + (chica ? ' medallas--chicas' : '') },
            titulos.map(t => h('li', { class: 'medalla' }, t.anio || 'Sin año')));
    }


    /* ============================================================
       PESTAÑAS
       ============================================================ */

    function pestanasEnlaces(etiqueta, items, activo) {
        return h('nav', { class: 'pestanas', 'aria-label': etiqueta },
            items.map(item => h('a', {
                class: 'pestana',
                href: item.href,
                'aria-current': item.id === activo ? 'page' : null
            }, item.texto, item.cuenta != null ? h('span', { class: 'pestana__cuenta' }, String(item.cuenta)) : null)));
    }

    function pestanasBotones(etiqueta, items, activo, alCambiar) {
        const lista = h('div', { class: 'pestanas', role: 'tablist', 'aria-label': etiqueta });

        function pintar(idActivo) {
            lista.replaceChildren(...items.map(item => h('button', {
                type: 'button',
                class: 'pestana',
                role: 'tab',
                'aria-selected': String(item.id === idActivo),
                tabindex: item.id === idActivo ? '0' : '-1',
                onclick: () => { pintar(item.id); alCambiar(item.id); },
                onkeydown: evento => {
                    const delta = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0;
                    if (!delta) return;
                    evento.preventDefault();
                    const siguiente = items[(items.findIndex(i => i.id === item.id) + delta + items.length) % items.length];
                    pintar(siguiente.id);
                    alCambiar(siguiente.id);
                    lista.querySelector('[aria-selected="true"]').focus();
                }
            }, item.texto)));
        }
        pintar(activo);
        return lista;
    }


    /* ============================================================
       TABLA DE POSICIONES
       ============================================================

       filas:   [{ equipo, puesto, total, porComp: Map(idCompeticion -> cantidad) }]
       comps:   competiciones que se muestran como columnas.

       Devuelve { nodo, filtrar(texto) }.
       "Pos" siempre es el puesto por títulos totales, aunque se ordene
       por otra columna.
    */
    function tablaPosiciones(opciones) {
        const { filas, comps, titulo } = opciones;
        const ordenable = !!opciones.ordenable;
        const limite = opciones.limite || 0;

        /* En el celular, la columna de títulos va primero (con su barra) y las
           competiciones quedan a la derecha para ver deslizando. */
        const movil = window.matchMedia('(max-width: 719px)');
        let totalPrimero = movil.matches;

        let orden = { col: 'total', dir: 'desc' };
        let consulta = '';
        const maximo = Math.max(1, ...filas.map(f => f.total));
        const encabezadoTabla = h('thead');
        const cuerpo = h('tbody');
        const encabezados = new Map();

        function comparar(a, b) {
            const signo = orden.dir === 'desc' ? -1 : 1;
            const nombre = a.equipo.nombre.localeCompare(b.equipo.nombre, 'es');
            if (orden.col === 'club') return signo * nombre;
            if (orden.col === 'total') return signo * (a.total - b.total) || nombre;
            const x = a.porComp.get(orden.col) || 0;
            const y = b.porComp.get(orden.col) || 0;
            return signo * (x - y) || (b.total - a.total) || nombre;
        }

        function fila(f, i) {
            const clase = f.puesto === 1 ? 'fila--lider' : f.puesto <= 3 ? 'fila--podio' : null;
            const celdaTotal = h('td', { class: 'c-total' },
                h('strong', null, String(f.total)),
                h('span', { class: 'barra', 'aria-hidden': 'true' },
                    h('i', { style: `--p:${(f.total / maximo).toFixed(4)};--i:${Math.min(i, 12)}` })));
            const celdasComps = comps.map(c => {
                const n = f.porComp.get(c.id) || 0;
                return h('td', { class: 'c-comp' + (n ? '' : ' c-comp--cero') }, n ? String(n) : '–');
            });
            return h('tr', { class: clase },
                h('td', { class: 'c-pos' }, String(f.puesto)),
                h('th', { scope: 'row', class: 'c-club' },
                    h('a', { class: 'club-enlace', href: '#/equipo/' + f.equipo.id },
                        escudo(f.equipo, 28), h('span', null, f.equipo.nombre))),
                totalPrimero ? [celdaTotal, celdasComps] : [celdasComps, celdaTotal]);
        }

        function pintar() {
            let lista = filas.slice().sort(comparar);
            if (consulta) lista = lista.filter(f => normalizar(f.equipo.nombre).includes(consulta));
            if (limite) lista = lista.slice(0, limite);

            cuerpo.replaceChildren(...lista.map(fila));
            if (lista.length === 0) {
                cuerpo.append(h('tr', null,
                    h('td', { class: 'tabla__vacio', colspan: String(3 + comps.length) },
                        'Ningún club de la tabla coincide con la búsqueda.')));
            }
            for (const [col, th] of encabezados) {
                th.setAttribute('aria-sort',
                    col === orden.col ? (orden.dir === 'desc' ? 'descending' : 'ascending') : 'none');
            }
        }

        function ordenarPor(col) {
            orden = orden.col === col
                ? { col, dir: orden.dir === 'desc' ? 'asc' : 'desc' }
                : { col, dir: col === 'club' ? 'asc' : 'desc' };
            pintar();
        }

        function encabezado(col, contenido, clase, ayuda) {
            const th = h('th', { scope: 'col', class: clase, title: ayuda || null },
                ordenable
                    ? h('button', {
                        type: 'button', class: 'orden',
                        'aria-label': 'Ordenar por ' + (ayuda || contenido),
                        onclick: () => ordenarPor(col)
                    }, contenido, h('span', { class: 'orden__flecha', 'aria-hidden': 'true' }))
                    : contenido);
            encabezados.set(col, th);
            return th;
        }

        function armarEncabezado() {
            encabezados.clear();
            const columnaTotal = encabezado('total', 'Títulos', 'c-total');
            const columnasComps = comps.map(c => encabezado(c.id, c.sigla, 'c-comp', c.nombre));
            encabezadoTabla.replaceChildren(h('tr', null,
                h('th', { scope: 'col', class: 'c-pos' }, 'Pos'),
                encabezado('club', 'Club', 'c-club'),
                totalPrimero ? [columnaTotal, columnasComps] : [columnasComps, columnaTotal]));
        }

        const tabla = h('table', { class: 'tabla' + (opciones.animar ? ' tabla--anima' : '') },
            h('caption', { class: 'solo-lectores' }, titulo || 'Tabla de títulos'),
            encabezadoTabla, cuerpo);

        const nodo = h('div', { class: 'tabla-caja' + (opciones.compacta ? ' tabla-caja--compacta' : '') }, tabla);

        armarEncabezado();
        pintar();

        /* Si se gira el celular o se cambia el tamaño de la ventana,
           se reordenan las columnas. */
        const alCambiarPantalla = () => {
            if (!nodo.isConnected) { movil.removeEventListener('change', alCambiarPantalla); return; }
            totalPrimero = movil.matches;
            armarEncabezado();
            pintar();
        };
        movil.addEventListener('change', alCambiarPantalla);

        return {
            nodo,
            filtrar(texto) { consulta = normalizar(texto); pintar(); }
        };
    }


    /* ============================================================
       AVISO BREVE
       ============================================================ */

    function aviso(texto) {
        const zona = document.getElementById('avisos');
        if (!zona) return;
        const caja = h('div', { class: 'aviso' }, texto);
        zona.append(caja);
        setTimeout(() => caja.remove(), 3600);
    }


    W.c = { escudo, placa, medallas, pestanasEnlaces, pestanasBotones, tablaPosiciones, aviso, numero };

})(window.WINNER = window.WINNER || {});
