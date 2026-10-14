/* ============================================================
   GRÁFICOS CANVAS (HTML5 Canvas) — SDD §2 / §4
   Motor propio de renderizado: barras y dona, animados e
   interactivos (tooltip al pasar el mouse). Lienzos de tamaño
   estable: el alto lo fija CSS (height:100%) y el buffer interno
   se ajusta por devicePixelRatio, sin crecer en cada redibujado.
   ============================================================ */

'use strict';

const PALETA_CANVAS = {
    caro:   '#0f3d2e',
    caro2:  '#14523d',
    menta:  '#bfe6d8',
    menta2: '#9dd8c2',
    oliva:  '#7a8b3f',
    oliva2: '#94a55a',
    dorado: '#d4af37',
    dorado2:'#e6c964',
    tinta:  '#17332a',
    error:  '#b04a3a',
    cuadricula: 'rgba(15, 61, 46, .12)',
    texto:  '#5c7268'
};

const COLORES_SERIE = [PALETA_CANVAS.caro, PALETA_CANVAS.oliva, PALETA_CANVAS.dorado, PALETA_CANVAS.menta2, PALETA_CANVAS.caro2, PALETA_CANVAS.oliva2, PALETA_CANVAS.error];

function prepararCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const ancho = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
    const alto = canvas.clientHeight || canvas.parentElement.clientHeight || 200;
    canvas.width = Math.max(10, Math.round(ancho * dpr));
    canvas.height = Math.max(10, Math.round(alto * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, ancho, alto };
}

function crearTooltip(canvas) {
    let tip = canvas.parentElement.querySelector('.tooltip-canvas');
    if (!tip) {
        tip = document.createElement('div');
        tip.className = 'tooltip-canvas';
        canvas.parentElement.appendChild(tip);
    }
    return tip;
}

/* Escala con incrementos "redondos" (1, 2, 5 × 10^n) para que
   las etiquetas del eje Y nunca se repitan ni usen decimales. */
function escalaAgradable(maxValor) {
    if (maxValor <= 0) return { max: 1, paso: 1 };
    if (maxValor <= 5) return { max: maxValor, paso: 1 };
    const bruto = maxValor / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const norm = bruto / mag;
    const paso = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const max = Math.ceil(maxValor / paso) * paso;
    return { max, paso };
}

