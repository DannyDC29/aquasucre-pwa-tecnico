let tecnicoId = null, actual = null;
const $ = id => document.getElementById(id);

async function api(url, opt) {
    let r = await fetch(url, opt);
    let d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Error en la petición');
    return d;
}

async function cargarTecnicos() {
    try {
        (await api('/api/tecnicos')).forEach(t => {
            $('tecnico').insertAdjacentHTML('beforeend', `<option value="${t.id_tecnico}">${t.nombre}</option>`);
        });
    } catch (e) { mensaje(e.message); }
}

function entrar() {
    tecnicoId = +$('tecnico').value;
    if (!tecnicoId) return mensaje('Seleccione un técnico');
    $('login').hidden = true;
    $('lista').hidden = false;
    cargarOrdenes();
}

function salir() {
    tecnicoId = null;
    $('lista').hidden = true;
    $('login').hidden = false;
}

async function cargarOrdenes() {
    try {
        let os = await api(`/api/ordenes?id_tecnico=${tecnicoId}`);
        $('ordenes').innerHTML = os.length ? '' : 'No hay órdenes asignadas.';
        os.forEach(o => {
            const jsonStr = JSON.stringify(o).replace(/'/g, "&apos;");
            $('ordenes').insertAdjacentHTML('beforeend', 
                `<div class="card" onclick='abrir(${jsonStr})'>
                    <b>OT #${o.id_ot}</b><br>
                    ${o.tipo_servicio || 'Servicio'}<br>
                    <span class="estado">${o.estado}</span> · ${o.prioridad || 'Normal'}
                </div>`
            );
        });
    } catch (e) { mensaje(e.message); }
}

function abrir(o) {
    actual = o;
    $('lista').hidden = true;
    $('detalle').hidden = false;
    $('datos').innerHTML = `
        <h2>OT #${o.id_ot}</h2>
        <p><b>PQR:</b> ${o.id_pqr || ''}</p>
        <p><b>Servicio:</b> ${o.tipo_servicio || ''}</p>
        <p><b>Descripción:</b> ${o.descripcion || ''}</p>
        <p><b>Dirección:</b> ${o.direccion || ''}</p>
        <p><b>Prioridad:</b> ${o.prioridad || ''}</p>
        <p><b>Estado:</b> <span class="estado">${o.estado}</span></p>
    `;

    const est = (o.estado || '').toUpperCase();
    
    // El botón 'Iniciar' sólo se ve si está ASIGNADA o PENDIENTE
    $('btnIniciar').hidden = (est === 'EN_ATENCION' || est === 'EN_PROCESO' || est === 'FINALIZADA');
    
    // El formulario del reporte se muestra en EN_ATENCION o EN_PROCESO
    $('form').hidden = (est !== 'EN_ATENCION' && est !== 'EN_PROCESO');

    $('diagnostico').value = o.diagnostico || '';
    $('trabajo').value = o.trabajo_realizado \vert{}\vert{} '';$('observaciones').value = o.observaciones || '';
}

function volver() {
    $('detalle').hidden = true;
    $('lista').hidden = false;
    cargarOrdenes();
}

async function iniciar() {
    try {
        let res = await api(`/api/ordenes/${actual.id_ot}/iniciar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_tecnico: tecnicoId })
        });
        actual.estado = res.estado || 'EN_ATENCION';
        mensaje('Trabajo iniciado con éxito (EN_ATENCION)');
        abrir(actual); // Refresca la vista para mostrar el formulario del reporte
    } catch (e) { mensaje(e.message); }
}

function payload() {
    return {
        id_tecnico: tecnicoId,
        diagnostico: $('diagnostico').value,
        trabajo_realizado: $('trabajo').value,
        observaciones: $('observaciones').value
    };
}

async function guardar() {
    try {
        await api(`/api/ordenes/${actual.id_ot}/reporte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload())
        });
        mensaje('Información de bitácora guardada');
    } catch (e) { mensaje(e.message); }
}

async function finalizar() {
    if (!confirm('¿Desea dar por finalizada esta Orden de Trabajo?')) return;
    try {
        await api(`/api/ordenes/${actual.id_ot}/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload())
        });
        mensaje('Orden de trabajo FINALIZADA exitosamente');
        volver();
    } catch (e) { mensaje(e.message); }
}

function mensaje(x) {
    $('msg').textContent = x;
    setTimeout(() => $('msg').textContent = '', 4000);
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/static/service-worker.js');
cargarTecnicos();
