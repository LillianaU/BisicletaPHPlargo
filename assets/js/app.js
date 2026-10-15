/* ============================================================
   E-BIKE MANAGEMENT — SPA (SDD §2 §4 §5)
   Bootstrap responsivo + Canvas + SweetAlert2 (alertas y modales)
   ============================================================ */

'use strict';

let USUARIO = null;
let VISTA = 'dashboard';
let TIPO_GRAFICO = 'SEMANA';
let CSRF = null;

/* ------------------------- HELPERS ------------------------- */

async function api(archivo, params = {}, metodo = 'GET', datos = null) {
    const qs = '?' + new URLSearchParams(params);
    const opciones = { method: metodo, headers: {} };
    if (metodo !== 'GET') {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify({ _csrf: CSRF, ...(datos || {}) });
    }
    const resp = await fetch('api/' + archivo + qs, opciones);
    let json;
    try { json = await resp.json(); }
    catch { json = { ok: false, mensaje: 'Respuesta inválida del servidor' }; }
    if (json.datos && json.datos.csrf) CSRF = json.datos.csrf;
    if (resp.status === 401 && USUARIO) {
        const expirada = (json.mensaje || '').includes('expirada');
        USUARIO = null;
        if (expirada) {
            Swal.fire({ icon: 'info', title: 'Sesión expirada', text: 'Por seguridad tu sesión se cerró tras 30 minutos de inactividad.' });
        }
        mostrarLogin();
    }
    return json;
}

const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2600, timerProgressBar: true });

function toast(icono, titulo) { Toast.fire({ icon: icono, title: titulo }); }

function dinero(v) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v || 0));
}

function fechaHora(v) {
    if (!v) return '—';
    const d = new Date(String(v).replace(' ', 'T'));
    return isNaN(d) ? v : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

const MAPA_ETIQUETA = {
    DISPONIBLE: 'positivo', ACTIVA: 'positivo', ACTIVO: 'positivo', APROBADO: 'positivo', ATENDIDA: 'positivo', BAJA: 'positivo',
    FINALIZADO: 'aceptado',
    ALQUILADA: 'reserva', RESERVADO: 'reserva', CARGANDO: 'reserva', PENDIENTE: 'reserva', PENDIENTE_PAGO: 'reserva',
    PROGRAMADO: 'reserva', ALTA: 'reserva', INSTALADA: 'info', EN_REVISION: 'info', EN_REPARACION: 'info',
    MANTENIMIENTO: 'info', MEDIA: 'info', CERRADA: 'oscuro',
    FUERA_SERVICIO: 'peligro', CANCELADO: 'peligro', BLOQUEADO: 'peligro', INACTIVO: 'peligro', RECHAZADO: 'peligro', CRITICA: 'peligro'
};

function etiqueta(estado) {
    return `<span class="etiqueta ${MAPA_ETIQUETA[estado] || 'oscuro'}">${estado.replaceAll('_', ' ')}</span>`;
}

function iniciales(nombre) {
    return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function debonce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const $ = (sel) => document.querySelector(sel);

/* ------------------------- LOGIN ------------------------- */

function mostrarLogin() {
    VISTA = 'login';
    $('#raiz').innerHTML = `
    <div class="login-fondo">
        <div class="login-tarjeta row g-0">
            <div class="col-lg-5 login-lateral">
                <i class="bi bi-lightning-charge-fill licor"></i>
                <h1 class="mt-3">E-Bike <span class="marca-dorado">Management</span></h1>
                <p class="mt-2 mb-0">Sistema de gestión de bicicletas eléctricas: estaciones, flota, alquileres, mantenimientos y reportes estadísticos en tiempo real.</p>
            </div>
            <div class="col-lg-7 login-formulario d-flex flex-column justify-content-center">
                <h3 class="text-center mb-1" style="color:var(--verde-caro);font-weight:700;">Iniciar sesión</h3>
                <p class="text-center text-muted mb-4">Ingrese sus credenciales para continuar</p>
                <form id="formLogin" class="mx-auto" style="max-width:380px;width:100%;">
                    <div class="mb-3">
                        <label class="form-label" style="color:var(--verde-caro);font-weight:600;font-size:.85rem;">Correo electrónico</label>
                        <input type="email" class="form-control form-control-lg" id="loginEmail" placeholder="usuario@ebike.com" required>
                    </div>
                    <div class="mb-4">
                        <label class="form-label" style="color:var(--verde-caro);font-weight:600;font-size:.85rem;">Contraseña</label>
                        <input type="password" class="form-control form-control-lg" id="loginClave" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-verde-caro btn-lg w-100">
                        <i class="bi bi-box-arrow-in-right me-1"></i> Ingresar
                    </button>
                </form>
                <div class="text-center mt-4">
                    <small class="text-muted">Prueba: admin@ebike.com · tecnico@ebike.com · cliente@ebike.com</small>
                </div>
            </div>
        </div>
    </div>`;

    $('#formLogin').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        Swal.fire({ title: 'Verificando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        const r = await api('auth.php', { accion: 'login' }, 'POST', {
            email: $('#loginEmail').value.trim(),
            password: $('#loginClave').value
        });
        Swal.close();
        if (r.ok) { toast('success', r.mensaje); USUARIO = r.datos.usuario; mostrarApp(); }
        else Swal.fire('Error', r.mensaje, 'error');
    });
}

/* ------------------------- APP SHELL ------------------------- */

const MENU_POR_ROL = {
    ADMIN:     ['dashboard', 'alquileres', 'estaciones', 'bicicletas', 'usuarios', 'mantenimientos', 'inventario', 'alertas'],
    TECNICO:   ['dashboard', 'mantenimientos', 'inventario', 'alertas', 'estaciones', 'bicicletas'],
    SUPERVISOR:['dashboard', 'alquileres', 'estaciones', 'bicicletas', 'mantenimientos'],
    OPERADOR:  ['dashboard', 'alquileres', 'estaciones', 'bicicletas'],
    CLIENTE:   ['alquileres', 'perfil']
};

const CONFIG_MENU = {
    dashboard:      { titulo: 'Panel de control',    icono: 'bi-speedometer2',      grupo: 'General' },
    alquileres:     { titulo: 'Alquileres',          icono: 'bi-bicycle',           grupo: 'Operación' },
    estaciones:     { titulo: 'Estaciones',          icono: 'bi-ev-front',          grupo: 'Flota' },
    bicicletas:     { titulo: 'Bicicletas',          icono: 'bi-person-bicycle',    grupo: 'Flota' },
    usuarios:       { titulo: 'Usuarios y roles',    icono: 'bi-people',            grupo: 'Administración' },
    mantenimientos: { titulo: 'Mantenimientos',      icono: 'bi-tools',             grupo: 'Taller' },
    inventario:     { titulo: 'Inventario repuestos',icono: 'bi-box-seam',          grupo: 'Taller' },
    alertas:        { titulo: 'Alertas energéticas', icono: 'bi-exclamation-triangle', grupo: 'Taller' },
    perfil:         { titulo: 'Mi perfil',           icono: 'bi-person-gear',       grupo: 'Cuenta' }
};

