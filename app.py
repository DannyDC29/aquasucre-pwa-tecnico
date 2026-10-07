from flask import Flask, render_template, jsonify, request
import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

def conexion():
    db_url = os.environ.get('DATABASE_URL', '')
    # Elimina el parámetro channel_binding de Neon si viene presente en la URL de Render
    db_url = re.sub(r'([?&])channel_binding=[^&]*(&|$)', r'\1', db_url).rstrip('?&')
    return psycopg2.connect(db_url, cursor_factory=RealDictCursor)

@app.get('/')
def inicio():
    return render_template('index.html')

@app.get('/api/tecnicos')
def tecnicos():
    try:
        with conexion() as cn, cn.cursor() as cur:
            cur.execute("SELECT id_tecnico, nombre FROM tecnicos ORDER BY id_tecnico")
            return jsonify(cur.fetchall())
    except Exception as e:
        print("Error en /api/tecnicos:", e)
        return jsonify({'error': str(e)}), 500

@app.get('/api/ordenes')
def ordenes():
    id_tecnico = request.args.get('id_tecnico', type=int)
    if not id_tecnico:
        return jsonify({'error':'id_tecnico requerido'}), 400
    try:
        with conexion() as cn, cn.cursor() as cur:
            cur.execute('''SELECT id_ot, id_pqr, tipo_servicio, descripcion, direccion, prioridad, estado,
                                  fecha_inicio, fecha_finalizacion, diagnostico, trabajo_realizado, observaciones
                           FROM ordenes_trabajo WHERE id_tecnico=%s OR id_tecnico::text=%s
                           ORDER BY fecha_creacion DESC''', (id_tecnico, str(id_tecnico)))
            return jsonify(cur.fetchall())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.post('/api/ordenes/<int:id_ot>/iniciar')
def iniciar(id_ot):
    try:
        with conexion() as cn, cn.cursor() as cur:
            cur.execute("""UPDATE ordenes_trabajo SET estado='EN_ATENCION', fecha_inicio=NOW()
                           WHERE id_ot=%s
                           RETURNING id_ot, estado, fecha_inicio""", (id_ot,))
            fila = cur.fetchone()
            if not fila:
                return jsonify({'error':'No se pudo iniciar la OT'}), 409
            cn.commit()
            return jsonify(fila)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.put('/api/ordenes/<int:id_ot>/reporte')
def reporte(id_ot):
    data = request.get_json(silent=True) or {}
    try:
        with conexion() as cn, cn.cursor() as cur:
            cur.execute('''UPDATE ordenes_trabajo SET diagnostico=%s, trabajo_realizado=%s, observaciones=%s
                           WHERE id_ot=%s RETURNING id_ot''',
                        (data.get('diagnostico'), data.get('trabajo_realizado'), data.get('observaciones'), id_ot))
            if not cur.fetchone():
                return jsonify({'error':'No se pudo guardar'}), 409
            cn.commit()
            return jsonify({'ok':True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.post('/api/ordenes/<int:id_ot>/finalizar')
def finalizar(id_ot):
    data = request.get_json(silent=True) or {}
    try:
        with conexion() as cn, cn.cursor() as cur:
            cur.execute('''UPDATE ordenes_trabajo SET diagnostico=%s, trabajo_realizado=%s, observaciones=%s,
                           estado='FINALIZADA', fecha_finalizacion=NOW()
                           WHERE id_ot=%s
                           RETURNING id_ot, estado, fecha_finalizacion''',
                        (data.get('diagnostico'), data.get('trabajo_realizado'), data.get('observaciones'), id_ot))
            fila = cur.fetchone()
            if not fila:
                return jsonify({'error':'No se pudo finalizar'}), 409
            cn.commit()
            return jsonify(fila)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
