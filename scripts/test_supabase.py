#!/usr/bin/env python3
import ssl
import json
import os
import pg8000.native

def load_env():
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
    print("Conectando a Supabase PostgreSQL...")
    load_env()

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    db_password = os.environ.get('SUPABASE_DB_PASSWORD', '')

    host = os.environ.get('SUPABASE_DB_HOST', '')
    user = os.environ.get('SUPABASE_DB_USER', '')
    port = int(os.environ.get('SUPABASE_DB_PORT', 5432))

    try:
        conn = pg8000.native.Connection(
            user=user,
            host=host,
            port=port,
            database='postgres',
            password=db_password,
            ssl_context=ssl_context
        )
    except Exception:
        pooler_host = os.environ.get('SUPABASE_POOLER_HOST', 'aws-0-us-west-2.pooler.supabase.com')
        project_ref = os.environ.get('SUPABASE_PROJECT_REF', '')
        pooler_user = f"postgres.{project_ref}" if project_ref and not user.startswith('postgres.') else user
        conn = pg8000.native.Connection(
            user=pooler_user,
            host=pooler_host,
            port=5432,
            database='postgres',
            password=db_password,
            ssl_context=ssl_context
        )
    print("Conectado exitosamente.\n")

    print("1. Lectura de Catálogo cfg_estados_lote:")
    estados = conn.run("SELECT id_estado_lote, codigo, nombre, orden FROM cfg_estados_lote ORDER BY orden;")
    for row in estados:
        print(f"   [ID {row[0]}] {row[1]:<12} -> {row[2]}")

    print("\n2. Procedimiento Almacenado sp_listar_lotes_plano():")
    res = conn.run("SELECT * FROM sp_listar_lotes_plano(NULL);")
    print(f"   Total lotes retornados: {len(res)}")

    print("\n3. Procedimiento Almacenado sp_cambiar_estado_lote:")
    test_call = conn.run("SELECT sp_cambiar_estado_lote(999999, 'SEPARADO', NULL, 'Prueba unitaria');")
    resp_json = test_call[0][0]
    print(f"   Respuesta Stored Procedure: {resp_json}")

    print("\nPruebas finalizadas con éxito.")
    conn.close()

if __name__ == '__main__':
    main()