function mostrarApp() {
    VISTA = 'dashboard';
    const menus = MENU_POR_ROL[USUARIO.rol] || ['alquileres', 'perfil'];
    if (!menus.includes(VISTA)) VISTA = menus[0];

    const grupos = {};
    menus.forEach(m => { (grupos[CONFIG_MENU[m].grupo] ||= []).push(m); });

    const menuHtml = Object.entries(grupos).map(([grupo, items]) => `
        <div class="sidebar-titulo">${grupo}</div>
        ${items.map(m => `
            <a href="#" class="menu-item" data-vista="${m}">
                <i class="bi ${CONFIG_MENU[m].icono}"></i><span>${CONFIG_MENU[m].titulo}</span>
            </a>`).join('')}`).join('');

    $('#raiz').innerHTML = `
    <div class="app-layout">
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-marca">
                <i class="bi bi-lightning-charge-fill"></i>
                <div><strong>E-Bike</strong><small>Management</small></div>
            </div>
            <nav class="sidebar-menu">${menuHtml}</nav>
            <div class="sidebar-pie">
                <div class="avatar">${iniciales(USUARIO.nombre)}</div>
                <div class="datos">
                    <strong>${USUARIO.nombre}</strong>
                    <small>${USUARIO.nombre_rol}</small>
                </div>
            </div>
        </aside>
        <div class="overlay-sidebar" id="overlay"></div>
        <main class="contenido-principal">
            <header class="topbar">
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-menta btn-sm btn-menu-movil" id="btnMenuMovil"><i class="bi bi-list"></i></button>
                    <h2 id="tituloVista">—</h2>
                </div>
                <div class="d-flex align-items-center gap-3">
                    ${USUARIO.rol === 'CLIENTE' && USUARIO.frecuente ? '<span class="etiqueta reserva"><i class="bi bi-star-fill"></i> Cliente frecuente · 10%</span>' : ''}
                    <span class="d-none d-md-inline text-muted small">${USUARIO.email}</span>
                    <button class="btn btn-outline-danger btn-sm" id="btnSalir"><i class="bi bi-box-arrow-right"></i><span class="d-none d-md-inline ms-1">Salir</span></button>
                </div>
            </header>
            <section class="area-vista" id="vista"></section>
        </main>
    </div>`;

    document.querySelectorAll('.menu-item').forEach(a => {
        a.addEventListener('click', (ev) => {
            ev.preventDefault();
            navegar(a.dataset.vista);
            cerrarSidebarMovil();
        });
    });
    $('#btnSalir').addEventListener('click', async () => {
        const r = await Swal.fire({ title: '¿Cerrar sesión?', icon: 'question', showCancelButton: true, confirmButtonText: 'Salir', cancelButtonText: 'Cancelar' });
        if (r.isConfirmed) { await api('auth.php', { accion: 'logout' }); USUARIO = null; mostrarLogin(); }
    });
    $('#btnMenuMovil').addEventListener('click', () => {
        $('#sidebar').classList.add('abierto');
        $('#overlay').classList.add('visible');
    });
    $('#overlay').addEventListener('click', cerrarSidebarMovil);

    navegar(VISTA);
}

function cerrarSidebarMovil() {
    $('#sidebar')?.classList.remove('abierto');
    $('#overlay')?.classList.remove('visible');
}

function navegar(vista) {
    VISTA = vista;
    window.onresize = null;
    document.querySelectorAll('.menu-item').forEach(a => a.classList.toggle('activo', a.dataset.vista === vista));
    $('#tituloVista').textContent = CONFIG_MENU[vista].titulo;
    ({ dashboard: vistaDashboard, alquileres: vistaAlquileres, estaciones: vistaEstaciones,
       bicicletas: vistaBicicletas, usuarios: vistaUsuarios, mantenimientos: vistaMantenimientos,
       inventario: vistaInventario, alertas: vistaAlertas, perfil: vistaPerfil })[vista]();
}

/* ------------------------- DASHBOARD ------------------------- */

