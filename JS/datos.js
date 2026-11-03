/*
    ============================================================
    DATOS
    ============================================================

    Este archivo hace tres cosas:

      1. descargar():  pide las tres hojas de Google Sheets (CSV).
      2. cache:        guarda una copia en el navegador para que el
                       sitio abra al instante la próxima vez.
      3. construir():  convierte el texto de las hojas en un "modelo":
                       clubes, competiciones, rankings y avisos sobre
                       datos que conviene revisar en la hoja.

    Las pantallas (vistas.js) solo leen el modelo; nunca tocan las hojas.
*/
(function (W) {
    'use strict';

    const { normalizar, slug } = W.u;
    const cfg = W.config;

    const NOMBRE_HOJA = { equipos: 'Equipos', competiciones: 'Competiciones', titulos: 'Títulos' };

    /* Los nombres de columna aceptados se comparan ya normalizados. */
    const ALIAS = {};
    for (const [clave, lista] of Object.entries(cfg.columnas)) ALIAS[clave] = lista.map(normalizar);
    const NO_VALIDOS = new Set(cfg.estadosNoValidos.map(normalizar));
    const OCULTAS = (cfg.competicionesOcultas || []).map(normalizar).filter(Boolean);

    function competicionOculta(nombre) {
        const clave = normalizar(nombre);
        return OCULTAS.some(oculta => clave.startsWith(oculta));
    }


    /* ============================================================
       1. DESCARGA
       ============================================================ */

    class ErrorHoja extends Error {
        constructor(hoja, tipo, mensaje) {
            super(mensaje);
            this.name = 'ErrorHoja';
            this.hoja = hoja;
            this.tipo = tipo;
        }
    }

    async function descargarHoja(clave, forzar) {
        const nombre = NOMBRE_HOJA[clave];
        const url = cfg.urls[clave];

        if (!url || url.startsWith('PEGAR_URL')) {
            throw new ErrorHoja(nombre, 'config',
                `Falta la dirección de la hoja “${nombre}” en JS/config.js.`);
        }

        /* Al forzar, se agrega un parámetro para saltear la copia
           que guarda el navegador. */
        const destino = forzar ? url + (url.includes('?') ? '&' : '?') + '_=' + Date.now() : url;

        const control = new AbortController();
        const corte = setTimeout(() => control.abort(), 20000);
        let respuesta;
        try {
            respuesta = await fetch(destino, {
                signal: control.signal,
                cache: forzar ? 'reload' : 'default'
            });
        } catch (error) {
            if (error && error.name === 'AbortError') {
                throw new ErrorHoja(nombre, 'tiempo',
                    `La hoja “${nombre}” tardó demasiado en responder.`);
            }
            throw new ErrorHoja(nombre, 'red',
                `No se pudo conectar con Google Sheets para leer la hoja “${nombre}”.`);
        } finally {
            clearTimeout(corte);
        }

        if (!respuesta.ok) {
            throw new ErrorHoja(nombre, 'http',
                `Google respondió con el error ${respuesta.status} al pedir la hoja “${nombre}”.`);
        }

        const texto = await respuesta.text();

        /* Si la hoja no está publicada, Google devuelve una página web. */
        if (/^\s*<(!doctype|html)/i.test(texto)) {
            throw new ErrorHoja(nombre, 'html',
                `La hoja “${nombre}” no está publicada como CSV.`);
        }
        return texto;
    }

    async function descargar(opciones) {
        const forzar = !!(opciones && opciones.forzar);
        const claves = Object.keys(NOMBRE_HOJA);
        const textos = await Promise.all(claves.map(clave => descargarHoja(clave, forzar)));
        return Object.fromEntries(claves.map((clave, i) => [clave, textos[i]]));
    }

    /* Texto único que identifica el contenido de las tres hojas. */
    function firma(textos) {
        return textos.equipos + '\u0001' + textos.competiciones + '\u0001' + textos.titulos;
    }


    /* ============================================================
       2. COPIA LOCAL
       ============================================================ */

    function firmaUrls() { return JSON.stringify(cfg.urls); }

    function leerCache() {
        try {
            const crudo = localStorage.getItem(cfg.claveCache);
            if (!crudo) return null;
            const guardado = JSON.parse(crudo);
            if (!guardado || !guardado.textos || guardado.urls !== firmaUrls()) return null;
            return guardado;
        } catch (e) {
            return null;
        }
    }

    function guardarCache(textos) {
        try {
            localStorage.setItem(cfg.claveCache,
                JSON.stringify({ t: Date.now(), urls: firmaUrls(), textos }));
        } catch (e) { /* sin espacio o bloqueado: el sitio funciona igual */ }
    }


    /* ============================================================
       3. MODELO
       ============================================================ */

    function campo(fila, alias) {
        for (const nombre of alias) {
            const valor = fila[nombre];
            if (valor != null && String(valor).trim() !== '') return String(valor).trim();
        }
        return '';
    }

    function tituloConfirmado(fila) {
        const estado = normalizar(campo(fila, ALIAS.tituloEstado));
        return estado === '' || !NO_VALIDOS.has(estado);
    }

    /* "2022/23" -> 2022, "Apertura 2012" -> 2012, "Sin dato" -> null */
    function valorDelAnio(texto) {
        const coincidencia = String(texto).match(/(?:18|19|20)\d{2}/);
        return coincidencia ? Number(coincidencia[0]) : null;
    }

    const PALABRAS_MENORES = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e']);

    function siglaDe(nombre) {
        const palabras = normalizar(nombre).split(' ').filter(p => p && !PALABRAS_MENORES.has(p));
        if (palabras.length <= 1) return (palabras[0] || nombre).slice(0, 3).toUpperCase();
        return palabras.map(p => p[0]).join('').slice(0, 3).toUpperCase();
    }

    function rutaLogo(valor) {
        if (!valor) return null;
        if (/^(https?:)?\/\//i.test(valor) || valor.startsWith('IMG/')) return valor;
        return 'IMG/assets/' + valor.replace(/^\.?\//, '');
    }

    /* Posiciones con empate: 1, 2, 2, 4 (como en una tabla de fútbol). */
    function asignarPuestos(lista, valorDe) {
        let puesto = 0;
        let anterior = null;
        lista.forEach((elemento, i) => {
            const valor = valorDe(elemento);
            if (valor !== anterior) { puesto = i + 1; anterior = valor; }
            elemento.puesto = puesto;
        });
    }

    function compararTitulos(a, b) {
        return (a.valor == null ? 1e9 : a.valor) - (b.valor == null ? 1e9 : b.valor) ||
            a.claveAnio.localeCompare(b.claveAnio, 'es', { numeric: true }) ||
            a.fila - b.fila;
    }

    function ordenRegion(region) {
        if (region.id === 'argentina') return 0;
        if (region.id === 'internacional') return 1;
        if (region.id === 'sin-region') return 99;
        return 10;
    }

    function revisarColumnas(avisos, hoja, columnas, requisitos) {
        for (const [clave, etiqueta, obligatoria] of requisitos) {
            if (!ALIAS[clave].some(nombre => columnas.includes(nombre))) {
                avisos.columnas.push({ hoja, falta: etiqueta, obligatoria });
            }
        }
    }


    function construir(textos) {
        const tEquipos = W.csv.aObjetos(textos.equipos);
        const tCompeticiones = W.csv.aObjetos(textos.competiciones);
        const tTitulos = W.csv.aObjetos(textos.titulos);

        const avisos = {
            columnas: [],
            equiposSinHoja: new Map(),   // clubes con títulos que no figuran en la hoja Equipos
            sinRegion: [],
            equiposRepetidos: [],
            incompletos: [],             // títulos sin club o sin competición
            sinAnio: [],
            pendientes: [],              // títulos no confirmados
            duplicados: [],
            ocultos: { competiciones: new Set(), titulos: 0 }   // por "competicionesOcultas"
        };

        revisarColumnas(avisos, 'Equipos', tEquipos.columnas, [
            ['equipo', 'Equipo', true], ['region', 'Región', false]
        ]);
        revisarColumnas(avisos, 'Títulos', tTitulos.columnas, [
            ['tituloEquipo', 'Equipo', true], ['tituloCompeticion', 'Competición', true],
            ['tituloAnio', 'Año / temporada', false]
        ]);
        revisarColumnas(avisos, 'Competiciones', tCompeticiones.columnas, [
            ['competicion', 'Competición', false]
        ]);


        /* ---------- Regiones y clubes ---------- */

        const equipos = [];
        const equipoPorClave = new Map();
        const equipoPorId = new Map();
        const regiones = [];
        const regionPorId = new Map();

        function obtenerRegion(nombre) {
            const id = nombre ? slug(nombre) : 'sin-region';
            let region = regionPorId.get(id);
            if (!region) {
                const conf = cfg.regiones[id];
                region = {
                    id,
                    nombre: conf ? conf.nombre : (nombre || 'Sin región'),
                    logo: conf ? conf.logo : null,
                    equipos: [], filas: [], comps: [], totalTitulos: 0
                };
                regionPorId.set(id, region);
                regiones.push(region);
            }
            return region;
        }

        function registrarEquipo(nombre, nombreRegion, huerfano) {
            let id = slug(nombre);
            if (equipoPorId.has(id)) {
                let n = 2;
                while (equipoPorId.has(id + '-' + n)) n++;
                id = id + '-' + n;
            }
            const equipo = {
                id, nombre,
                clave: normalizar(nombre),
                huerfano,
                region: null,
                titulos: [],
                porComp: new Map(),
                total: 0,
                puesto: null
            };
            if (!huerfano) {
                equipo.region = obtenerRegion(nombreRegion);
                equipo.region.equipos.push(equipo);
            }
            equipos.push(equipo);
            equipoPorClave.set(equipo.clave, equipo);
            equipoPorId.set(id, equipo);
            return equipo;
        }

        tEquipos.filas.forEach(fila => {
            const nombre = campo(fila, ALIAS.equipo);
            if (!nombre) return;
            if (equipoPorClave.has(normalizar(nombre))) {
                avisos.equiposRepetidos.push({ nombre, fila: fila.__fila });
                return;
            }
            const nombreRegion = campo(fila, ALIAS.region);
            if (!nombreRegion) avisos.sinRegion.push({ nombre, fila: fila.__fila });
            registrarEquipo(nombre, nombreRegion, false);
        });


        /* ---------- Competiciones ---------- */

        const competiciones = [];
        const compPorId = new Map();
        const compPorClave = new Map();

        function resolverCompeticion(nombreHoja) {
            const clave = normalizar(nombreHoja);
            if (compPorClave.has(clave)) return compPorClave.get(clave);

            const indice = cfg.competiciones.findIndex(c =>
                normalizar(c.id) === clave ||
                normalizar(c.nombre) === clave ||
                (c.alias || []).some(alias => normalizar(alias) === clave));
            const meta = indice >= 0 ? cfg.competiciones[indice] : null;
            const id = meta ? meta.id : slug(nombreHoja);

            let comp = compPorId.get(id);
            if (!comp) {
                comp = {
                    id,
                    nombre: meta ? meta.nombre : nombreHoja,
                    sigla: (meta && meta.sigla) || siglaDe(nombreHoja),
                    logo: meta ? meta.logo || null : null,
                    logoOscuro: meta ? meta.logoOscuro || null : null,
                    orden: meta ? indice : 1000 + competiciones.length,
                    conocida: !!meta,
                    titulos: [],
                    ranking: [], ediciones: 0, porAnio: [], ultimo: null
                };
                competiciones.push(comp);
                compPorId.set(id, comp);
            }
            compPorClave.set(clave, comp);
            return comp;
        }

        tCompeticiones.filas.forEach(fila => {
            const nombre = campo(fila, ALIAS.competicion);
            if (!nombre) return;
            if (competicionOculta(nombre)) { avisos.ocultos.competiciones.add(nombre); return; }
            const comp = resolverCompeticion(nombre);
            const orden = parseInt(campo(fila, ALIAS.competicionOrden), 10);
            if (!Number.isNaN(orden)) comp.orden = orden;
            const logo = rutaLogo(campo(fila, ALIAS.competicionLogo));
            if (logo && !comp.logo) comp.logo = logo;
        });


        /* ---------- Títulos ---------- */

        const titulos = [];

        tTitulos.filas.forEach(fila => {
            const nombreEquipo = campo(fila, ALIAS.tituloEquipo);
            const nombreComp = campo(fila, ALIAS.tituloCompeticion);
            const anio = campo(fila, ALIAS.tituloAnio);

            if (nombreComp && competicionOculta(nombreComp)) {
                avisos.ocultos.competiciones.add(nombreComp);
                avisos.ocultos.titulos++;
                return;
            }

            if (!nombreEquipo || !nombreComp) {
                avisos.incompletos.push({ fila: fila.__fila, equipo: nombreEquipo, competicion: nombreComp });
                return;
            }

            const comp = resolverCompeticion(nombreComp);
            const confirmado = tituloConfirmado(fila);

            let equipo = equipoPorClave.get(normalizar(nombreEquipo));
            if (!equipo && confirmado) {
                equipo = registrarEquipo(nombreEquipo, '', true);
                avisos.equiposSinHoja.set(equipo.id, { nombre: nombreEquipo, filas: [] });
            }
            if (equipo && equipo.huerfano && avisos.equiposSinHoja.has(equipo.id)) {
                avisos.equiposSinHoja.get(equipo.id).filas.push(fila.__fila);
            }

            const titulo = {
                fila: fila.__fila,
                equipo: equipo || { nombre: nombreEquipo, id: slug(nombreEquipo) },
                competicion: comp,
                anio,
                claveAnio: normalizar(anio),
                valor: valorDelAnio(anio)
            };

            if (!confirmado) {
                avisos.pendientes.push(titulo);
                return;
            }
            if (!anio) avisos.sinAnio.push(titulo);

            titulos.push(titulo);
            equipo.titulos.push(titulo);
            comp.titulos.push(titulo);
        });


        /* Posibles duplicados: mismo club, competición y año. */
        const vistos = new Map();
        titulos.forEach(t => {
            if (!t.claveAnio) return;
            const clave = t.equipo.id + '|' + t.competicion.id + '|' + t.claveAnio;
            if (!vistos.has(clave)) vistos.set(clave, []);
            vistos.get(clave).push(t);
        });
        vistos.forEach(grupo => {
            if (grupo.length > 1) {
                avisos.duplicados.push({
                    equipo: grupo[0].equipo.nombre,
                    competicion: grupo[0].competicion.nombre,
                    anio: grupo[0].anio,
                    filas: grupo.map(t => t.fila)
                });
            }
        });


        /* ---------- Cálculos por club ---------- */

        equipos.forEach(equipo => {
            equipo.titulos.sort(compararTitulos);
            equipo.total = equipo.titulos.length;
            equipo.titulos.forEach(t => {
                if (!equipo.porComp.has(t.competicion.id)) equipo.porComp.set(t.competicion.id, []);
                equipo.porComp.get(t.competicion.id).push(t);
            });
        });


        /* ---------- Cálculos por competición ---------- */

        competiciones.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));

        competiciones.forEach(comp => {
            comp.titulos.sort(compararTitulos);

            const grupos = new Map();
            comp.titulos.forEach(t => {
                let grupo = grupos.get(t.equipo.id);
                if (!grupo) {
                    grupo = { equipo: t.equipo, cantidad: 0, titulos: [] };
                    grupos.set(t.equipo.id, grupo);
                }
                grupo.cantidad++;
                grupo.titulos.push(t);
            });
            comp.ranking = [...grupos.values()].sort((a, b) =>
                b.cantidad - a.cantidad || a.equipo.nombre.localeCompare(b.equipo.nombre, 'es'));
            asignarPuestos(comp.ranking, grupo => grupo.cantidad);

            comp.ediciones = new Set(comp.titulos.filter(t => t.claveAnio).map(t => t.claveAnio)).size;

            const anios = new Map();
            comp.titulos.forEach(t => {
                const clave = t.claveAnio || '__sin_anio';
                let anio = anios.get(clave);
                if (!anio) {
                    anio = { clave, etiqueta: t.anio || 'Sin año', valor: t.valor, campeones: [] };
                    anios.set(clave, anio);
                }
                anio.campeones.push(t.equipo);
            });
            comp.porAnio = [...anios.values()].sort((a, b) =>
                (b.valor == null ? -1 : b.valor) - (a.valor == null ? -1 : a.valor) ||
                b.etiqueta.localeCompare(a.etiqueta, 'es', { numeric: true }));

            const conAnio = comp.titulos.filter(t => t.valor != null);
            comp.ultimo = conAnio.length ? conAnio[conAnio.length - 1]
                : (comp.titulos[comp.titulos.length - 1] || null);
        });


        /* ---------- Cálculos por región ---------- */

        regiones.sort((a, b) => ordenRegion(a) - ordenRegion(b) || a.nombre.localeCompare(b.nombre, 'es'));

        regiones.forEach(region => {
            region.filas = region.equipos
                .filter(equipo => equipo.total > 0)
                .map(equipo => ({
                    equipo,
                    total: equipo.total,
                    porComp: new Map([...equipo.porComp].map(([id, lista]) => [id, lista.length]))
                }))
                .sort((a, b) => b.total - a.total || a.equipo.nombre.localeCompare(b.equipo.nombre, 'es'));
            asignarPuestos(region.filas, fila => fila.total);
            region.filas.forEach(fila => { fila.equipo.puesto = fila.puesto; });

            region.comps = competiciones.filter(comp => region.filas.some(fila => fila.porComp.has(comp.id)));
            region.totalTitulos = region.filas.reduce((suma, fila) => suma + fila.total, 0);
            region.equipos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        });


        return {
            equipos,
            equipoPorId,
            competiciones,
            compPorId,
            titulos,
            regiones,
            regionPorId,
            avisos,
            hojas: {
                Equipos: tEquipos.originales.filter(Boolean),
                Competiciones: tCompeticiones.originales.filter(Boolean),
                Títulos: tTitulos.originales.filter(Boolean)
            },
            resumen: {
                clubes: equipos.filter(e => !e.huerfano).length,
                competiciones: competiciones.length,
                titulos: titulos.length,
                pendientes: avisos.pendientes.length
            }
        };
    }


    W.datos = { descargar, firma, leerCache, guardarCache, construir, ErrorHoja };

})(window.WINNER = window.WINNER || {});
