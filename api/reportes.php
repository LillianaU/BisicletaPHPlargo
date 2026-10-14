<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

try {
    $usuario = requerir_roles(['ADMIN', 'SUPERVISOR', 'TECNICO', 'OPERADOR']);

    switch ($accion) {

        case 'resumen':
            $hoy            = (int)$pdo->query("SELECT COUNT(*) FROM alquileres WHERE DATE(fecha_inicio) = CURDATE()")->fetchColumn();
            $semana         = (int)$pdo->query("SELECT COUNT(*) FROM alquileres WHERE fecha_inicio >= CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY")->fetchColumn();
            $mes            = (int)$pdo->query("SELECT COUNT(*) FROM alquileres WHERE YEAR(fecha_inicio) = YEAR(CURDATE()) AND MONTH(fecha_inicio) = MONTH(CURDATE())")->fetchColumn();
            $ingresoMes     = (float)$pdo->query("SELECT COALESCE(SUM(costo_total), 0) FROM alquileres WHERE estado = 'FINALIZADO' AND YEAR(fecha_inicio) = YEAR(CURDATE()) AND MONTH(fecha_inicio) = MONTH(CURDATE())")->fetchColumn();
            $bicisDispon    = (int)$pdo->query("SELECT COUNT(*) FROM bicicletas WHERE estado = 'DISPONIBLE'")->fetchColumn();
            $alertas        = (int)$pdo->query("SELECT COUNT(*) FROM alertas_energia WHERE estado_alerta = 'PENDIENTE'")->fetchColumn();
            $mantenimientos = (int)$pdo->query("SELECT COUNT(*) FROM mantenimientos WHERE estado IN ('PROGRAMADO', 'EN_REVISION', 'EN_REPARACION')")->fetchColumn();
            $clientes       = (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE es_cliente_frecuente = 1")->fetchColumn();

            json_salida(true, [
                'alquileres_hoy'          => $hoy,
                'alquileres_semana'       => $semana,
                'alquileres_mes'          => $mes,
                'ingresos_mes'            => $ingresoMes,
                'bicicletas_disponibles'  => $bicisDispon,
                'alertas_pendientes'      => $alertas,
                'mantenimientos_activos'  => $mantenimientos,
                'clientes_frecuentes'     => $clientes,
            ]);
            break;

        case 'grafico':
            $tipo = strtoupper(trim((string)($_GET['tipo'] ?? 'SEMANA')));
            if (!in_array($tipo, ['DIA', 'SEMANA', 'MES'], true)) {
                json_salida(false, null, 'Tipo de reporte no válido (DIA, SEMANA, MES)', 422);
            }

            $stmt = $pdo->prepare('CALL sp_reporte_cantidad_alquileres(?)');
            $stmt->execute([$tipo]);
            $puntos = $stmt->fetchAll();
            $stmt->closeCursor();

            json_salida(true, ['tipo' => $tipo, 'puntos' => $puntos]);
            break;

        case 'estados':
            $filas = $pdo->query("SELECT estado, COUNT(*) AS cantidad FROM alquileres GROUP BY estado ORDER BY cantidad DESC")->fetchAll();
            json_salida(true, ['estados' => $filas]);
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, mensaje_sql($e), 400);
}