async function vistaDashboard() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';

    const [res, graf, estados] = await Promise.all([
        api('reportes.php', { accion: 'resumen' }),
        api('reportes.php', { accion: 'grafico', tipo: TIPO_GRAFICO }),
        api('reportes.php', { accion: 'estados' })
    ]);
    if (!res.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${res.mensaje}</div>`; return; }
    const d = res.datos;

    const kpi = (icono, valor, texto, variante) => `
        <div class="col-6 col-lg-3 mb-3">
            <div class="card tarjeta tarjeta-kpi ${variante} h-100">
                <div class="card-body d-flex align-items-center gap-3">
                    <div class="kpi-icono"><i class="bi ${icono}"></i></div>
                    <div><div class="kpi-valor">${valor}</div><p class="kpi-etiqueta mb-0">${texto}</p></div>
                </div>
            </div>
        </div>`;

    $('#vista').innerHTML = `
        <div class="row">
            ${kpi('bi-calendar-day', d.alquileres_hoy, 'Alquileres hoy', 'variante-oliva')}
            ${kpi('bi-calendar-week', d.alquileres_semana, 'Alquileres semana', '')}
            ${kpi('bi-calendar-month', d.alquileres_mes, 'Alquileres del mes', 'variante-caro')}
            ${kpi('bi-cash-coin', dinero(d.ingresos_mes), 'Ingresos del mes', 'variante-dorado')}
            ${kpi('bi-bicycle', d.bicicletas_disponibles, 'Bicicletas disponibles', 'variante-oliva')}
            ${kpi('bi-tools', d.mantenimientos_activos, 'Mantenimientos activos', 'variante-caro')}
            ${kpi('bi-exclamation-triangle', d.alertas_pendientes, 'Alertas pendientes', 'variante-dorado')}
            ${kpi('bi-star-fill', d.clientes_frecuentes, 'Clientes frecuentes', 'variante-caro')}
        </div>
        <div class="row mt-2">
            <div class="col-lg-8 mb-3">
                <div class="card tarjeta h-100">
                    <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <span><i class="bi bi-bar-chart me-1"></i> Reporte estadístico de alquileres</span>
                        <div class="btn-group filtro-grafico" role="group">
                            <button class="btn btn-menta btn-filtro ${TIPO_GRAFICO === 'DIA' ? 'activo' : ''}" data-tipo="DIA">Diario</button>
                            <button class="btn btn-menta btn-filtro ${TIPO_GRAFICO === 'SEMANA' ? 'activo' : ''}" data-tipo="SEMANA">Semanal</button>
                            <button class="btn btn-menta btn-filtro ${TIPO_GRAFICO === 'MES' ? 'activo' : ''}" data-tipo="MES">Mensual</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="lienzo-canvas" style="height:300px;"><canvas id="canvasBarras" height="300"></canvas></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-4 mb-3">
                <div class="card tarjeta h-100">
                    <div class="card-header"><i class="bi bi-pie-chart me-1"></i> Alquileres por estado</div>
                    <div class="card-body">
                        <div class="lienzo-canvas" style="height:300px;"><canvas id="canvasDona" height="300"></canvas></div>
                    </div>
                </div>
            </div>
        </div>`;

    pintarBarras(graf);
    pintarDona(estados);

    document.querySelectorAll('.btn-filtro').forEach(b => b.addEventListener('click', async () => {
        TIPO_GRAFICO = b.dataset.tipo;
        document.querySelectorAll('.btn-filtro').forEach(x => x.classList.toggle('activo', x === b));
        const g = await api('reportes.php', { accion: 'grafico', tipo: TIPO_GRAFICO });
        if (g.ok) pintarBarras(g);
    }));

    window.onresize = debonce(() => {
        if (VISTA !== 'dashboard') return;
        pintarDona(estados);
        api('reportes.php', { accion: 'grafico', tipo: TIPO_GRAFICO }).then(g => { if (g.ok) pintarBarras(g); });
    }, 250);
}

function pintarBarras(graf) {
    const puntos = graf.datos.puntos;
    graficoBarras($('#canvasBarras'), puntos.map(p => p.etiqueta), puntos.map(p => Number(p.cantidad)));
}

function pintarDona(estados) {
    const segs = estados.datos.estados.map(e => ({ nombre: e.estado.replaceAll('_', ' '), valor: Number(e.cantidad) }));
    graficoDona($('#canvasDona'), segs);
}

/* ------------------------- ALQUILERES (CRUD → SPs) ------------------------- */

async function vistaAlquileres() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';

    const filtro = document.getElementById('selEstadoAlquiler')?.value || '';
    const [r, puedeCrear] = await Promise.all([
        api('alquileres.php', { accion: 'listar', estado: filtro }),
        Promise.resolve(['ADMIN', 'OPERADOR', 'CLIENTE'].includes(USUARIO.rol))
    ]);
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    const esCliente = USUARIO.rol === 'CLIENTE';

    const acciones = (a) => {
        const propietario = !esCliente || Number(a.id_usuario) === USUARIO.id;
        const btns = [];
        btns.push(`<button class="btn btn-sm btn-menta btn-ver" data-id="${a.id_alquiler}" title="Ver detalle"><i class="bi bi-eye"></i></button>`);
        if (propietario && ['RESERVADO', 'ACTIVO'].includes(a.estado))
            btns.push(`<button class="btn btn-sm btn-dorado btn-fin" data-id="${a.id_alquiler}" title="Finalizar"><i class="bi bi-flag-fill"></i></button>`);
        if (propietario && ['RESERVADO', 'PENDIENTE_PAGO'].includes(a.estado))
            btns.push(`<button class="btn btn-sm btn-oliva btn-edit" data-id="${a.id_alquiler}" title="Editar"><i class="bi bi-pencil"></i></button>`);
        if (propietario && ['RESERVADO', 'ACTIVO', 'PENDIENTE_PAGO'].includes(a.estado))
            btns.push(`<button class="btn btn-sm btn-outline-danger btn-anul" data-id="${a.id_alquiler}" title="Anular"><i class="bi bi-x-lg"></i></button>`);
        return `<div class="d-flex gap-1 justify-content-end">${btns.join('')}</div>`;
    };

    $('#vista').innerHTML = `
    <div class="card tarjeta">
        <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <form class="d-flex gap-2 align-items-center" id="formFiltro">
                <select class="form-select form-select-sm" id="selEstadoAlquiler" style="width:auto;">
                    <option value="">Todos los estados</option>
                    ${['RESERVADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO', 'PENDIENTE_PAGO'].map(e =>
                        `<option value="${e}" ${filtro === e ? 'selected' : ''}>${e.replaceAll('_', ' ')}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-verde-caro"><i class="bi bi-funnel"></i> Filtrar</button>
            </form>
            ${puedeCrear ? '<button class="btn btn-sm btn-dorado" id="btnNuevo"><i class="bi bi-plus-lg"></i> Nuevo alquiler</button>' : ''}
        </div>
        <div class="card-body tabla-scroll p-0">
            <table class="table table-hover mb-0">
                <thead><tr>
                    <th>ID</th><th>Bicicleta</th><th>Origen → Destino</th><th>Inicio</th><th>Fin</th>
                    <th>Costo</th><th>Estado</th><th class="text-end">Acciones</th>
                </tr></thead>
                <tbody>
                ${r.datos.alquileres.length === 0 ? '<tr><td colspan="8" class="text-center text-muted py-4">Sin alquileres para mostrar</td></tr>' : ''}
                ${r.datos.alquileres.map(a => `
                    <tr>
                        <td><strong>#${a.id_alquiler}</strong><br><small class="text-muted">${a.cliente ?? ''}</small></td>
                        <td>${a.modelo}<br><small class="text-muted">${a.codigo_qr}</small></td>
                        <td><small>${a.estacion_origen}<br>${a.estacion_destino ?? '—'}</small></td>
                        <td><small>${fechaHora(a.fecha_inicio)}</small></td>
                        <td><small>${fechaHora(a.fecha_fin)}</small></td>
                        <td>
                            <span class="texto-dinero">${dinero(a.costo_total)}</span>
                            ${Number(a.porcentaje_descuento) > 0 ? `<br><small class="descuento-chip"><i class="bi bi-star-fill"></i> -${a.porcentaje_descuento}% (${dinero(a.descuento)})</small>` : ''}
                        </td>
                        <td>${etiqueta(a.estado)}</td>
                        <td>${acciones(a)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    $('#formFiltro').addEventListener('submit', (ev) => { ev.preventDefault(); vistaAlquileres(); });
    $('#btnNuevo')?.addEventListener('click', modalCrearAlquiler);
    document.querySelectorAll('.btn-ver').forEach(b => b.addEventListener('click', () => verAlquiler(b.dataset.id)));
    document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => modalEditarAlquiler(b.dataset.id)));
    document.querySelectorAll('.btn-fin').forEach(b => b.addEventListener('click', () => modalFinalizar(b.dataset.id)));
    document.querySelectorAll('.btn-anul').forEach(b => b.addEventListener('click', () => anularAlquiler(b.dataset.id)));
}

async function verAlquiler(id) {
    const r = await api('alquileres.php', { accion: 'obtener', id });
    if (!r.ok) return Swal.fire('Error', r.mensaje, 'error');
    const a = r.datos.alquiler;
    const fila = (t, v) => `<tr><td class="text-muted">${t}</td><td class="text-end"><strong>${v}</strong></td></tr>`;
    Swal.fire({
        title: `Alquiler #${a.id_alquiler}`,
        width: 480,
        html: `
        <div class="swal-formulario">
        <table class="table table-sm">
            ${fila('Cliente', a.cliente + (Number(a.es_cliente_frecuente) ? ' ⭐' : ''))}
            ${fila('Bicicleta', `${a.modelo} (${a.codigo_qr})`)}
            ${fila('Origen', a.estacion_origen)}
            ${fila('Destino', a.estacion_destino ?? '—')}
            ${fila('Inicio', fechaHora(a.fecha_inicio))}
            ${fila('Fin', fechaHora(a.fecha_fin))}
            ${fila('Costo base', dinero(a.costo_base))}
            ${fila('Descuento', `${a.porcentaje_descuento}% · ${dinero(a.descuento)}`)}
            ${fila('Total', dinero(a.costo_total))}
            ${fila('Estado', etiqueta(a.estado))}
        </table></div>`,
        confirmButtonText: 'Cerrar'
    });
}

async function modalCrearAlquiler() {
    const esCliente = USUARIO.rol === 'CLIENTE';
    const [clientes, bicis, estaciones] = await Promise.all([
        esCliente ? Promise.resolve({ ok: true, datos: { clientes: [{ id_usuario: USUARIO.id, nombre: USUARIO.nombre }] } })
                  : api('catalogos.php', { accion: 'clientes' }),
        api('catalogos.php', { accion: 'bicicletas' }),
        api('catalogos.php', { accion: 'estaciones' })
    ]);
    if (!bicis.ok || !estaciones.ok || !clientes.ok) return Swal.fire('Error', 'No fue posible cargar los catálogos', 'error');

    const { value: form } = await Swal.fire({
        title: 'Nuevo alquiler',
        width: 480,
        html: `
        <div class="swal-formulario">
            <label>Cliente</label>
            <select id="aqCliente" class="form-select">
                ${clientes.datos.clientes.map(c => `<option value="${c.id_usuario}">${c.nombre}${Number(c.es_cliente_frecuente) ? ' ⭐' : ''}</option>`).join('')}
            </select>
            <label>Bicicleta disponible</label>
            <select id="aqBici" class="form-select">
                ${bicis.datos.bicicletas.length === 0 ? '<option value="">— Sin bicicletas disponibles —</option>' : ''}
                ${bicis.datos.bicicletas.map(b => `<option value="${b.id_bicicleta}" data-est="${b.estacion_act ?? ''}">${b.modelo} · ${b.codigo_qr} · 🔋 ${b.nivel_bateria}%</option>`).join('')}
            </select>
            <label>Estación de origen</label>
            <select id="aqEstacion" class="form-select">
                ${estaciones.datos.estaciones.filter(e => e.estado === 'ACTIVA').map(e => `<option value="${e.id_estacion}">${e.nombre} (${e.codigo})</option>`).join('')}
            </select>
            <label>Costo base (COP)</label>
            <input type="number" id="aqCosto" class="form-control" min="1" step="100" value="5000" required>
            <small class="text-muted">El descuento de cliente frecuente (10%) se aplica automáticamente por trigger.</small>
        </div>`,
        showCancelButton: true,
        confirmButtonText: 'Registrar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            id_usuario: document.getElementById('aqCliente').value,
            id_bicicleta: document.getElementById('aqBici').value,
            estacion_orig: document.getElementById('aqEstacion').value,
            costo_base: document.getElementById('aqCosto').value
        })
    });
    if (!form) return;
    if (!form.id_bicicleta) return Swal.fire('Atención', 'No hay bicicletas disponibles en este momento', 'warning');

    const r = await api('alquileres.php', { accion: 'crear' }, 'POST', form);
    if (r.ok) { toast('success', r.mensaje); vistaAlquileres(); }
    else Swal.fire('No se pudo registrar', r.mensaje, 'error');
}

