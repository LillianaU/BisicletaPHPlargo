<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

try {
    switch ($accion) {

        case 'listar':
            requerir_roles(['ADMIN', 'TECNICO', 'SUPERVISOR']);
            $filas = $pdo->query(
                "SELECT a.*, b.codigo_bateria, b.capacidad_wh
                 FROM alertas_energia a
                 INNER JOIN baterias b ON b.id_bateria = a.id_bateria
                 ORDER BY FIELD(a.estado_alerta, 'PENDIENTE', 'ATENDIDA', 'CERRADA'),
                          FIELD(a.nivel_prioridad, 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'),
                          a.fecha_alerta DESC"
            )->fetchAll();
            json_salida(true, ['alertas' => $filas]);
            break;

        case 'atender':
            requerir_roles(['ADMIN', 'TECNICO']);
            $id = (int)json_entrada('id_alerta', 0);

            $stmt = $pdo->prepare("UPDATE alertas_energia SET estado_alerta = 'ATENDIDA' WHERE id_alerta = ? AND estado_alerta = 'PENDIENTE'");
            $stmt->execute([$id]);

            json_salida($stmt->rowCount() > 0, null, $stmt->rowCount() > 0 ? 'Alerta marcada como ATENDIDA' : 'La alerta ya no está pendiente', $stmt->rowCount() > 0 ? 200 : 422);
            break;

        case 'cerrar':
            requerir_roles(['ADMIN', 'TECNICO']);
            $id = (int)json_entrada('id_alerta', 0);

            $stmt = $pdo->prepare("UPDATE alertas_energia SET estado_alerta = 'CERRADA' WHERE id_alerta = ? AND estado_alerta IN ('PENDIENTE', 'ATENDIDA')");
            $stmt->execute([$id]);

            json_salida($stmt->rowCount() > 0, null, $stmt->rowCount() > 0 ? 'Alerta cerrada' : 'La alerta ya está cerrada', $stmt->rowCount() > 0 ? 200 : 422);
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, mensaje_sql($e), 400);
}
