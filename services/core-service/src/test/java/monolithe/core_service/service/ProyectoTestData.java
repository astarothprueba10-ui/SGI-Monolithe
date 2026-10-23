package monolithe.core_service.service;

import monolithe.core_service.dto.ProyectoRequest;

import java.time.LocalDate;

final class ProyectoTestData {
    private ProyectoTestData() {
    }

    static ProyectoRequest request(String departamento, String provincia, String distrito,
                                   String pais, LocalDate inicio, LocalDate fin) {
        return new ProyectoRequest("PLANIFICADO", "PROJ-001", "Proyecto de prueba", null, null, null,
                distrito, provincia, departamento, pais, null, null, null, inicio, fin, true);
    }
}