async function modalEditarAlquiler(id) {
    const r = await api('alquileres.php', { accion: 'obtener', id });
    if (!r.ok) return Swal.fire('Error', r.mensaje, 'error');
    const a = r.datos.alquiler;
    const estaciones = await api('catalogos.php', { accion: 'estaciones' });

    const { value: form } = await Swal.fire({
        title: `Editar alquiler #${id}`,
        width: 460,
        html: `
        <div class="swal-formulario">
            <label>Costo base (COP)</label>
            <input type="number" id="edCosto" class="form-control" min="1" step="100" value="${a.costo_base}">
            <label>Estación de origen</label>
            <select id="edEstacion" class="form-select">
                ${(estaciones.datos?.estaciones || []).filter(e => e.estado === 'ACTIVA').map(e =>
                    `<option value="${e.id_estacion}" ${Number(e.id_estacion) === Number(a.id_estacion_orig) ? 'selected' : ''}>${e.nombre}</option>`).join('')}
            </select>
            <label>Estado</label>
            <select id="edEstado" class="form-select">
                ${['RESERVADO', 'PENDIENTE_PAGO'].map(e => `<option value="${e}" ${a.estado === e ? 'selected' : ''}>${e.replaceAll('_', ' ')}</option>`).join('')}
            </select>
        </div>`,
        showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            id_alquiler: id,
            costo_base: document.getElementById('edCosto').value,
            estacion_orig: document.getElementById('edEstacion').value,
            estado: document.getElementById('edEstado').value
        })
    });
    if (!form) return;

    const res = await api('alquileres.php', { accion: 'actualizar' }, 'POST', form);
    if (res.ok) { toast('success', res.mensaje); vistaAlquileres(); }
    else Swal.fire('No se pudo actualizar', res.mensaje, 'error');
}

async function modalFinalizar(id) {
    const r = await api('alquileres.php', { accion: 'obtener', id });
    if (!r.ok) return Swal.fire('Error', r.mensaje, 'error');
    const a = r.datos.alquiler;
    const [estaciones, metodos] = await Promise.all([
        api('catalogos.php', { accion: 'estaciones' }),
        api('catalogos.php', { accion: 'metodos_pago', id_usuario: a.id_usuario })
    ]);
    const activos = (metodos.datos?.metodos || []).filter(m => Number(m.activo) === 1);

    const { value: form } = await Swal.fire({
        title: `Finalizar alquiler #${id}`,
        width: 470,
        html: `
        <div class="swal-formulario">
            <p class="mb-1">Total a cobrar: <strong style="color:var(--verde-caro);font-size:1.15rem;">${dinero(a.costo_total)}</strong>
            ${Number(a.porcentaje_descuento) > 0 ? `<span class="descuento-chip">(incluye -${a.porcentaje_descuento}%)</span>` : ''}</p>
            <label>Estación de destino</label>
            <select id="fnDestino" class="form-select">
                ${(estaciones.datos?.estaciones || []).filter(e => e.estado === 'ACTIVA').map(e =>
                    `<option value="${e.id_estacion}" ${Number(e.id_estacion) === Number(a.id_estacion_orig) ? 'selected' : ''}>${e.nombre}</option>`).join('')}
            </select>
            <label>Método de pago del cliente</label>
            <select id="fnMetodo" class="form-select">
                ${activos.length === 0 ? '<option value="">— El cliente no tiene medios de pago activos —</option>' : ''}
                ${activos.map(m => `<option value="${m.id_metodo}">${m.tipo.replaceAll('_', ' ')}</option>`).join('')}
            </select>
            <label>Referencia / comprobante (opcional)</label>
            <input type="text" id="fnRef" class="form-control" placeholder="Ej. NEQUI-88421">
        </div>`,
        showCancelButton: true, confirmButtonText: 'Finalizar y cobrar', cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            id_alquiler: id,
            estacion_dest: document.getElementById('fnDestino').value,
            id_metodo_pago: document.getElementById('fnMetodo').value,
            referencia: document.getElementById('fnRef').value.trim()
        })
    });
    if (!form) return;
    if (!form.id_metodo_pago) return Swal.fire('Atención', 'El cliente necesita un medio de pago activo', 'warning');

    const res = await api('alquileres.php', { accion: 'finalizar' }, 'POST', form);
    if (res.ok) { toast('success', res.mensaje); vistaAlquileres(); }
    else Swal.fire('No se pudo finalizar', res.mensaje, 'error');
}

async function anularAlquiler(id) {
    const r = await Swal.fire({
        title: `¿Anular alquiler #${id}?`,
        text: 'La bicicleta volverá a estar disponible y el alquiler quedará CANCELADO.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#b04a3a', confirmButtonText: 'Sí, anular', cancelButtonText: 'Volver'
    });
    if (!r.isConfirmed) return;

    const res = await api('alquileres.php', { accion: 'anular' }, 'POST', { id_alquiler: id });
    if (res.ok) { toast('success', res.mensaje); vistaAlquileres(); }
    else Swal.fire('No se pudo anular', res.mensaje, 'error');
}

/* ------------------------- ESTACIONES ------------------------- */

async function vistaEstaciones() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';
    const r = await api('catalogos.php', { accion: 'estaciones' });
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    $('#vista').innerHTML = `<div class="row">
        ${r.datos.estaciones.map(e => {
            const ocupacion = Math.min(100, Math.round((Number(e.bicicletas_actuales) / e.capacidad) * 100));
            return `
        <div class="col-md-6 col-xl-3 mb-3">
            <div class="card tarjeta h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h6 class="mb-0" style="color:var(--verde-caro);font-weight:700;">${e.nombre}</h6>
                            <small class="text-muted">${e.codigo}</small>
                        </div>
                        ${etiqueta(e.estado)}
                    </div>
                    <p class="small text-muted mb-2"><i class="bi bi-geo-alt"></i> ${e.direccion}</p>
                    <div class="d-flex justify-content-between small mb-1">
                        <span><i class="bi bi-bicycle"></i> ${e.bicicletas_actuales}/${e.capacidad} puestos</span>
                        <span><i class="bi bi-lightning-charge"></i> ${Number(e.energia_disp).toFixed(1)} kWh</span>
                    </div>
                    <div class="energia-barra mb-1"><div style="width:${ocupacion}%"></div></div>
                    <small class="text-muted">Ocupación ${ocupacion}%</small>
                </div>
            </div>
        </div>`;
        }).join('')}
    </div>`;
}

