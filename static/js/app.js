let tecnicoId=null, actual=null; const $=id=>document.getElementById(id);

async function api(url,opt){
    let r = await fetch(url,opt);
    let d;
    try {
        d = await r.json();
    } catch(err) {
        throw new Error('Error al conectar con el servidor (HTTP ' + r.status + ')');
    }
    if(!r.ok) throw new Error(d.error || ('Error HTTP ' + r.status));
    return d;
}

async function cargarTecnicos(){
    try{
        let lista = await api('/api/tecnicos');
        let select = $('tecnico');
        select.innerHTML = '<option value="">Seleccione...</option>';
        if(Array.isArray(lista) && lista.length > 0) {
            lista.forEach(t=>select.insertAdjacentHTML('beforeend',`<option value="${t.id_tecnico}">${t.nombre}</option>`));
        } else {
            mensaje('No se encontraron técnicos en la base de datos.');
        }
    }catch(e){
        mensaje('Error: ' + e.message);
    }
}

function entrar(){
    tecnicoId=+$('tecnico').value;
    if(!tecnicoId)return mensaje('Seleccione un técnico');
    $('login').hidden=true;
    $('lista').hidden=false;
    cargarOrdenes();
}

function salir(){
    tecnicoId=null;
    $('lista').hidden=true;
    $('login').hidden=false;
}

async function cargarOrdenes(){
    try{
        let os=await api(`/api/ordenes?id_tecnico=${tecnicoId}`);
        $('ordenes').innerHTML=os.length?'':'No hay órdenes asignadas.';
        os.forEach(o=>{$('ordenes').insertAdjacentHTML('beforeend',`<div class="card" onclick='abrir(${JSON.stringify(o)})'><b>OT #${o.id_ot}</b><br>${o.tipo_servicio||'Servicio'}<br><span class="estado">${o.estado}</span> · ${o.prioridad||'Normal'}</div>`)});
    }catch(e){mensaje(e.message);}
}

function abrir(o){
    actual=o;
    $('lista').hidden=true;
    $('detalle').hidden=false;
    $('datos').innerHTML=`<h2>OT #${o.id_ot}</h2><p><b>PQR:</b> ${o.id_pqr||''}</p><p><b>Servicio:</b> ${o.tipo_servicio||''}</p><p><b>Descripción:</b> ${o.descripcion||''}</p><p><b>Dirección:</b> ${o.direccion||''}</p><p><b>Prioridad:</b> ${o.prioridad||''}</p><p><b>Estado:</b> ${o.estado}</p>`;
    let est = (o.estado||'').toUpperCase();
    $('btnIniciar').hidden = (est === 'EN_PROCESO' || est === 'EN_ATENCION' || est === 'FINALIZADA');
    $('form').hidden = (est !== 'EN_PROCESO' && est !== 'EN_ATENCION');$('diagnostico').value=o.diagnostico||'';
    $('trabajo').value=o.trabajo_realizado\vert{}\vert{}'';$('observaciones').value=o.observaciones||'';
}

function volver(){
    $('detalle').hidden=true;
    $('lista').hidden=false;
    cargarOrdenes();
}

async function iniciar(){
    try{
        await api(`/api/ordenes/${actual.id_ot}/iniciar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id_tecnico:tecnicoId})});
        mensaje('Trabajo iniciado');
        volver();
    }catch(e){mensaje(e.message);}
}

function payload(){
    return {id_tecnico:tecnicoId,diagnostico:$('diagnostico').value,trabajo_realizado:$('trabajo').value,observaciones:$('observaciones').value};
}

async function guardar(){
    try{
        await api(`/api/ordenes/${actual.id_ot}/reporte`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
        mensaje('Información guardada');
    }catch(e){mensaje(e.message);}
}

async function finalizar(){
    if(!confirm('¿Finalizar esta orden?'))return;
    try{
        await api(`/api/ordenes/${actual.id_ot}/finalizar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
        mensaje('Orden finalizada');
        volver();
    }catch(e){mensaje(e.message);}
}

function mensaje(x){
    $('msg').textContent=x;
    setTimeout(()=>$('msg').textContent='',6000);
}

// Desregistrar Service Worker previo para evitar caché corrupta en el navegador
if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(rs=>{
        for(let r of rs) r.unregister();
    });
}

cargarTecnicos();
