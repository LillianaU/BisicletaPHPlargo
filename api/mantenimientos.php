<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

function empleado_por_email(PDO $pdo, string $email): ?int
{
    $stmt = $pdo->prepare("SELECT id_empleado FROM empleados WHERE email = ? AND estado = 'ACTIVO' LIMIT 1");
    $stmt->execute([$email]);
    $id = $stmt->fetchColumn();
    return $id ? (int)$id : null;
}

try {
    switch ($accion) {

        case 'listar':
            requerir_roles(['ADMIN', 'TECNICO', 'SUPERVISOR']);
            $filas = $pdo->query(
                "SELECT m.*, b.codigo_qr, b.modelo,
                        emp.nombre AS tecnico_nombre,
                        (SELECT COALESCE(SUM(r.subtotal), 0) FROM mantenimiento_repuestos r WHERE r.id_manten = m.id_manten) AS costo_repuestos
                 FROM mantenimientos m
                 INNER JOIN bicicletas b ON b.id_bicicleta = m.id_bicicleta
                 LEFT JOIN empleados emp ON emp.id_empleado = m.tecnico
                 ORDER BY m.fecha_ingreso DESC"
            )->fetchAll();
            json_salida(true, ['mantenimientos' => $filas]);
            break;

        case 'crear':
            requerir_csrf();
            $usuario = requerir_roles(['ADMIN', 'TECNICO']);

            $idBici       = (int)json_entrada('id_bicicleta', 0);
            $tipo         = strtoupper((string)json_entrada('tipo_manten', ''));
            $diagnostico  = trim((string)json_entrada('diagnostico', ''));
            $descripcion  = trim((string)json_entrada('descripcion', ''));

            if (!$idBici || !in_array($tipo, ['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'EMERGENCIA'], true)) {
                json_salida(false, null, 'Bicicleta y tipo de mantenimiento son obligatorios', 422);
            }

            $stmt = $pdo->prepare("SELECT estado FROM bicicletas WHERE id_bicicleta = ?");
            $stmt->execute([$idBici]);
            $estadoBici = $stmt->fetchColumn();
            if (!$estadoBici) {
                json_salida(false, null, 'Bicicleta no encontrada', 404);
            }
            if ($estadoBici === 'ALQUILADA') {
                json_salida(false, null, 'No se puede enviar a mantenimiento una bicicleta alquilada', 422);
            }

            $tecnicoId = empleado_por_email($pdo, $usuario['email']);

            $stmt = $pdo->prepare(
                "INSERT INTO mantenimientos (id_bicicleta, tipo_manten, diagnostico, descripcion, tecnico)
                 VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([$idBici, $tipo, $diagnostico ?: null, $descripcion ?: null, $tecnicoId]);
            $idManten = (int)$pdo->lastInsertId();

            json_salida(true, ['id_manten' => $idManten], 'Mantenimiento registrado. La bicicleta pasó a estado MANTENIMIENTO');
            break;

        case 'repuestos':
            requerir_roles(['ADMIN', 'TECNICO', 'SUPERVISOR']);
            $id = (int)($_GET['id_manten'] ?? 0);

            $stmt = $pdo->prepare(
                "SELECT r.*, i.nombre_rep
                 FROM mantenimiento_repuestos r
                 INNER JOIN inventario_costos i ON i.id_repuesto = r.id_repuesto
                 WHERE r.id_manten = ?"
            );
            $stmt->execute([$id]);
            json_salida(true, ['repuestos' => $stmt->fetchAll()]);
            break;

        case 'agregar_repuesto':
            requerir_csrf();
            requerir_roles(['ADMIN', 'TECNICO']);

            $idManten  = (int)json_entrada('id_manten', 0);
            $idRepu    = (int)json_entrada('id_repuesto', 0);
            $cantidad  = (int)json_entrada('cantidad', 1);

            if (!$idManten || !$idRepu || $cantidad < 1) {
                json_salida(false, null, 'Mantenimiento, repuesto y cantidad (> 0) son obligatorios', 422);
            }

            $stmt = $pdo->prepare("SELECT estado FROM mantenimientos WHERE id_manten = ?");
            $stmt->execute([$idManten]);
            if ($stmt->fetchColumn() === false) {
                json_salida(false, null, 'Mantenimiento no encontrado', 404);
            }

            $stmt = $pdo->prepare('CALL sp_agregar_repuesto_mantenimiento(?, ?, ?)');
            $stmt->execute([$idManten, $idRepu, $cantidad]);
            $stmt->closeCursor();

            json_salida(true, null, 'Repuesto agregado y stock descontado');
            break;

        case 'finalizar':
            requerir_csrf();
            requerir_roles(['ADMIN', 'TECNICO']);
            $id = (int)json_entrada('id_manten', 0);

            $stmt = $pdo->prepare(
                "UPDATE mantenimientos
                 SET estado = 'FINALIZADO', fecha_salida = NOW()
                 WHERE id_manten = ? AND estado NOT IN ('FINALIZADO', 'CANCELADO')"
            );
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                json_salida(false, null, 'El mantenimiento ya está finalizado o cancelado', 422);
            }

            json_salida(true, null, 'Mantenimiento finalizado. Bicicleta devuelta a DISPONIBLE');
            break;

        case 'cancelar':
            requerir_csrf();
            requerir_roles(['ADMIN', 'TECNICO']);
            $id = (int)json_entrada('id_manten', 0);

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT id_bicicleta FROM mantenimientos WHERE id_manten = ? AND estado NOT IN ('FINALIZADO', 'CANCELADO')");
            $stmt->execute([$id]);
            $idBici = $stmt->fetchColumn();

            if (!$idBici) {
                $pdo->rollBack();
                json_salida(false, null, 'El mantenimiento ya está finalizado o cancelado', 422);
            }

            $stmt = $pdo->prepare("UPDATE mantenimientos SET estado = 'CANCELADO', fecha_salida = NOW() WHERE id_manten = ?");
            $stmt->execute([$id]);

            $stmt = $pdo->prepare("UPDATE bicicletas SET estado = 'DISPONIBLE' WHERE id_bicicleta = ? AND estado = 'MANTENIMIENTO'");
            $stmt->execute([$idBici]);

            $pdo->commit();

            json_salida(true, null, 'Mantenimiento cancelado');
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_salida(false, null, mensaje_sql($e), 400);
}