/* ------------------------- BICICLETAS ------------------------- */

async function vistaBicicletas() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';
    const r = await api('catalogos.php', { accion: 'bicicletas', todas: 1 });
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    const barraBateria = (nivel) => {
        const v = Number(nivel);
        const clase = v >= 50 ? 'ok' : v >= 20 ? 'medio' : 'bajo';
        return `
        <div class="progress progreso-bateria mb-1">
            <div class="progress-bar ${clase}" style="width:${v}%"></div>
        </div>
        <small class="text-muted">🔋 ${v.toFixed(0)}%</small>`;
    };

    $('#vista').innerHTML = `
    <div class="card tarjeta">
        <div class="card-header"><i class="bi bi-person-bicycle me-1"></i> Flota de bicicletas eléctricas</div>
        <div class="card-body tabla-scroll p-0">
            <table class="table table-hover mb-0">
                <thead><tr><th>Código QR</th><th>Modelo</th><th>N° Serie</th><th>Batería</th><th>Kilometraje</th><th>Estación</th><th>Estado</th></tr></thead>
                <tbody>
                ${r.datos.bicicletas.map(b => `
                    <tr>
                        <td><strong>${b.codigo_qr}</strong></td>
                        <td>${b.modelo}</td>
                        <td><small class="text-muted">${b.num_serie}</small></td>
                        <td style="min-width:120px;">${barraBateria(b.nivel_bateria)}</td>
                        <td>${Number(b.kilometraje).toFixed(1)} km</td>
                        <td>${b.estacion ?? '—'}</td>
                        <td>${etiqueta(b.estado)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

/* ------------------------- USUARIOS (ADMIN) ------------------------- */

async function vistaUsuarios() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';
    const r = await api('usuarios.php', { accion: 'listar' });
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    $('#vista').innerHTML = `
    <div class="card tarjeta">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-people me-1"></i> Gestión de usuarios (RBAC)</span>
            <button class="btn btn-sm btn-dorado" id="btnNuevoUsuario"><i class="bi bi-person-plus"></i> Nuevo usuario</button>
        </div>
        <div class="card-body tabla-scroll p-0">
            <table class="table table-hover mb-0">
                <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Alquileres</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
                <tbody>
                ${r.datos.usuarios.map(u => `
                    <tr>
                        <td><strong>${u.nombre}</strong>${Number(u.es_cliente_frecuente) ? ' <i class="bi bi-star-fill" style="color:var(--dorado)"></i>' : ''}</td>
                        <td><small>${u.email}</small></td>
                        <td><small>${u.telefono ?? '—'}</small></td>
                        <td><span class="etiqueta ${u.codigo_rol === 'ADMIN' ? 'oscuro' : u.codigo_rol === 'CLIENTE' ? 'positivo' : 'info'}">${u.codigo_rol}</span></td>
                        <td>${u.cantidad_alquileres}</td>
                        <td>${etiqueta(u.estado)}</td>
                        <td class="text-end">
                            ${u.id_usuario != USUARIO.id ? `<button class="btn btn-sm btn-oliva btn-estado" data-id="${u.id_usuario}" data-estado="${u.estado}"><i class="bi bi-shield-lock"></i></button>` : ''}
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    $('#btnNuevoUsuario').addEventListener('click', modalCrearUsuario);
    document.querySelectorAll('.btn-estado').forEach(b => b.addEventListener('click', () => modalCambiarEstado(b.dataset.id, b.dataset.estado)));
}

async function modalCrearUsuario() {
    const r = await api('usuarios.php', { accion: 'roles' });
    if (!r.ok) return Swal.fire('Error', r.mensaje, 'error');

    const { value: form } = await Swal.fire({
        title: 'Nuevo usuario',
        width: 460,
        html: `
        <div class="swal-formulario">
            <label>Nombre completo</label>
            <input id="usNombre" class="form-control" placeholder="Nombre y apellido">
            <label>Email</label>
            <input id="usEmail" type="email" class="form-control" placeholder="usuario@ebike.com">
            <label>Teléfono</label>
            <input id="usTel" class="form-control" placeholder="3000000000">
            <label>Contraseña (mín. 8 caracteres)</label>
            <input id="usClave" type="password" class="form-control">
            <label>Rol</label>
            <select id="usRol" class="form-select">
                ${r.datos.roles.map(x => `<option value="${x.id_rol}">${x.codigo_rol} — ${x.nombre_rol}</option>`).join('')}
            </select>
        </div>`,
        showCancelButton: true, confirmButtonText: 'Crear', cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            nombre: document.getElementById('usNombre').value.trim(),
            email: document.getElementById('usEmail').value.trim(),
            telefono: document.getElementById('usTel').value.trim(),
            password: document.getElementById('usClave').value,
            rol_id: document.getElementById('usRol').value
        })
    });
    if (!form) return;

    const res = await api('usuarios.php', { accion: 'crear' }, 'POST', form);
    if (res.ok) { toast('success', res.mensaje); vistaUsuarios(); }
    else Swal.fire('No se pudo crear', res.mensaje, 'error');
}

async function modalCambiarEstado(id, estadoActual) {
    const { value: estado } = await Swal.fire({
        title: 'Cambiar estado del usuario',
        input: 'select',
        inputOptions: { ACTIVO: 'ACTIVO', INACTIVO: 'INACTIVO', BLOQUEADO: 'BLOQUEADO' },
        inputValue: estadoActual,
        showCancelButton: true, confirmButtonText: 'Aplicar', cancelButtonText: 'Cancelar'
    });
    if (!estado) return;

    const res = await api('usuarios.php', { accion: 'cambiar_estado' }, 'POST', { id_usuario: id, estado });
    if (res.ok) { toast('success', res.mensaje); vistaUsuarios(); }
    else Swal.fire('Error', res.mensaje, 'error');
}

/* ------------------------- MANTENIMIENTOS ------------------------- */