/* ------------------- GRÁFICO DE BARRAS ------------------- */
function graficoBarras(canvas, etiquetas, valores, { formatoValor = (v) => v } = {}) {
    const tip = crearTooltip(canvas);
    const datos = etiquetas.map((e, i) => ({ e, v: valores[i] || 0 }));
    const { max, paso } = escalaAgradable(Math.max(...datos.map(d => d.v), 1));

    let progreso = 0;
    let frameId = null;
    let inicio = null;
    let geometria = [];

    function dibujar(p) {
        const { ctx, ancho, alto } = prepararCanvas(canvas);
        const pad = { sup: 30, der: 14, inf: 38, izq: 46 };
        const areaAncho = ancho - pad.izq - pad.der;
        const areaAlto = alto - pad.sup - pad.inf;
        const n = datos.length;
        const pasoX = areaAncho / Math.max(n, 1);
        const anchoBarra = Math.min(pasoX * 0.62, 46);

        ctx.clearRect(0, 0, ancho, alto);
        geometria = [];

        /* Rejilla y etiquetas del eje Y (valores únicos, sin decimales) */
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.lineWidth = 1;
        for (let v = 0; v <= max + 1e-9; v += paso) {
            const y = pad.sup + areaAlto - (v / max) * areaAlto;
            ctx.strokeStyle = v === 0 ? 'rgba(15, 61, 46, .28)' : PALETA_CANVAS.cuadricula;
            ctx.beginPath();
            ctx.moveTo(pad.izq, y);
            ctx.lineTo(ancho - pad.der, y);
            ctx.stroke();
            ctx.fillStyle = PALETA_CANVAS.texto;
            ctx.textAlign = 'right';
            ctx.fillText(String(Math.round(v)), pad.izq - 7, y + 3.5);
        }

        /* Barras */
        const valorMaximo = Math.max(...datos.map(d => d.v));
        const mostrarValor = n <= 20;

        datos.forEach((d, i) => {
            const x = pad.izq + pasoX * i + (pasoX - anchoBarra) / 2;
            const h = Math.min((d.v / max) * areaAlto * p, areaAlto);
            const y = pad.sup + areaAlto - h;

            const gradiente = ctx.createLinearGradient(0, y, 0, pad.sup + areaAlto);
            if (d.v === valorMaximo && d.v > 0) {
                gradiente.addColorStop(0, PALETA_CANVAS.dorado2);
                gradiente.addColorStop(1, PALETA_CANVAS.dorado);
            } else {
                gradiente.addColorStop(0, PALETA_CANVAS.oliva2);
                gradiente.addColorStop(1, PALETA_CANVAS.oliva);
            }

            ctx.fillStyle = gradiente;
            const radio = Math.min(5, anchoBarra / 2, Math.max(h, 0.01));
            ctx.beginPath();
            ctx.moveTo(x, pad.sup + areaAlto);
            ctx.lineTo(x, y + radio);
            if (h > radio) ctx.arcTo(x, y, x + radio, y, radio);
            ctx.arcTo(x + anchoBarra, y, x + anchoBarra, y + radio, radio);
            ctx.lineTo(x + anchoBarra, pad.sup + areaAlto);
            ctx.closePath();
            ctx.fill();

            geometria.push({ x, y, w: anchoBarra, h: Math.max(h, 1), dato: d });

            /* Valor sobre la barra */
            if (mostrarValor && p > 0.95) {
                ctx.fillStyle = PALETA_CANVAS.caro;
                ctx.font = '700 10.5px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(formatoValor(d.v), x + anchoBarra / 2, y - 6);
            }

            /* Etiqueta del eje X (sin solaparse) */
            ctx.fillStyle = PALETA_CANVAS.texto;
            ctx.font = '9.5px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            if (n <= 12 || i % Math.ceil(n / 12) === 0) {
                const etiqueta = d.e.length > 8 && n > 12 ? d.e.slice(0, 5) : d.e;
                ctx.fillText(etiqueta, x + anchoBarra / 2, pad.sup + areaAlto + 15);
            }
        });
    }

    canvas.onmousemove = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
        const hit = geometria.find(g => mx >= g.x - 2 && mx <= g.x + g.w + 2 && my >= g.y - 8 && my <= g.y + g.h);
        if (hit) {
            tip.style.display = 'block';
            tip.style.left = (hit.x + hit.w / 2) + 'px';
            tip.style.top = Math.max(hit.y, 12) + 'px';
            tip.innerHTML = `${hit.dato.e}<br><strong>${formatoValor(hit.dato.v)}</strong>`;
            canvas.style.cursor = 'pointer';
        } else {
            tip.style.display = 'none';
            canvas.style.cursor = 'default';
        }
    };
    canvas.onmouseleave = () => { tip.style.display = 'none'; };

    if (frameId) cancelAnimationFrame(frameId);
    let inicioTs = null;
    (function animar(ts) {
        if (inicioTs === null) inicioTs = ts;
        progreso = Math.min((ts - inicioTs) / 550, 1);
        dibujar(1 - Math.pow(1 - progreso, 3));
        if (progreso < 1) frameId = requestAnimationFrame(animar);
    })(performance.now());
}

