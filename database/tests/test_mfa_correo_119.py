#!/usr/bin/env python3
"""Prueba aislada PostgreSQL 17 de la migración 119 y del SQL REAL de Auth Service.
No conecta a Supabase, no usa datos de clientes y no requiere librerías externas.
"""
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JAVA = ROOT / "services/auth-service/src/main/java/monolithe/auth_service/repository/MfaRepository.java"
MIGRATION = ROOT / "database/migrations/119_auth_mfa_prueba_correo_por_activacion_v1.sql"

def sql(query):
    result = subprocess.run(
        ["psql", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"],
        input=query, text=True, capture_output=True, check=False,
        env=os.environ.copy(),
    )
    if result.returncode:
        raise AssertionError("PostgreSQL rechazó la consulta: " + result.stderr[:1500])
    return result.stdout.strip()

sql("""
CREATE SCHEMA auth_mfa;
CREATE TABLE auth_mfa.estado (
  id_usuario bigint PRIMARY KEY,
  activacion_hash bytea,
  activacion_expira timestamptz
);
CREATE TABLE public.seg_usuarios (id_usuario bigint PRIMARY KEY, id_persona bigint NOT NULL);
CREATE TABLE public.cfg_tipos_contacto (id_tipo_contacto bigint PRIMARY KEY, codigo text NOT NULL, activo boolean NOT NULL);
CREATE TABLE public.core_personas_contactos (
  id_persona_contacto bigint PRIMARY KEY,
  id_persona bigint NOT NULL,
  id_tipo_contacto bigint NOT NULL,
  valor text NOT NULL,
  verificado boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  principal boolean NOT NULL DEFAULT true,
  fecha_actualizacion timestamptz
);
""")
sql(MIGRATION.read_text(encoding="utf-8"))
sql(MIGRATION.read_text(encoding="utf-8"))  # Aplicación idempotente.
sql("""
INSERT INTO public.seg_usuarios VALUES (1, 10), (2, 20);
INSERT INTO public.cfg_tipos_contacto VALUES (5, 'EMAIL', TRUE);
INSERT INTO public.core_personas_contactos
(id_persona_contacto,id_persona,id_tipo_contacto,valor)
VALUES (100,10,5,'Cliente@Ejemplo.com'), (200,20,5,'otro@ejemplo.com');
INSERT INTO auth_mfa.estado (id_usuario,activacion_hash,activacion_expira,
                             activacion_contacto_id,activacion_correo_hash)
VALUES (1,decode('0102','hex'),CURRENT_TIMESTAMP + INTERVAL '12 hours',100,
        sha256(convert_to('cliente@ejemplo.com','UTF8')));
""")

code = JAVA.read_text(encoding="utf-8")
matched = re.search(
    r'int actualizados = jdbc\.sql\("""\s*(UPDATE public\.core_personas_contactos c.*?)\s*"""\)',
    code, flags=re.S
)
assert matched is not None, "No se encontró el SQL real de verificación en MfaRepository.java."
update = re.sub(r':usuario\b', '1', matched.group(1))
update = re.sub(r':contacto\b', '100', update)

def is_verified(contact=100):
    return sql(f"SELECT verificado FROM public.core_personas_contactos WHERE id_persona_contacto = {contact}") == 't'

assert not is_verified(), "La migración no debe confirmar correos por sí sola."
assert not is_verified(200)

# Si la dirección ha cambiado, NO puede verificarla.
sql("UPDATE public.core_personas_contactos SET valor='intruso@ejemplo.com' WHERE id_persona_contacto=100")
sql(update)
assert not is_verified(), "Un correo cambiado se verificó indebidamente."

# Si la invitación caducó, NO puede verificarlo.
sql("UPDATE public.core_personas_contactos SET valor='Cliente@Ejemplo.com' WHERE id_persona_contacto=100")
sql("UPDATE auth_mfa.estado SET activacion_expira = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE id_usuario=1")
sql(update)
assert not is_verified(), "Una invitación vencida se verificó indebidamente."

# Las invitaciones manuales no deben verificar un correo.
sql("""UPDATE auth_mfa.estado
       SET activacion_expira=CURRENT_TIMESTAMP + INTERVAL '12 hours',
           activacion_contacto_id=NULL, activacion_correo_hash=NULL
       WHERE id_usuario=1""")
sql(update)
assert not is_verified(), "Una invitación asistida verificó indebidamente un correo."

# Solo el contacto al que se envió el código podrá marcarse como verificado.
sql("""UPDATE auth_mfa.estado
       SET activacion_contacto_id=100, activacion_correo_hash=sha256(convert_to('cliente@ejemplo.com','UTF8'))
       WHERE id_usuario=1""")
sql(update)
assert is_verified(), "La comprobación válida no confirmó al destinatario."
assert not is_verified(200), "La verificación afectó a otra persona."
print("OK: migración 119 idempotente; correo modificado, vencido y manual bloqueados; destinatario válido confirmado.")