async function vistaMantenimientos() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';
    const r = await api('mantenimientos.php', { accion: 'listar' });
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    const puedeGestionar = ['ADMIN', 'TECNICO'].includes(USUARIO.rol);

    const totalOrdenes = r.datos.mantenimientos.length;
    const ordenesActivas = r.datos.mantenimientos.filter(m => !['FINALIZADO', 'CANCELADO'].includes(m.estado)).length;
    const costoAcumulado = r.datos.mantenimientos.reduce((s, m) => s + Number(m.costo), 0);

    const porTipo = {};
    const porEstado = {};
    r.datos.mantenimientos.forEach(m => {
        porTipo[m.tipo_manten] = (porTipo[m.tipo_manten] || 0) + 1;
        porEstado[m.estado] = (porEstado[m.estado] || 0) + 1;
    });

    $('#vista').innerHTML = `
    <div class="row mb-1">
        <div class="col-6 col-lg-4 mb-2">
            <div class="card tarjeta tarjeta-kpi variante-oliva h-100"><div class="card-body d-flex align-items-center gap-3">
                <div class="kpi-icono"><i class="bi bi-clipboard-check"></i></div>
                <div><div class="kpi-valor">${totalOrdenes}</div><p class="kpi-etiqueta mb-0">Órdenes totales</p></div>
            </div></div>
        </div>
        <div class="col-6 col-lg-4 mb-2">
            <div class="card tarjeta tarjeta-kpi variante-dorado h-100"><div class="card-body d-flex align-items-center gap-3">
                <div class="kpi-icono"><i class="bi bi-hourglass-split"></i></div>
                <div><div class="kpi-valor">${ordenesActivas}</div><p class="kpi-etiqueta mb-0">Órdenes activas</p></div>
            </div></div>
        </div>
        <div class="col-12 col-lg-4 mb-2">
            <div class="card tarjeta tarjeta-kpi variante-caro h-100"><div class="card-body d-flex align-items-center gap-3">
                <div class="kpi-icono"><i class="bi bi-cash-stack"></i></div>
                <div><div class="kpi-valor">${dinero(costoAcumulado)}</div><p class="kpi-etiqueta mb-0">Costo acumulado taller</p></div>
            </div></div>
        </div>
    </div>
    <div class="row mb-3">
        <div class="col-lg-4 mb-3">
            <div class="card tarjeta h-100">
                <div class="card-header"><i class="bi bi-pie-chart me-1"></i> Órdenes por tipo</div>
                <div class="card-body">
                    <div class="lienzo-canvas" style="height:230px;"><canvas id="canvasMantTipo"></canvas></div>
                </div>
            </div>
        </div>
        <div class="col-lg-8 mb-3">
            <div class="card tarjeta h-100">
                <div class="card-header"><i class="bi bi-bar-chart me-1"></i> Órdenes por estado</div>
                <div class="card-body">
                    <div class="lienzo-canvas" style="height:230px;"><canvas id="canvasMantEstado"></canvas></div>
                </div>
            </div>
        </div>
    </div>
    <div class="card tarjeta">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-tools me-1"></i> Órdenes de mantenimiento</span>
            ${puedeGestionar ? '<button class="btn btn-sm btn-dorado" id="btnNuevoMant"><i class="bi bi-plus-lg"></i> Nueva orden</button>' : ''}
        </div>
        <div class="card-body tabla-scroll p-0">
            <table class="table table-hover mb-0">
                <thead><tr><th>Bicicleta</th><th>Tipo</th><th>Técnico</th><th>Ingreso</th><th>Salida</th><th>Costo</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
                <tbody>
                ${r.datos.mantenimientos.length === 0 ? '<tr><td colspan="8" class="text-center text-muted py-4">Sin mantenimientos registrados</td></tr>' : ''}
                ${r.datos.mantenimientos.map(m => {
                    const abierto = !['FINALIZADO', 'CANCELADO'].includes(m.estado);
                    const btns = [`<button class="btn btn-sm btn-menta btn-ver-rep" data-id="${m.id_manten}" title="Ver repuestos"><i class="bi bi-eye"></i></button>`];
                    if (puedeGestionar && abierto) {
                        btns.push(`<button class="btn btn-sm btn-oliva btn-add-rep" data-id="${m.id_manten}" title="Agregar repuesto"><i class="bi bi-plus-circle"></i></button>`);
                        btns.push(`<button class="btn btn-sm btn-dorado btn-fin-mant" data-id="${m.id_manten}" title="Finalizar"><i class="bi bi-check2-circle"></i></button>`);
                        btns.push(`<button class="btn btn-sm btn-outline-danger btn-can-mant" data-id="${m.id_manten}" title="Cancelar"><i class="bi bi-x-lg"></i></button>`);
                    }
                    return `
                    <tr>
                        <td><strong>${m.codigo_qr}</strong><br><small class="text-muted">${m.modelo}</small></td>
                        <td>${m.tipo_manten}</td>
                        <td><small>${m.tecnico_nombre ?? 'Sin asignar'}</small></td>
                        <td><small>${fechaHora(m.fecha_ingreso)}</small></td>
                        <td><small>${fechaHora(m.fecha_salida)}</small></td>
                        <td><span class="texto-dinero">${dinero(m.costo)}</span><br><small class="text-muted">repuestos: ${dinero(m.costo_repuestos)}</small></td>
                        <td>${etiqueta(m.estado)}</td>
                        <td><div class="d-flex gap-1 justify-content-end">${btns.join('')}</div></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    $('#btnNuevoMant')?.addEventListener('click', modalCrearMantenimiento);
    document.querySelectorAll('.btn-ver-rep').forEach(b => b.addEventListener('click', () => verRepuestosMant(b.dataset.id)));
    document.querySelectorAll('.btn-add-rep').forEach(b => b.addEventListener('click', () => modalAgregarRepuesto(b.dataset.id)));
    document.querySelectorAll('.btn-fin-mant').forEach(b => b.addEventListener('click', () => finalizarMantenimiento(b.dataset.id)));
    document.querySelectorAll('.btn-can-mant').forEach(b => b.addEventListener('click', () => cancelarMantenimiento(b.dataset.id)));

    pintarGraficosMantenimientos(porTipo, porEstado);
    window.onresize = debonce(() => {
        if (VISTA === 'mantenimientos') pintarGraficosMantenimientos(porTipo, porEstado);
    }, 250);
}

function pintarGraficosMantenimientos(porTipo, porEstado) {
    graficoDona(
        $('#canvasMantTipo'),
        Object.entries(porTipo).map(([nombre, valor]) => ({ nombre: nombre.charAt(0) + nombre.slice(1).toLowerCase(), valor })),
        { leyenda: true }
    );
    graficoBarras(
        $('#canvasMantEstado'),
        Object.keys(porEstado).map(e => e.replaceAll('_', ' ')),
        Object.values(porEstado)
    );
}

async function modalCrearMantenimiento() {
    const bicis = await api('catalogos.php', { accion: 'bicicletas', todas: 1 });
    if (!bicis.ok) return Swal.fire('Error', bicis.mensaje, 'error');

    const { value: form } = await Swal.fire({
        title: 'Nueva orden de mantenimiento',
        width: 480,
        html: `
        <div class="swal-formulario">
            <label>Bicicleta</label>
            <select id="mtBici" class="form-select">
                ${bicis.datos.bicicletas.filter(b => b.estado !== 'ALQUILADA').map(b =>
                    `<option value="${b.id_bicicleta}">${b.modelo} · ${b.codigo_qr} (${b.estado})</option>`).join('')}
            </select>
            <label>Tipo de mantenimiento</label>
            <select id="mtTipo" class="form-select">
                ${['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'EMERGENCIA'].map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
            <label>Diagnóstico</label>
            <input id="mtDiag" class="form-control" placeholder="Ej. frenos desgastados">
            <label>Descripción del trabajo</label>
            <textarea id="mtDesc" class="form-control" rows="2" placeholder="Actividades a realizar"></textarea>
        </div>`,
        showCancelButton: true, confirmButtonText: 'Registrar', cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            id_bicicleta: document.getElementById('mtBici').value,
            tipo_manten: document.getElementById('mtTipo').value,
            diagnostico: document.getElementById('mtDiag').value.trim(),
            descripcion: document.getElementById('mtDesc').value.trim()
        })
    });
    if (!form) return;

    const res = await api('mantenimientos.php', { accion: 'crear' }, 'POST', form);
    if (res.ok) { toast('success', res.mensaje); vistaMantenimientos(); }
    else Swal.fire('No se pudo registrar', res.mensaje, 'error');
}

async function verRepuestosMant(id) {
    const r = await api('mantenimientos.php', { accion: 'repuestos', id_manten: id });
    if (!r.ok) return Swal.fire('Error', r.mensaje, 'error');
    const filas = r.datos.repuestos;
    Swal.fire({
        title: `Repuestos · Orden #${id}`,
        width: 480,
        html: `
        <div class="swal-formulario">
        ${filas.length === 0 ? '<p class="text-muted mb-0">Sin repuestos asignados.</p>' : `
        <table class="table table-sm">
            <thead><tr><th>Repuesto</th><th>Cant.</th><th>Unitario</th><th>Subtotal</th></tr></thead>
            <tbody>${filas.map(x => `
                <tr><td>${x.nombre_rep}</td><td>${x.cantidad}</td><td>${dinero(x.precio_unitario)}</td><td>${dinero(x.subtotal)}</td></tr>`).join('')}
            </tbody>
        </table>`}
        </div>`,
        confirmButtonText: 'Cerrar'
    });
}

