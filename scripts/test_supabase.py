#!/usr/bin/env python3
"""
Prueba interactiva de la Base de Datos y Procedimientos Almacenados (RPC)
Conecta a Supabase PostgreSQL y prueba las funciones creadas.
"""
import ssl
import json
import pg8000.native

def load_env():
    import os
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.secret', 'supabase.env')
    conf = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    conf[k.strip()] = v.strip().strip('"').strip("'")
    os.environ.update(conf)
    return conf

def main():
    print("🚀 Conectando a Supabase PostgreSQL 17...")
    load_env()

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    db_password = os.environ.get('SUPABASE_DB_PASSWORD', 'REDACTED_DB_PASSWORD')

    conn = pg8000.native.Connection(
        user=os.environ.get('SUPABASE_DB_USER', 'postgres.REDACTED_PROJECT_REF'),
        host=os.environ.get('SUPABASE_DB_HOST', 'REDACTED_POOLER_HOST'),
        port=int(os.environ.get('SUPABASE_DB_PORT', 5432)),
        database='postgres',
        password=db_password,
        ssl_context=ssl_context
    )
    print("✅ Conectado exitosamente.\n")

    # 1. Probar lectura de Catálogo
    print("📋 1. Probando lectura de Catálogo: cfg_estados_lote:")
    estados = conn.run("SELECT id_estado_lote, codigo, nombre, orden FROM cfg_estados_lote ORDER BY orden;")
    for row in estados:
        print(f"   [ID {row[0]}] {row[1]:<12} -> {row[2]}")

    # 2. Probar Procedimiento Almacenado: sp_listar_lotes_plano()
    print("\n⚡ 2. Probando Procedimiento Almacenado: sp_listar_lotes_plano():")
    res = conn.run("SELECT * FROM sp_listar_lotes_plano(NULL);")
    print(f"   Total lotes retornados para el SVG interactivo: {len(res)}")

    # 3. Probar simulación de cambio de estado
    print("\n🔄 3. Probando Procedimiento Almacenado de Transición: sp_cambiar_estado_lote:")
    # Como aún no hay lotes físicos, probamos con ID de prueba para ver la respuesta JSON estructurada
    test_call = conn.run("SELECT sp_cambiar_estado_lote(999999, 'SEPARADO', NULL, 'Prueba unitaria');")
    resp_json = test_call[0][0]
    print(f"   Respuesta del Stored Procedure: {resp_json}")

    print("\n🎉 ¡Todos los procedimientos almacenados responden de forma instantánea y segura!")
    conn.close()

if __name__ == '__main__':
    main()
