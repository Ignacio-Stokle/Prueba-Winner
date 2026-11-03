/*
    ============================================================
    VISTAS (las pantallas del sitio)
    ============================================================

    Cada vista es una función que recibe el modelo de datos y las
    partes de la dirección, y devuelve { titulo, nodo }:

      #/                           inicio
      #/competiciones              lista de competiciones
      #/competicion/<id>           ranking de campeones de una competición
      #/competicion/<id>/anios     campeón de cada edición
      #/equipos/<region>           clubes de una región
      #/equipo/<id>                perfil y vitrina de un club
      #/tabla/<region>             tabla de títulos completa
      #/datos                      revisión de la carga de datos

    app.js decide qué vista mostrar y la coloca en la página.
*/
(function (W) {
    'use strict';

    const { h, icono, plural, normalizar, numero, hora } = W.u;
    const C = W.c;


    /* ============================================================
       PIEZAS COMUNES
       ============================================================ */

    function volver(href, texto) {
        return h('a', { class: 'volver', href }, icono('atras', 18), texto);
    }

    function vacio(titulo, texto) {
        return h('div', { class: 'vacio' },
            h('h2', null, titulo),
            texto ? h('p', null, texto) : null);
    }

    function campoBusqueda(id, etiqueta, alEscribir) {
        return h('div', { class: 'filtro' },
            h('label', { for: id, class: 'solo-lectores' }, etiqueta),
            icono('buscar', 18),
            h('input', {
                id, type: 'search', placeholder: etiqueta,
                autocomplete: 'off', spellcheck: 'false',
                oninput: evento => alEscribir(evento.target.value)
            }));
    }

    function pestanasRegion(m, activo, ruta) {
        return C.pestanasEnlaces('Región', m.regiones.map(region => ({
            id: region.id,
            texto: region.nombre,
            href: `#/${ruta}/${region.id}`,
            cuenta: ruta === 'equipos' ? region.equipos.length : null
        })), activo);
    }

    function regionPedida(m, id) {
        return m.regionPorId.get(id) || m.regiones[0] || null;
    }

    /* Solo se ve en el celular (lo decide el CSS). */
    function notaDeslizar() {
        return h('p', { class: 'nota nota--deslizar' },
            'Deslizá la tabla hacia la derecha para ver los títulos de cada competición.');
    }

    function noEncontrado() {
        return {
            titulo: 'Página no encontrada',
            nodo: h('section', { class: 'pagina pagina--angosta' },
                h('h1', null, 'No encontramos esa página'),
                h('p', { class: 'bajada' }, 'La dirección no existe o el club o la competición cambió de nombre en la hoja.'),
                h('a', { class: 'boton', href: '#/' }, 'Ir al inicio'))
        };
    }


    /* ============================================================
       INICIO
       ============================================================ */

    function buscadorClubes(m) {
        let activo = -1;
        let opciones = [];
        let tocando = false;   // hay un dedo o puntero apoyado en la lista

        const input = h('input', {
            id: 'buscar-club', type: 'search',
            placeholder: 'Boca, River, Estudiantes…',
            autocomplete: 'off', spellcheck: 'false',
            role: 'combobox', 'aria-expanded': 'false',
            'aria-controls': 'sugerencias', 'aria-autocomplete': 'list'
        });
        const lista = h('ul', { class: 'sugerencias', id: 'sugerencias', role: 'listbox', hidden: true });

        function cerrar() {
            lista.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            activo = -1;
        }

        function ir(equipo) {
            location.hash = '#/equipo/' + equipo.id;
        }

        function marcar(indice) {
            activo = indice;
            opciones.forEach((li, i) => li.setAttribute('aria-selected', String(i === indice)));
            if (indice >= 0) input.setAttribute('aria-activedescendant', opciones[indice].id);
            else input.removeAttribute('aria-activedescendant');
        }

        function actualizar() {
            const q = normalizar(input.value);
            lista.replaceChildren();
            opciones = [];
            activo = -1;
            if (!q) { cerrar(); return; }

            const hallados = m.equipos
                .map(equipo => ({ equipo, pos: normalizar(equipo.nombre).indexOf(q) }))
                .filter(x => x.pos >= 0)
                .sort((a, b) => a.pos - b.pos || b.equipo.total - a.equipo.total ||
                    a.equipo.nombre.localeCompare(b.equipo.nombre, 'es'))
                .slice(0, 6);

            if (hallados.length === 0) {
                lista.append(h('li', { class: 'sugerencia sugerencia--vacia', role: 'presentation' },
                    'No encontramos ese club.'));
            }
            hallados.forEach(({ equipo }, i) => {
                const li = h('li', {
                    id: 'sugerencia-' + i, class: 'sugerencia', role: 'option', 'aria-selected': 'false',
                    onmousedown: evento => evento.preventDefault(),   // el buscador conserva el foco
                    onclick: () => ir(equipo)
                },
                    C.escudo(equipo, 32),
                    h('span', { class: 'sugerencia__nombre' }, equipo.nombre),
                    h('span', { class: 'sugerencia__cuenta' }, plural(equipo.total, 'título', 'títulos')));
                opciones.push(li);
                lista.append(li);
            });
            lista.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            input._hallados = hallados.map(x => x.equipo);
        }

        input.addEventListener('input', actualizar);
        input.addEventListener('focus', () => {
            actualizar();
            /* En el celular, sube el buscador para que la lista quede
               visible por encima del teclado. */
            if (window.matchMedia('(max-width: 719px)').matches) {
                setTimeout(() => contenedor.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250);
            }
        });
        /* En pantallas táctiles, tocar una opción le quita el foco al campo
           antes de que llegue el toque: por eso no se cierra mientras se toca. */
        input.addEventListener('blur', () => setTimeout(() => {
            if (!tocando && document.activeElement !== input) cerrar();
        }, 150));
        input.addEventListener('keydown', evento => {
            const n = opciones.length;
            if (evento.key === 'ArrowDown' && n) {
                evento.preventDefault();
                marcar((activo + 1) % n);
            } else if (evento.key === 'ArrowUp' && n) {
                evento.preventDefault();
                marcar((activo - 1 + n) % n);
            } else if (evento.key === 'Enter' && n) {
                evento.preventDefault();
                ir(input._hallados[activo >= 0 ? activo : 0]);
            } else if (evento.key === 'Escape') {
                cerrar();
            }
        });

        const contenedor = h('div', { class: 'buscador' },
            h('label', { for: 'buscar-club', class: 'buscador__etiqueta' }, 'Buscar un club'),
            h('div', { class: 'buscador__campo' }, icono('buscar', 20), input),
            lista);

        contenedor.addEventListener('pointerdown', () => {
            tocando = true;
            const soltar = () => { tocando = false; };
            document.addEventListener('pointerup', soltar, { once: true });
            document.addEventListener('pointercancel', soltar, { once: true });
        });

        return contenedor;
    }

    function inicio(m) {
        const regionesConTabla = m.regiones.filter(r => r.filas.length > 0);

        const marcador = h('dl', { class: 'marcador' },
            ...[
                ['Clubes', m.resumen.clubes],
                ['Competiciones', m.resumen.competiciones],
                ['Títulos', m.resumen.titulos]
            ].map(([texto, valor]) => h('div', { class: 'marcador__fila' },
                h('dt', null, texto),
                h('dd', null, numero(valor)))));

        const portada = h('section', { class: 'portada' },
            h('div', { class: 'portada__texto' },
                h('h1', null, 'Cuántos títulos ganó cada club'),
                h('p', { class: 'bajada' },
                    'Palmarés del fútbol argentino y sudamericano, año por año.'),
                buscadorClubes(m)),
            marcador);

        /* ---------- Tabla de títulos ---------- */

        const bloqueTabla = h('section', { class: 'bloque', 'aria-labelledby': 'titulo-tabla' });
        const cabecera = h('div', { class: 'bloque__cabecera' }, h('h2', { id: 'titulo-tabla' }, 'Tabla de títulos'));
        const panel = h('div', { id: 'panel-tabla', role: 'tabpanel' });
        const enlace = h('a', { class: 'bloque__enlace' }, 'Ver la tabla completa');

        function pintarRegion(region) {
            const tabla = C.tablaPosiciones({
                filas: region.filas, comps: region.comps, limite: 10,
                animar: true, compacta: true,
                titulo: 'Los 10 clubes con más títulos de ' + region.nombre
            });
            panel.replaceChildren(tabla.nodo);
            enlace.href = '#/tabla/' + region.id;
            enlace.textContent = `Ver los ${region.filas.length} clubes de ${region.nombre}`;
        }

        if (regionesConTabla.length === 0) {
            bloqueTabla.append(cabecera, vacio('Todavía no hay títulos cargados',
                'Cuando se carguen títulos en la hoja, la tabla aparece acá.'));
        } else {
            if (regionesConTabla.length > 1) {
                cabecera.append(C.pestanasBotones('Región de la tabla',
                    regionesConTabla.map(r => ({ id: r.id, texto: r.nombre })),
                    regionesConTabla[0].id,
                    id => pintarRegion(m.regionPorId.get(id))));
            }
            pintarRegion(regionesConTabla[0]);
            bloqueTabla.append(cabecera, panel, notaDeslizar(), enlace);
        }

        /* ---------- Competiciones ---------- */

        const bloqueComps = h('section', { class: 'bloque', 'aria-labelledby': 'titulo-comps' },
            h('div', { class: 'bloque__cabecera' },
                h('h2', { id: 'titulo-comps' }, 'Competiciones'),
                h('a', { class: 'bloque__enlace', href: '#/competiciones' }, 'Ver todas')),
            m.competiciones.length === 0
                ? vacio('Todavía no hay competiciones cargadas')
                : h('ul', { class: 'fila-placas' }, m.competiciones.map(comp => h('li', null,
                    h('a', { class: 'placa-enlace', href: '#/competicion/' + comp.id },
                        C.placa(comp, 64),
                        h('span', { class: 'placa-enlace__nombre' }, comp.nombre),
                        h('span', { class: 'placa-enlace__dato' },
                            plural(comp.ediciones, 'edición', 'ediciones')))))));

        return {
            titulo: 'Palmarés del fútbol argentino y sudamericano',
            nodo: h('div', { class: 'pagina' }, portada, bloqueTabla, bloqueComps)
        };
    }


    /* ============================================================
       COMPETICIONES
       ============================================================ */

    function competiciones(m) {
        const nodo = h('section', { class: 'pagina' },
            h('h1', null, 'Competiciones'),
            h('p', { class: 'bajada' }, 'Elegí una para ver quién la ganó más veces y quién ganó cada edición.'),
            m.competiciones.length === 0
                ? vacio('Todavía no hay competiciones cargadas')
                : h('ul', { class: 'comp-grilla' }, m.competiciones.map(comp => {
                    const lider = comp.ranking[0];
                    const ultimo = comp.ultimo;
                    return h('li', null, h('a', { class: 'comp-tarjeta', href: '#/competicion/' + comp.id },
                        C.placa(comp, 80),
                        h('div', { class: 'comp-tarjeta__texto' },
                            h('h2', null, comp.nombre),
                            h('p', null, comp.ediciones
                                ? `${plural(comp.ediciones, 'edición', 'ediciones')} y ${plural(comp.ranking.length, 'campeón distinto', 'campeones distintos')}`
                                : 'Sin títulos cargados'),
                            ultimo ? h('p', { class: 'comp-tarjeta__ultimo' },
                                'Último campeón cargado: ', h('strong', null, ultimo.equipo.nombre),
                                ultimo.anio ? ` (${ultimo.anio})` : '') : null,
                            lider && lider.puesto === 1 && comp.ranking.length > 1
                                ? h('p', { class: 'comp-tarjeta__ultimo' }, 'Más títulos: ',
                                    h('strong', null, lider.equipo.nombre), ` (${lider.cantidad})`)
                                : null)));
                }))
        );
        return { titulo: 'Competiciones', nodo };
    }


    /* ============================================================
       UNA COMPETICIÓN
       ============================================================ */

    function competicion(m, partes) {
        const comp = m.compPorId.get(partes[0]);
        if (!comp) return noEncontrado();
        const vista = partes[1] === 'anios' ? 'anios' : 'tabla';

        const lideres = comp.ranking.filter(g => g.puesto === 1);
        const lider = lideres[0];

        const datos = h('dl', { class: 'datos' },
            h('div', { class: 'dato' }, h('dt', null, 'Ediciones'), h('dd', null, numero(comp.ediciones))),
            h('div', { class: 'dato' }, h('dt', null, 'Campeones distintos'), h('dd', null, numero(comp.ranking.length))),
            h('div', { class: 'dato dato--lider' },
                h('dt', null, 'Más títulos'),
                h('dd', null,
                    lider ? C.escudo(lider.equipo, 32) : null,
                    h('span', null, lider
                        ? lider.equipo.nombre + (lideres.length > 1 ? ` y ${lideres.length - 1} más` : '')
                        : 'Sin datos'),
                    lider ? h('span', { class: 'dato__cuenta' }, String(lider.cantidad)) : null)));

        const cabecera = h('header', { class: 'encabezado' },
            volver('#/competiciones', 'Competiciones'),
            h('div', { class: 'titular' }, C.placa(comp, 88), h('h1', null, comp.nombre)),
            datos);

        const pestanas = C.pestanasEnlaces('Vista de la competición', [
            { id: 'tabla', texto: 'Ranking de campeones', href: '#/competicion/' + comp.id },
            { id: 'anios', texto: 'Año por año', href: '#/competicion/' + comp.id + '/anios' }
        ], vista);

        let contenido;

        if (comp.titulos.length === 0) {
            contenido = vacio('Todavía no hay campeones cargados', 'Esta competición aún no tiene títulos confirmados.');

        } else if (vista === 'anios') {
            contenido = h('ol', { class: 'cronologia' }, comp.porAnio.map(anio => h('li', { class: 'cronologia__fila' },
                h('span', { class: 'cronologia__anio' }, anio.etiqueta),
                h('ul', { class: 'cronologia__campeones' }, anio.campeones.map(equipo => h('li', null,
                    h('a', { class: 'club-enlace', href: '#/equipo/' + equipo.id },
                        C.escudo(equipo, 32), h('span', null, equipo.nombre))))))));

        } else {
            const maximo = comp.ranking[0].cantidad;
            const lista = h('ol', { class: 'posiciones' });

            const pintar = consulta => {
                const q = normalizar(consulta);
                const filas = comp.ranking.filter(g => !q || normalizar(g.equipo.nombre).includes(q));
                lista.replaceChildren(...filas.map(g => h('li', {
                    class: 'posicion' + (g.puesto === 1 ? ' posicion--lider' : g.puesto <= 3 ? ' posicion--podio' : '')
                },
                    h('span', { class: 'posicion__puesto' }, String(g.puesto)),
                    h('div', { class: 'posicion__club' },
                        h('a', { class: 'club-enlace', href: '#/equipo/' + g.equipo.id },
                            C.escudo(g.equipo, 36), h('span', null, g.equipo.nombre)),
                        C.medallas(g.titulos, true)),
                    h('div', { class: 'posicion__total' },
                        h('strong', null, String(g.cantidad)),
                        h('span', { class: 'barra', 'aria-hidden': 'true' },
                            h('i', { style: `--p:${(g.cantidad / maximo).toFixed(4)}` }))))));
                if (filas.length === 0) {
                    lista.append(h('li', { class: 'posiciones__vacio' }, 'Ningún campeón coincide con la búsqueda.'));
                }
            };
            pintar('');
            contenido = h('div', null,
                comp.ranking.length > 8 ? campoBusqueda('filtro-campeones', 'Buscar un campeón', pintar) : null,
                lista);
        }

        return {
            titulo: comp.nombre,
            nodo: h('section', { class: 'pagina' }, cabecera, pestanas, contenido)
        };
    }


    /* ============================================================
       EQUIPOS DE UNA REGIÓN
       ============================================================ */

    function equipos(m, partes) {
        const region = regionPedida(m, partes[0]);
        if (!region) {
            return {
                titulo: 'Equipos',
                nodo: h('section', { class: 'pagina' }, h('h1', null, 'Equipos'),
                    vacio('Todavía no hay clubes cargados', 'Cuando se carguen en la hoja Equipos, aparecen acá.'))
            };
        }

        let consulta = '';
        let orden = 'az';
        const grilla = h('ul', { class: 'escudos' });

        function pintar() {
            const q = normalizar(consulta);
            const lista = region.equipos
                .filter(e => !q || normalizar(e.nombre).includes(q))
                .sort((a, b) => orden === 'titulos'
                    ? b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')
                    : a.nombre.localeCompare(b.nombre, 'es'));

            grilla.replaceChildren(...lista.map(equipo => h('li', null,
                h('a', {
                    class: 'club-ficha', href: '#/equipo/' + equipo.id,
                    'aria-label': `${equipo.nombre}, ${plural(equipo.total, 'título', 'títulos')}`
                },
                    C.escudo(equipo, 72),
                    h('span', { class: 'club-ficha__nombre' }, equipo.nombre),
                    equipo.total > 0 ? h('span', { class: 'insignia', 'aria-hidden': 'true' }, String(equipo.total)) : null))));

            if (lista.length === 0) {
                grilla.append(h('li', { class: 'escudos__vacio' },
                    `Ningún club coincide con “${consulta.trim()}”. Probá con otro nombre.`));
            }
        }
        pintar();

        const herramientas = h('div', { class: 'herramientas' },
            campoBusqueda('filtro-clubes', 'Buscar un club', texto => { consulta = texto; pintar(); }),
            h('div', { class: 'selector' },
                h('label', { for: 'orden-clubes' }, 'Ordenar'),
                h('select', {
                    id: 'orden-clubes',
                    onchange: evento => { orden = evento.target.value; pintar(); }
                },
                    h('option', { value: 'az' }, 'Por nombre'),
                    h('option', { value: 'titulos' }, 'Por títulos'))));

        return {
            titulo: 'Equipos de ' + region.nombre,
            nodo: h('section', { class: 'pagina' },
                h('h1', null, 'Equipos'),
                h('p', { class: 'bajada' }, 'El número amarillo indica la cantidad de títulos de cada club.'),
                pestanasRegion(m, region.id, 'equipos'),
                herramientas,
                grilla)
        };
    }


    /* ============================================================
       PERFIL DE UN CLUB
       ============================================================ */

    function equipo(m, partes) {
        const club = m.equipoPorId.get(partes[0]);
        if (!club) return noEncontrado();

        const region = club.region;
        const empatado = region && club.puesto != null &&
            region.filas.filter(f => f.puesto === club.puesto).length > 1;

        const comps = m.competiciones.filter(c => club.porComp.has(c.id));

        const encabezado = h('header', { class: 'encabezado ficha' },
            volver(region ? '#/equipos/' + region.id : '#/competiciones', region ? 'Equipos de ' + region.nombre : 'Competiciones'),
            h('div', { class: 'ficha__cuerpo' },
                C.escudo(club, 120),
                h('div', { class: 'ficha__texto' },
                    h('h1', null, club.nombre),
                    region ? h('p', { class: 'ficha__region' }, region.nombre) : null,
                    club.puesto != null && region
                        ? h('p', { class: 'ficha__puesto' },
                            `${club.puesto}º en la tabla de títulos de ${region.nombre}${empatado ? ' (igualado)' : ''}. `,
                            h('a', { href: '#/tabla/' + region.id }, 'Ver la tabla'))
                        : null),
                h('p', { class: 'ficha__total' },
                    h('strong', null, String(club.total)),
                    h('span', null, club.total === 1 ? 'título' : 'títulos'))));

        const vitrina = comps.length === 0
            ? vacio('Todavía no tiene títulos', 'Este club no tiene títulos confirmados en la hoja.')
            : h('div', { class: 'vitrina' }, comps.map(comp => {
                const lista = club.porComp.get(comp.id);
                return h('section', { class: 'estante', 'aria-labelledby': 'estante-' + comp.id },
                    h('header', { class: 'estante__cabecera' },
                        C.placa(comp, 48),
                        h('h2', { id: 'estante-' + comp.id },
                            h('a', { href: '#/competicion/' + comp.id }, comp.nombre)),
                        h('p', { class: 'estante__cuenta' }, plural(lista.length, 'título', 'títulos'))),
                    C.medallas(lista, false));
            }));

        return {
            titulo: club.nombre,
            nodo: h('section', { class: 'pagina' }, encabezado, vitrina)
        };
    }


    /* ============================================================
       TABLA DE TÍTULOS COMPLETA
       ============================================================ */

    function tabla(m, partes) {
        const region = regionPedida(m, partes[0]);
        if (!region) {
            return {
                titulo: 'Tabla de títulos',
                nodo: h('section', { class: 'pagina' }, h('h1', null, 'Tabla de títulos'),
                    vacio('Todavía no hay datos', 'Cuando se carguen clubes y títulos, la tabla aparece acá.'))
            };
        }

        const cuerpo = region.filas.length === 0
            ? vacio('Todavía no hay títulos', `Ningún club de ${region.nombre} tiene títulos confirmados.`)
            : (() => {
                const t = C.tablaPosiciones({
                    filas: region.filas, comps: region.comps, ordenable: true,
                    titulo: 'Tabla de títulos de ' + region.nombre
                });
                return h('div', null,
                    campoBusqueda('filtro-tabla', 'Buscar un club', t.filtrar),
                    t.nodo,
                    notaDeslizar(),
                    h('p', { class: 'nota' },
                        'Tocá el encabezado de una columna para ordenar. Siglas: ',
                        region.comps.map((c, i) => [i ? ', ' : '', h('abbr', { title: c.nombre }, c.sigla), ' ', c.nombre]),
                        '.'));
            })();

        return {
            titulo: 'Tabla de títulos de ' + region.nombre,
            nodo: h('section', { class: 'pagina' },
                h('h1', null, 'Tabla de títulos'),
                h('p', { class: 'bajada' },
                    `${plural(region.filas.length, 'club', 'clubes')} de ${region.nombre} con al menos un título, `
                    + `y ${plural(region.totalTitulos, 'título', 'títulos')} en total.`),
                pestanasRegion(m, region.id, 'tabla'),
                cuerpo)
        };
    }


    /* ============================================================
       REVISIÓN DE DATOS
       ============================================================
       Pensada para quien carga la hoja: muestra qué corregir
       para que todo se cuente bien. */

    function datos(m, partes, estado) {
        const av = m.avisos;

        function seccion(titulo, ayuda, items, nivel) {
            const ok = items.length === 0;
            return h('section', { class: 'revision revision--' + (ok ? 'ok' : nivel || 'aviso') },
                h('header', { class: 'revision__cabecera' },
                    icono(ok ? 'ok' : 'alerta', 22),
                    h('h2', null, titulo),
                    h('span', { class: 'revision__cuenta' }, ok ? 'En orden' : String(items.length))),
                ok ? null : h('p', { class: 'revision__ayuda' }, ayuda),
                ok ? null : h('ul', { class: 'revision__lista' }, items.map(texto => h('li', null, texto))));
        }

        const escudosCaja = h('section', { class: 'revision revision--pendiente' },
            h('header', { class: 'revision__cabecera' },
                icono('alerta', 22), h('h2', null, 'Escudos que faltan'),
                h('span', { class: 'revision__cuenta' }, '…')),
            h('p', { class: 'revision__ayuda' }, 'Revisando las imágenes de IMG/escudos…'));

        function revisarEscudos() {
            const revisar = m.equipos.filter(e => !e.huerfano);
            Promise.all(revisar.map(club => new Promise(resolver => {
                const imagen = new Image();
                imagen.onload = () => resolver(null);
                imagen.onerror = () => resolver(club);
                imagen.src = `IMG/escudos/${club.id}.png`;
            }))).then(resultado => {
                if (!escudosCaja.isConnected) return;
                const faltan = resultado.filter(Boolean);
                const nueva = seccion('Escudos que faltan',
                    'Subí la imagen a IMG/escudos con exactamente este nombre. Mientras tanto se muestran las iniciales.',
                    faltan.map(club => `${club.nombre}: IMG/escudos/${club.id}.png`));
                escudosCaja.replaceWith(nueva);
            });
        }
        setTimeout(revisarEscudos, 0);

        const secciones = [
            seccion('Columnas que no se encontraron',
                'Revisá los encabezados de la primera fila de cada hoja, o agregá el nombre que usás en JS/config.js.',
                av.columnas.map(c => `Hoja ${c.hoja}: falta la columna “${c.falta}”${c.obligatoria ? ' (obligatoria)' : ''}.`),
                'error'),
            seccion('Clubes con títulos que no están en la hoja Equipos',
                'Sus títulos se cuentan en las competiciones, pero no aparecen en las listas ni en la tabla por región. Agregalos a la hoja Equipos o corregí cómo está escrito el nombre.',
                [...av.equiposSinHoja.values()].map(e => `${e.nombre}: filas ${e.filas.join(', ')} de Títulos.`),
                'error'),
            seccion('Títulos sin club o sin competición',
                'Estas filas se ignoran porque les falta un dato imprescindible.',
                av.incompletos.map(t => `Fila ${t.fila} de Títulos: ${t.equipo ? 'club ' + t.equipo : 'sin club'}, ${t.competicion ? 'competición ' + t.competicion : 'sin competición'}.`),
                'error'),
            seccion('Posibles títulos duplicados',
                'Mismo club, competición y año en más de una fila. Si es correcto (por ejemplo, Apertura y Clausura del mismo año), escribilo en el año para distinguirlos.',
                av.duplicados.map(d => `${d.equipo}, ${d.competicion}, ${d.anio}: filas ${d.filas.join(' y ')} de Títulos.`)),
            seccion('Títulos sin año',
                'Se cuentan, pero no se pueden ordenar ni contar como edición.',
                av.sinAnio.map(t => `Fila ${t.fila} de Títulos: ${t.equipo.nombre}, ${t.competicion.nombre}.`)),
            seccion('Clubes sin región',
                'Aparecen en una región llamada “Sin región”. Completá la columna Región en la hoja Equipos.',
                av.sinRegion.map(c => `Fila ${c.fila} de Equipos: ${c.nombre}.`)),
            seccion('Clubes repetidos en la hoja Equipos',
                'Se usó solo la primera fila de cada club.',
                av.equiposRepetidos.map(c => `Fila ${c.fila} de Equipos: ${c.nombre}.`)),
            seccion('Competiciones nuevas sin configurar',
                'Se muestran sin logo ni sigla propia. Podés agregarlas en JS/config.js.',
                m.competiciones.filter(c => !c.conocida).map(c => `${c.nombre} (sigla ${c.sigla}).`)),
            escudosCaja
        ];

        const pendientes = av.pendientes.length === 0 ? null : h('section', { class: 'revision revision--info' },
            h('header', { class: 'revision__cabecera' },
                icono('alerta', 22), h('h2', null, 'Títulos sin confirmar'),
                h('span', { class: 'revision__cuenta' }, String(av.pendientes.length))),
            h('p', { class: 'revision__ayuda' }, 'No se cuentan en ningún ranking hasta que cambie su estado.'),
            h('ul', { class: 'revision__lista' }, av.pendientes.map(t =>
                h('li', null, `Fila ${t.fila}: ${t.equipo.nombre}, ${t.competicion.nombre}${t.anio ? ', ' + t.anio : ''}.`))));

        const ocultas = av.ocultos.competiciones.size === 0 ? null : h('section', { class: 'revision revision--info' },
            h('header', { class: 'revision__cabecera' },
                icono('alerta', 22), h('h2', null, 'Competiciones ocultas'),
                h('span', { class: 'revision__cuenta' }, String(av.ocultos.competiciones.size))),
            h('p', { class: 'revision__ayuda' },
                `Se ignoran a propósito (${plural(av.ocultos.titulos, 'título', 'títulos')}): ${[...av.ocultos.competiciones].join(', ')}. `
                + 'Se configuran en JS/config.js, en “competicionesOcultas”.'));

        const hojas = h('dl', { class: 'hojas' },
            Object.entries(m.hojas).map(([nombre, columnas]) => h('div', null,
                h('dt', null, 'Hoja ' + nombre),
                h('dd', null, columnas.length ? columnas.join(', ') : 'No se leyeron columnas'))));

        return {
            titulo: 'Revisión de datos',
            nodo: h('section', { class: 'pagina pagina--angosta' },
                h('h1', null, 'Revisión de datos'),
                h('p', { class: 'bajada' },
                    `Se leyeron ${plural(m.resumen.clubes, 'club', 'clubes')}, ${plural(m.resumen.competiciones, 'competición', 'competiciones')} `
                    + `y ${plural(m.resumen.titulos, 'título confirmado', 'títulos confirmados')}`
                    + (estado.fecha ? `. Última lectura a las ${hora(estado.fecha)}` : '.')),
                h('p', { class: 'nota' }, 'Esta página es para quien carga la hoja de Google Sheets. Si algo está mal escrito, acá se ve qué fila corregir.'),
                ...secciones, pendientes, ocultas,
                h('section', { class: 'revision revision--info' },
                    h('header', { class: 'revision__cabecera' }, h('h2', null, 'Columnas detectadas')),
                    hojas))
        };
    }


    /* ============================================================
       CARGANDO Y ERRORES
       ============================================================ */

    function cargando() {
        const esqueleto = n => h('div', { class: 'esqueleto' }, Array.from({ length: n }, () => h('span', null)));
        return {
            titulo: 'Cargando…',
            nodo: h('section', { class: 'pagina', 'aria-busy': 'true' },
                h('p', { class: 'solo-lectores', role: 'status' }, 'Cargando los datos…'),
                h('div', { class: 'esqueleto esqueleto--titulo' }, h('span', null)),
                esqueleto(8))
        };
    }

    function errorDeDatos(error, reintentar) {
        return {
            titulo: 'No se pudieron cargar los datos',
            nodo: h('section', { class: 'pagina pagina--angosta' },
                h('div', { class: 'falla' },
                    icono('alerta', 36),
                    h('h1', null, 'No pudimos cargar los datos'),
                    h('p', { class: 'bajada' }, (error && error.message) || 'Ocurrió un error inesperado.'),
                    h('p', null, 'Qué conviene revisar:'),
                    h('ul', { class: 'pasos' },
                        h('li', null, 'Que las tres hojas estén publicadas en formato CSV (Archivo, Compartir, Publicar en la web).'),
                        h('li', null, 'Que las direcciones de JS/config.js sean las de esas publicaciones.'),
                        h('li', null, 'Que haya conexión a Internet.')),
                    h('button', { type: 'button', class: 'boton', onclick: reintentar },
                        icono('actualizar', 18), 'Reintentar')))
        };
    }

    function falloInterno(error) {
        console.error(error);
        return {
            titulo: 'Error',
            nodo: h('section', { class: 'pagina pagina--angosta' },
                h('div', { class: 'falla' },
                    icono('alerta', 36),
                    h('h1', null, 'Algo salió mal al mostrar esta página'),
                    h('p', { class: 'bajada' }, 'Volvé al inicio e intentá de nuevo. Si se repite, revisá la consola del navegador.'),
                    h('a', { class: 'boton', href: '#/' }, 'Ir al inicio')))
        };
    }


    W.vistas = {
        inicio, competiciones, competicion, equipos, equipo, tabla, datos,
        noEncontrado, cargando, errorDeDatos, falloInterno
    };

})(window.WINNER = window.WINNER || {});