async function modalAgregarRepuesto(id) {
    const r = await api('catalogos.php', { accion: 'repuestos' });
    if (!r.ok) return Swal.fire('Error', r.mensaje, 'error');
    if (r.datos.repuestos.length === 0) return Swal.fire('Atención', 'El inventario está vacío', 'warning');

    const { value: form } = await Swal.fire({
        title: `Agregar repuesto · Orden #${id}`,
        width: 440,
        html: `
        <div class="swal-formulario">
            <label>Repuesto</label>
            <select id="rpSel" class="form-select">
                ${r.datos.repuestos.map(x => `<option value="${x.id_repuesto}">${x.nombre_rep} · stock ${x.cantidad_disponible} · ${dinero(x.precio_actual)}</option>`).join('')}
            </select>
            <label>Cantidad</label>
            <input type="number" id="rpCant" class="form-control" min="1" value="1">
        </div>`,
        showCancelButton: true, confirmButtonText: 'Agregar', cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            id_manten: id,
            id_repuesto: document.getElementById('rpSel').value,
            cantidad: document.getElementById('rpCant').value
        })
    });
    if (!form) return;

    const res = await api('mantenimientos.php', { accion: 'agregar_repuesto' }, 'POST', form);
    if (res.ok) { toast('success', res.mensaje); vistaMantenimientos(); }
    else Swal.fire('No se pudo agregar', res.mensaje, 'error');
}

async function finalizarMantenimiento(id) {
    const r = await Swal.fire({
        title: `¿Finalizar orden #${id}?`,
        text: 'La bicicleta volverá a estado DISPONIBLE y se registrará la auditoría.',
        icon: 'question', showCancelButton: true, confirmButtonText: 'Finalizar', cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;

    const res = await api('mantenimientos.php', { accion: 'finalizar' }, 'POST', { id_manten: id });
    if (res.ok) { toast('success', res.mensaje); vistaMantenimientos(); }
    else Swal.fire('Error', res.mensaje, 'error');
}

async function cancelarMantenimiento(id) {
    const r = await Swal.fire({
        title: `¿Cancelar orden #${id}?`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#b04a3a', confirmButtonText: 'Cancelar orden', cancelButtonText: 'Volver'
    });
    if (!r.isConfirmed) return;

    const res = await api('mantenimientos.php', { accion: 'cancelar' }, 'POST', { id_manten: id });
    if (res.ok) { toast('success', res.mensaje); vistaMantenimientos(); }
    else Swal.fire('Error', res.mensaje, 'error');
}

/* ------------------------- INVENTARIO ------------------------- */

async function vistaInventario() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';
    const r = await api('inventario.php', { accion: 'listar' });
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    const puedeGestionar = ['ADMIN', 'TECNICO'].includes(USUARIO.rol);

    $('#vista').innerHTML = `
    <div class="card tarjeta">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-box-seam me-1"></i> Inventario de repuestos</span>
            ${puedeGestionar ? '<button class="btn btn-sm btn-dorado" id="btnNuevoRep"><i class="bi bi-plus-lg"></i> Nuevo repuesto</button>' : ''}
        </div>
        <div class="card-body tabla-scroll p-0">
            <table class="table table-hover mb-0">
                <thead><tr><th>Repuesto</th><th>Proveedor</th><th>Stock</th><th>Precio venta</th><th>Costo total</th><th class="text-end">Acciones</th></tr></thead>
                <tbody>
                ${r.datos.repuestos.map(x => `
                    <tr>
                        <td><strong>${x.nombre_rep}</strong></td>
                        <td><small>${x.proveedor ?? '—'}</small></td>
                        <td>${Number(x.cantidad_disponible) === 0 ? '<span class="etiqueta peligro">AGOTADO</span>' : `<span class="etiqueta ${x.cantidad_disponible < 5 ? 'reserva' : 'positivo'}">${x.cantidad_disponible} u.</span>`}</td>
                        <td>${dinero(x.precio_actual)}</td>
                        <td><span class="texto-dinero">${dinero(x.costo_repuestos + x.costo_mano_obra)}</span><br><small class="text-muted">rep: ${dinero(x.costo_repuestos)} · mo: ${dinero(x.costo_mano_obra)}</small></td>
                        <td class="text-end">
                            ${puedeGestionar ? `<button class="btn btn-sm btn-oliva btn-edit-rep" data-rep='${encodeURIComponent(JSON.stringify(x))}'><i class="bi bi-pencil"></i></button>` : ''}
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    $('#btnNuevoRep')?.addEventListener('click', () => modalRepuesto(null));
    document.querySelectorAll('.btn-edit-rep').forEach(b => b.addEventListener('click', () => modalRepuesto(JSON.parse(decodeURIComponent(b.dataset.rep)))));
}

async function modalRepuesto(rep) {
    const esNuevo = !rep;
    const { value: form } = await Swal.fire({
        title: esNuevo ? 'Nuevo repuesto' : `Editar: ${rep.nombre_rep}`,
        width: 480,
        html: `
        <div class="swal-formulario">
            <label>Nombre</label>
            <input id="rvNombre" class="form-control" value="${rep?.nombre_rep ?? ''}">
            <label>Proveedor</label>
            <input id="rvProv" class="form-control" value="${rep?.proveedor ?? ''}">
            <label>Cantidad disponible</label>
            <input type="number" id="rvCant" class="form-control" min="0" value="${rep?.cantidad_disponible ?? 0}">
            <label>Precio de venta</label>
            <input type="number" id="rvPrecio" class="form-control" min="0" step="100" value="${rep?.precio_actual ?? 0}">
            <label>Costo repuestos</label>
            <input type="number" id="rvCRep" class="form-control" min="0" step="100" value="${rep?.costo_repuestos ?? 0}">
            <label>Costo mano de obra</label>
            <input type="number" id="rvCMo" class="form-control" min="0" step="100" value="${rep?.costo_mano_obra ?? 0}">
        </div>`,
        showCancelButton: true, confirmButtonText: esNuevo ? 'Crear' : 'Guardar', cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            id_repuesto: rep?.id_repuesto,
            nombre_rep: document.getElementById('rvNombre').value.trim(),
            proveedor: document.getElementById('rvProv').value.trim(),
            cantidad_disponible: document.getElementById('rvCant').value,
            precio_actual: document.getElementById('rvPrecio').value,
            costo_repuestos: document.getElementById('rvCRep').value,
            costo_mano_obra: document.getElementById('rvCMo').value
        })
    });
    if (!form) return;

    const res = await api('inventario.php', { accion: esNuevo ? 'crear' : 'actualizar' }, 'POST', form);
    if (res.ok) { toast('success', res.mensaje); vistaInventario(); }
    else Swal.fire('Error', res.mensaje, 'error');
}

/* ------------------------- ALERTAS ENERGÍA ------------------------- */