/* ------------------- GRÁFICO DE DONA ------------------- */
function graficoDona(canvas, segmentos, { formatoValor = (v) => v, leyenda = true } = {}) {
    const tip = crearTooltip(canvas);
    const total = segmentos.reduce((s, x) => s + x.valor, 0);

    let progreso = 0;
    let frameId = null;
    let geometria = [];

    /* Leyenda HTML bajo el lienzo (se regenera en cada llamada) */
    if (leyenda) {
        canvas.parentElement.nextElementSibling?.classList.contains('leyenda-canvas')
            ? canvas.parentElement.nextElementSibling.remove() : null;
        const div = document.createElement('div');
        div.className = 'leyenda-canvas';
        div.innerHTML = segmentos.map((seg, i) =>
            `<span><i style="background:${COLORES_SERIE[i % COLORES_SERIE.length]}"></i>${seg.nombre} (${seg.valor})</span>`
        ).join('');
        canvas.parentElement.insertAdjacentElement('afterend', div);
    }

    function dibujar(p) {
        const { ctx, ancho, alto } = prepararCanvas(canvas);
        ctx.clearRect(0, 0, ancho, alto);

        const cx = ancho / 2;
        const cy = alto / 2;
        const radio = Math.min(ancho, alto) / 2 - 10;
        const grosor = radio * 0.42;

        geometria = [];
        let angulo = -Math.PI / 2;

        if (total === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, radio - grosor / 2, 0, Math.PI * 2);
            ctx.strokeStyle = PALETA_CANVAS.menta;
            ctx.lineWidth = grosor;
            ctx.stroke();
            ctx.fillStyle = PALETA_CANVAS.texto;
            ctx.font = '12px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sin datos', cx, cy + 4);
            return;
        }

        segmentos.forEach((seg, i) => {
            const porcion = (seg.valor / total) * Math.PI * 2 * p;
            ctx.beginPath();
            ctx.arc(cx, cy, radio - grosor / 2, angulo, angulo + porcion);
            ctx.strokeStyle = COLORES_SERIE[i % COLORES_SERIE.length];
            ctx.lineWidth = grosor;
            ctx.stroke();
            geometria.push({ inicio: angulo, fin: angulo + porcion, seg });
            angulo += porcion;
        });

        ctx.fillStyle = PALETA_CANVAS.caro;
        ctx.font = '700 1.35rem "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.round(total * p)), cx, cy - 2);
        ctx.fillStyle = PALETA_CANVAS.texto;
        ctx.font = '10.5px "Segoe UI", sans-serif';
        ctx.fillText('TOTAL', cx, cy + 14);
    }

    canvas.onmousemove = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left - rect.width / 2;
        const my = ev.clientY - rect.top - rect.height / 2;
        const radio = Math.min(rect.width, rect.height) / 2 - 10;
        const dist = Math.hypot(mx, my);

        if (total > 0 && dist > radio * 0.5 && dist < radio) {
            let ang = Math.atan2(my, mx);
            if (ang < -Math.PI / 2) ang += Math.PI * 2;
            const hit = geometria.find(g => ang >= g.inicio && ang <= g.fin);
            if (hit) {
                tip.style.display = 'block';
                tip.style.left = (rect.width / 2 + mx * 0.7) + 'px';
                tip.style.top = (rect.height / 2 + my * 0.7) + 'px';
                tip.innerHTML = `${hit.seg.nombre}<br><strong>${formatoValor(hit.seg.valor)}</strong> (${Math.round((hit.seg.valor / total) * 100)}%)`;
                canvas.style.cursor = 'pointer';
                return;
            }
        }
        tip.style.display = 'none';
        canvas.style.cursor = 'default';
    };
    canvas.onmouseleave = () => { tip.style.display = 'none'; };

    if (frameId) cancelAnimationFrame(frameId);
    let inicioTs = null;
    (function animar(ts) {
        if (inicioTs === null) inicioTs = ts;
        progreso = Math.min((ts - inicioTs) / 600, 1);
        dibujar(1 - Math.pow(1 - progreso, 3));
        if (progreso < 1) frameId = requestAnimationFrame(animar);
    })(performance.now());
}
