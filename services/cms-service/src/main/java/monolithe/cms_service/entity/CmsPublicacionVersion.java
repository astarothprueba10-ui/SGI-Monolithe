package monolithe.cms_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "cms_publicacion_versiones")
@Getter
@Setter
@NoArgsConstructor
public class CmsPublicacionVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_version_publicacion")
    private Long idVersionPublicacion;

    @Column(name = "id_pagina")
    private Long idPagina;

    @Column(name = "id_proyecto")
    private Long idProyecto;

    // Es una revisión de publicación, NO un @Version de Hibernate.
    // El servicio de publicación deberá validarla bajo una transacción con bloqueo.
    @Column(name = "revision", nullable = false)
    private Long revision = 0L;

    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;

    @PrePersist
    @PreUpdate
    void actualizarFecha() {
        fechaActualizacion = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