async function vistaAlertas() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';
    const r = await api('alertas.php', { accion: 'listar' });
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    const puedeGestionar = ['ADMIN', 'TECNICO'].includes(USUARIO.rol);

    $('#vista').innerHTML = `
    <div class="card tarjeta">
        <div class="card-header"><i class="bi bi-exclamation-triangle me-1"></i> Alertas energéticas (generadas por triggers)</div>
        <div class="card-body tabla-scroll p-0">
            <table class="table table-hover mb-0">
                <thead><tr><th>Batería</th><th>Tipo</th><th>Descripción</th><th>Prioridad</th><th>Fecha</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
                <tbody>
                ${r.datos.alertas.length === 0 ? '<tr><td colspan="7" class="text-center text-muted py-4">No hay alertas registradas 🎉</td></tr>' : ''}
                ${r.datos.alertas.map(a => {
                    const btns = [];
                    if (puedeGestionar && a.estado_alerta === 'PENDIENTE')
                        btns.push(`<button class="btn btn-sm btn-dorado btn-atender" data-id="${a.id_alerta}"><i class="bi bi-check2"></i> Atender</button>`);
                    if (puedeGestionar && a.estado_alerta !== 'CERRADA')
                        btns.push(`<button class="btn btn-sm btn-oliva btn-cerrar" data-id="${a.id_alerta}"><i class="bi bi-lock"></i> Cerrar</button>`);
                    return `
                    <tr>
                        <td><strong>${a.codigo_bateria}</strong><br><small class="text-muted">${Number(a.capacidad_wh).toFixed(0)} Wh</small></td>
                        <td><small>${a.tipo_alerta.replaceAll('_', ' ')}</small></td>
                        <td><small>${a.descripcion}</small></td>
                        <td>${etiqueta(a.nivel_prioridad)}</td>
                        <td><small>${fechaHora(a.fecha_alerta)}</small></td>
                        <td>${etiqueta(a.estado_alerta)}</td>
                        <td class="text-end"><div class="d-flex gap-1 justify-content-end">${btns.join('') || '—'}</div></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    document.querySelectorAll('.btn-atender').forEach(b => b.addEventListener('click', async () => {
        const res = await api('alertas.php', { accion: 'atender' }, 'POST', { id_alerta: b.dataset.id });
        if (res.ok) { toast('success', res.mensaje); vistaAlertas(); } else Swal.fire('Error', res.mensaje, 'error');
    }));
    document.querySelectorAll('.btn-cerrar').forEach(b => b.addEventListener('click', async () => {
        const res = await api('alertas.php', { accion: 'cerrar' }, 'POST', { id_alerta: b.dataset.id });
        if (res.ok) { toast('success', res.mensaje); vistaAlertas(); } else Swal.fire('Error', res.mensaje, 'error');
    }));
}

/* ------------------------- PERFIL + MEDIOS DE PAGO ------------------------- */

async function vistaPerfil() {
    $('#vista').innerHTML = '<div class="text-center py-5"><div class="spinner-border" style="color:var(--verde-caro)"></div></div>';

    const r = await api('usuarios.php', { accion: 'perfil_get' });
    if (!r.ok) { $('#vista').innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }
    const u = r.datos.usuario;

    $('#vista').innerHTML = `
    <div class="row">
        <div class="col-lg-6 mb-3">
            <div class="card tarjeta h-100">
                <div class="card-header"><i class="bi bi-person-gear me-1"></i> Datos personales</div>
                <div class="card-body">
                    <div class="d-flex align-items-center gap-3 mb-3">
                        <div class="avatar" style="width:56px;height:56px;font-size:1.2rem;">${iniciales(u.nombre)}</div>
                        <div>
                            <h6 class="mb-0">${u.nombre} ${u.frecuente ? '<i class="bi bi-star-fill" style="color:var(--dorado)"></i>' : ''}</h6>
                            <small class="text-muted">${u.email} · ${u.nombre_rol}</small>
                        </div>
                    </div>
                    <form id="formPerfil">
                        <div class="mb-2">
                            <label class="form-label" style="font-size:.82rem;font-weight:600;color:var(--verde-caro);">Teléfono</label>
                            <input id="pfTel" class="form-control" value="${u.telefono ?? ''}">
                        </div>
                        <hr>
                        <div class="mb-2">
                            <label class="form-label" style="font-size:.82rem;font-weight:600;color:var(--verde-caro);">Cambiar contraseña</label>
                            <input id="pfActual" type="password" class="form-control mb-2" placeholder="Contraseña actual">
                            <input id="pfNueva" type="password" class="form-control" placeholder="Nueva contraseña (mín. 8)">
                        </div>
                        <button class="btn btn-verde-caro w-100"><i class="bi bi-save"></i> Guardar cambios</button>
                    </form>
                </div>
            </div>
        </div>
        <div class="col-lg-6 mb-3" id="zonaPagos"></div>
    </div>`;

    $('#formPerfil').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const res = await api('usuarios.php', { accion: 'perfil_guardar' }, 'POST', {
            telefono: $('#pfTel').value.trim(),
            password_actual: $('#pfActual').value,
            password_nueva: $('#pfNueva').value
        });
        if (res.ok) { toast('success', res.mensaje); USUARIO.telefono = $('#pfTel').value.trim(); vistaPerfil(); }
        else Swal.fire('Error', res.mensaje, 'error');
    });

    if (USUARIO.rol === 'CLIENTE') await pintarMediosPago();
}

async function pintarMediosPago() {
    const r = await api('pagos.php', { accion: 'listar' });
    const zona = document.getElementById('zonaPagos');
    if (!r.ok) { zona.innerHTML = `<div class="alert alert-danger">${r.mensaje}</div>`; return; }

    zona.innerHTML = `
    <div class="card tarjeta h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-credit-card me-1"></i> Medios de pago</span>
            <button class="btn btn-sm btn-dorado" id="btnNuevoPago"><i class="bi bi-plus-lg"></i> Agregar</button>
        </div>
        <div class="card-body p-0">
            <table class="table table-hover mb-0">
                <thead><tr><th>Tipo</th><th>Estado</th><th>Desde</th><th class="text-end">Acción</th></tr></thead>
                <tbody>
                ${r.datos.metodos.length === 0 ? '<tr><td colspan="4" class="text-center text-muted py-4">Sin medios de pago</td></tr>' : ''}
                ${r.datos.metodos.map(m => `
                    <tr>
                        <td><strong>${m.tipo.replaceAll('_', ' ')}</strong></td>
                        <td>${Number(m.activo) ? '<span class="etiqueta positivo">ACTIVO</span>' : '<span class="etiqueta peligro">INACTIVO</span>'}</td>
                        <td><small>${fechaHora(m.fecha_creacion)}</small></td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-oliva btn-alt-pago" data-id="${m.id_metodo}"><i class="bi bi-arrow-repeat"></i></button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    $('#btnNuevoPago').addEventListener('click', async () => {
        const { value: tipo } = await Swal.fire({
            title: 'Agregar medio de pago',
            input: 'select',
            inputOptions: {
                EFECTIVO: 'Efectivo', TARJETA_CREDITO: 'Tarjeta de crédito', TARJETA_DEBITO: 'Tarjeta débito',
                PSE: 'PSE', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata', OTRO: 'Otro'
            },
            showCancelButton: true, confirmButtonText: 'Agregar', cancelButtonText: 'Cancelar'
        });
        if (!tipo) return;
        const res = await api('pagos.php', { accion: 'crear' }, 'POST', { tipo });
        if (res.ok) { toast('success', res.mensaje); pintarMediosPago(); } else Swal.fire('Error', res.mensaje, 'error');
    });

    document.querySelectorAll('.btn-alt-pago').forEach(b => b.addEventListener('click', async () => {
        const res = await api('pagos.php', { accion: 'alternar' }, 'POST', { id_metodo: b.dataset.id });
        if (res.ok) { toast('success', res.mensaje); pintarMediosPago(); } else Swal.fire('Error', res.mensaje, 'error');
    }));
}

/* ------------------------- INICIO ------------------------- */

(async function iniciar() {
    const r = await api('auth.php', { accion: 'me' });
    if (r.ok) { USUARIO = r.datos.usuario; mostrarApp(); }
    else mostrarLogin();
})();
