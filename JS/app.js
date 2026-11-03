/*
    ============================================================
    APP: ARRANQUE Y NAVEGACIÓN
    ============================================================

    Este archivo conecta todo lo demás:

      - lee la dirección (#/equipo/river-plate) y elige la vista,
      - pide los datos y los actualiza en segundo plano,
      - maneja el tema claro/oscuro y el botón de actualizar.

    Flujo al abrir el sitio:

      1. Si hay datos guardados de una visita anterior, se muestran
         al instante.
      2. En paralelo se piden las hojas de Google Sheets.
      3. Si cambiaron, la pantalla se actualiza sola.
*/
(function (W) {
    'use strict';

    const { h, hora, icono } = W.u;
    const V = W.vistas;
    const D = W.datos;
    const C = W.c;
    const cfg = W.config;

    const principal = document.getElementById('contenido');
    const botonActualizar = document.getElementById('boton-actualizar');
    const botonTema = document.getElementById('boton-tema');
    const avisoFijo = document.getElementById('aviso-fijo');
    const pieLectura = document.getElementById('pie-lectura');

    const estado = { modelo: null, firma: '', fecha: null, cargando: false, error: null };
    let primeraVez = true;


    /* ============================================================
       RUTAS
       ============================================================ */

    const RUTAS = {
        '': V.inicio,
        competiciones: V.competiciones,
        competicion: V.competicion,
        equipos: V.equipos,
        equipo: V.equipo,
        tabla: V.tabla,
        datos: V.datos
    };

    /* Qué enlace del menú se marca en cada sección. */
    const SECCION_DEL_MENU = {
        '': 'inicio',
        competiciones: 'competiciones',
        competicion: 'competiciones',
        equipos: 'equipos',
        equipo: 'equipos',
        tabla: 'tabla'
    };

    function rutaActual() {
        const crudo = location.hash.replace(/^#\/?/, '').split('?')[0];
        const partes = crudo.split('/').filter(Boolean).map(parte => {
            try { return decodeURIComponent(parte); } catch (e) { return parte; }
        });
        return { seccion: partes[0] || '', partes: partes.slice(1) };
    }

    function marcarMenu(seccion) {
        const activa = SECCION_DEL_MENU[seccion];
        document.querySelectorAll('[data-seccion]').forEach(enlace => {
            if (enlace.dataset.seccion === activa) enlace.setAttribute('aria-current', 'page');
            else enlace.removeAttribute('aria-current');
        });
    }

    function mostrar(opciones) {
        const conservar = !!(opciones && opciones.conservarPosicion);
        const { seccion, partes } = rutaActual();
        const vista = RUTAS[seccion];

        let resultado;
        if (!vista) {
            resultado = V.noEncontrado();
        } else if (!estado.modelo) {
            resultado = estado.error
                ? V.errorDeDatos(estado.error, () => actualizar({ forzar: true }))
                : V.cargando();
        } else {
            try {
                resultado = vista(estado.modelo, partes, estado);
            } catch (error) {
                resultado = V.falloInterno(error);
            }
        }

        principal.replaceChildren(resultado.nodo);
        document.title = 'WINNER | ' + resultado.titulo;
        marcarMenu(seccion);

        if (!conservar) {
            window.scrollTo(0, 0);
            if (!primeraVez) principal.focus({ preventScroll: true });
        }
        primeraVez = false;
    }

    /* Redibuja después de recibir datos nuevos, sin interrumpir
       a quien está escribiendo en un buscador. */
    function repintar() {
        const activo = document.activeElement;
        if (activo && principal.contains(activo) && activo.matches('input, select')) {
            activo.addEventListener('blur', () => mostrar({ conservarPosicion: true }), { once: true });
            return;
        }
        mostrar({ conservarPosicion: true });
    }


    /* ============================================================
       DATOS
       ============================================================ */

    function actualizarPie() {
        pieLectura.textContent = estado.fecha
            ? 'Datos leídos de Google Sheets a las ' + hora(estado.fecha)
            : 'Leyendo los datos de Google Sheets…';
    }

    function mostrarAvisoFijo(texto) {
        avisoFijo.replaceChildren(
            icono('alerta', 18),
            h('span', null, texto),
            h('button', { type: 'button', class: 'aviso-fijo__boton', onclick: () => actualizar({ forzar: true }) }, 'Reintentar'));
        avisoFijo.hidden = false;
    }

    async function actualizar(opciones) {
        const forzar = !!(opciones && opciones.forzar);
        if (estado.cargando) return;

        estado.cargando = true;
        botonActualizar.classList.add('girando');
        botonActualizar.disabled = true;
        const habiaModelo = !!estado.modelo;

        try {
            const textos = await D.descargar({ forzar });
            const nueva = D.firma(textos);

            estado.error = null;
            estado.fecha = new Date();
            avisoFijo.hidden = true;
            D.guardarCache(textos);

            if (nueva !== estado.firma) {
                estado.modelo = D.construir(textos);
                estado.firma = nueva;
                repintar();
                if (habiaModelo) C.aviso('Se actualizaron los datos.');
            } else if (forzar) {
                C.aviso('Ya estás viendo los datos más recientes.');
            }
        } catch (error) {
            console.error('Error al cargar los datos:', error);
            estado.error = error;
            if (estado.modelo) {
                mostrarAvisoFijo((error.message || 'No se pudieron actualizar los datos.')
                    + ' Se muestran los últimos datos guardados.');
            } else {
                mostrar();
            }
        } finally {
            estado.cargando = false;
            botonActualizar.classList.remove('girando');
            botonActualizar.disabled = false;
            actualizarPie();
        }
    }


    /* ============================================================
       TEMA CLARO / OSCURO
       ============================================================ */

    function aplicarTema(tema, guardar) {
        document.documentElement.dataset.tema = tema;
        const oscuro = tema === 'oscuro';
        botonTema.replaceChildren(icono(oscuro ? 'sol' : 'luna', 20));
        botonTema.setAttribute('aria-label', oscuro ? 'Cambiar al tema claro' : 'Cambiar al tema oscuro');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', oscuro ? '#08120E' : '#0C3B2C');
        if (guardar) {
            try { localStorage.setItem('winner:tema', tema); } catch (e) { /* sin almacenamiento */ }
        }
    }


    /* ============================================================
       ARRANQUE
       ============================================================ */

    function iniciar() {
        document.querySelectorAll('[data-icono]').forEach(elemento => {
            elemento.prepend(icono(elemento.dataset.icono, 22));
        });

        aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro', false);

        botonTema.addEventListener('click', () => {
            aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro', true);
        });
        botonActualizar.addEventListener('click', () => actualizar({ forzar: true }));

        document.getElementById('saltar').addEventListener('click', evento => {
            evento.preventDefault();
            principal.focus();
        });

        const cache = D.leerCache();
        if (cache) {
            try {
                estado.modelo = D.construir(cache.textos);
                estado.firma = D.firma(cache.textos);
                estado.fecha = new Date(cache.t);
            } catch (error) {
                console.warn('La copia local de los datos no se pudo usar:', error);
                estado.modelo = null;
            }
        }

        actualizarPie();
        mostrar();

        const reciente = cache && (Date.now() - cache.t) < cfg.segundosSinActualizar * 1000;
        if (!reciente || !estado.modelo) actualizar();

        window.addEventListener('hashchange', () => mostrar());

        /* Si la pestaña estuvo mucho tiempo abierta, se actualiza al volver. */
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && estado.fecha &&
                Date.now() - estado.fecha.getTime() > 5 * 60 * 1000) {
                actualizar();
            }
        });
    }

    iniciar();

})(window.WINNER = window.WINNER || {});
