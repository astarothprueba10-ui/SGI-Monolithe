INSERT INTO cfg_estados_usuario VALUES (1,'ACTIVO',true,true),(2,'INACTIVO',true,false),(3,'SUSPENDIDO',true,false);
INSERT INTO cfg_estados_trabajador VALUES (1,'ACTIVO',true),(2,'INACTIVO',true),(3,'SUSPENDIDO',true),(4,'CESADO',true),(5,'EN_VERIFICACION',true);
INSERT INTO cfg_tipos_documento VALUES (1,'DNI',8,8,true,true),(2,'CE',9,12,true,true);
INSERT INTO cfg_tipos_contacto VALUES (1,'EMAIL',true),(2,'CELULAR',true);
INSERT INTO cfg_tipos_notificacion VALUES (1,'GENERAL',true);
INSERT INTO rrhh_areas VALUES (1,true);
INSERT INTO rrhh_cargos VALUES (1,1,'GERENTE_GENERAL',true),(2,1,'ASISTENTE',true);
INSERT INTO rrhh_horarios VALUES (1,true);
INSERT INTO cfg_tipos_vinculo_laboral VALUES (1,true);
INSERT INTO seg_roles VALUES (1,'RRHH',true,true),(2,'MARKETING',true,true),(3,'ADMINISTRADOR',true,false),(4,'GERENCIA',true,false),(5,'ASESOR',true,true);
INSERT INTO seg_permisos VALUES (1,'hr.edit',true),(2,'hr.create',true),(3,'hr.approve',true),(4,'roles.assign_permissions',true);
INSERT INTO seg_roles_permisos VALUES (1,1,true),(1,2,true),(2,1,true),(3,1,true),(3,2,true),(3,3,true),(3,4,true),(4,1,true);
INSERT INTO core_personas (id_persona,nombres,apellido_paterno,apellido_materno,fecha_nacimiento)
SELECT id,'Persona','Prueba','Ejemplo',DATE '1990-01-01'
FROM unnest(ARRAY[101,102,103,104,201,202,203,204,205]) AS id;
INSERT INTO seg_usuarios (id_usuario,id_persona,id_estado_usuario) VALUES
(1,101,1),(2,102,1),(3,103,1),(4,104,1),(11,201,1),(12,202,1),(13,203,1),(14,204,1);
INSERT INTO seg_usuarios_roles VALUES (1,1,true),(2,2,true),(3,3,true),(4,4,true),(11,4,true),(12,4,true),(13,3,true),(14,5,true);
INSERT INTO rrhh_trabajadores (id_trabajador,codigo,id_persona,id_cargo,id_horario,id_estado_trabajador,id_tipo_vinculo_laboral,fecha_ingreso,fecha_creacion) VALUES
(10,'G01',201,1,1,1,1,CURRENT_DATE-100,now()-interval '100 days'),
(20,'G02',202,2,1,1,1,CURRENT_DATE-100,now()-interval '100 days'),
(30,'A01',203,2,1,1,1,CURRENT_DATE-100,now()-interval '100 days'),
(40,'O01',204,2,1,1,1,CURRENT_DATE-100,now()-interval '100 days'),
(50,'S01',205,2,1,1,1,CURRENT_DATE-100,now()-interval '100 days'),
(60,'R01',101,2,1,1,1,CURRENT_DATE-100,now()-interval '100 days');
INSERT INTO core_personas_documentos (id_persona,id_tipo_documento,numero_documento)
SELECT id_persona,1,LPAD(id_persona::text,8,'0') FROM core_personas;
INSERT INTO core_personas_contactos (id_persona,id_tipo_contacto,valor)
SELECT id_persona,2,'987654321' FROM core_personas;
INSERT INTO core_personas_contactos (id_persona,id_tipo_contacto,valor)
SELECT id_persona,1,'persona'||id_persona||'@example.com' FROM core_personas;
INSERT INTO core_personas_direcciones (id_persona,tipo,direccion,departamento,provincia,distrito,pais)
SELECT id_persona,'DOMICILIO','Calle de prueba 123','Lambayeque','Chiclayo','Ciudad Eten','Perú' FROM core_personas;
INSERT INTO seg_sesiones (id_usuario) SELECT id_usuario FROM seg_usuarios;
INSERT INTO seg_tokens_recuperacion (id_usuario) SELECT id_usuario FROM seg_usuarios;
