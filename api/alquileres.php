<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

try {
    switch ($accion) {

        case 'listar':
            $usuario = requerir_login();
            $estado  = trim((string)($_GET['estado'] ?? ''));
            $idFiltro = null;

            if ($usuario['rol'] === 'CLIENTE') {
                $idFiltro = $usuario['id'];
            } elseif (isset($_GET['id_usuario']) && $_GET['id_usuario'] !== '') {
                $idFiltro = (int)$_GET['id_usuario'];
            }

            $stmt = $pdo->prepare('CALL sp_listar_alquileres(?, ?)');
            $stmt->execute([$idFiltro, $estado]);
            $filas = $stmt->fetchAll();
            $stmt->closeCursor();

            json_salida(true, ['alquileres' => $filas]);
            break;

        case 'obtener':
            $usuario = requerir_login();
            $id      = (int)($_GET['id'] ?? 0);

            $stmt = $pdo->prepare('CALL sp_obtener_alquiler(?)');
            $stmt->execute([$id]);
            $alquiler = $stmt->fetch();
            $stmt->closeCursor();

            if (!$alquiler) {
                json_salida(false, null, 'Alquiler no encontrado', 404);
            }
            if ($usuario['rol'] === 'CLIENTE' && (int)$alquiler['id_usuario'] !== $usuario['id']) {
                json_salida(false, null, 'No tiene permisos sobre este alquiler', 403);
            }

            json_salida(true, ['alquiler' => $alquiler]);
            break;

        case 'crear':
            requerir_csrf();
            $usuario = requerir_roles(['ADMIN', 'OPERADOR', 'CLIENTE']);

            $idUsuario  = $usuario['rol'] === 'CLIENTE' ? $usuario['id'] : (int)json_entrada('id_usuario', 0);
            $idBici     = (int)json_entrada('id_bicicleta', 0);
            $estacion   = (int)json_entrada('estacion_orig', 0);
            $costoBase  = round((float)json_entrada('costo_base', 0), 2);

            if (!$idUsuario || !$idBici || !$estacion || $costoBase <= 0) {
                json_salida(false, null, 'Cliente, bicicleta, estación de origen y costo base son obligatorios', 422);
            }

            $stmt = $pdo->prepare('CALL sp_registrar_alquiler(?, ?, ?, ?, @id_alquiler)');
            $stmt->execute([$idUsuario, $idBici, $estacion, $costoBase]);
            $stmt->closeCursor();

            $idAlquiler = (int)$pdo->query('SELECT @id_alquiler AS id')->fetch()['id'];

            json_salida(true, ['id_alquiler' => $idAlquiler], 'Alquiler registrado correctamente');
            break;

        case 'actualizar':
            requerir_csrf();
            $usuario = requerir_login();
            $id      = (int)json_entrada('id_alquiler', 0);

            $stmt = $pdo->prepare('CALL sp_obtener_alquiler(?)');
            $stmt->execute([$id]);
            $alquiler = $stmt->fetch();
            $stmt->closeCursor();

            if (!$alquiler) {
                json_salida(false, null, 'Alquiler no encontrado', 404);
            }
            if ($usuario['rol'] === 'CLIENTE' && (int)$alquiler['id_usuario'] !== $usuario['id']) {
                json_salida(false, null, 'No tiene permisos sobre este alquiler', 403);
            }

            $costoBase = round((float)json_entrada('costo_base', $alquiler['costo_base']), 2);
            $estacion  = (int)json_entrada('estacion_orig', $alquiler['id_estacion_orig']);
            $estado    = strtoupper(trim((string)json_entrada('estado', $alquiler['estado'])));

            if (!in_array($estado, ['RESERVADO', 'PENDIENTE_PAGO'], true)) {
                json_salida(false, null, 'Estado no permitido para edición', 422);
            }

            $stmt = $pdo->prepare('CALL sp_actualizar_alquiler(?, ?, ?, ?)');
            $stmt->execute([$id, $costoBase, $estacion, $estado]);
            $stmt->closeCursor();

            json_salida(true, null, 'Alquiler actualizado correctamente');
            break;

        case 'finalizar':
            requerir_csrf();
            $usuario = requerir_login();
            $id      = (int)json_entrada('id_alquiler', 0);

            $stmt = $pdo->prepare('CALL sp_obtener_alquiler(?)');
            $stmt->execute([$id]);
            $alquiler = $stmt->fetch();
            $stmt->closeCursor();

            if (!$alquiler) {
                json_salida(false, null, 'Alquiler no encontrado', 404);
            }
            if ($usuario['rol'] === 'CLIENTE' && (int)$alquiler['id_usuario'] !== $usuario['id']) {
                json_salida(false, null, 'No tiene permisos sobre este alquiler', 403);
            }
            if (!in_array($alquiler['estado'], ['RESERVADO', 'ACTIVO'], true)) {
                json_salida(false, null, 'Solo se pueden finalizar alquileres RESERVADOS o ACTIVOS', 422);
            }

            $estacionDest = (int)json_entrada('estacion_dest', 0);
            $metodoPago   = (int)json_entrada('id_metodo_pago', 0);
            $referencia   = trim((string)json_entrada('referencia', ''));

            if (!$estacionDest || !$metodoPago) {
                json_salida(false, null, 'Estación de destino y método de pago son obligatorios', 422);
            }

            $stmt = $pdo->prepare('CALL sp_finalizar_alquiler(?, ?, ?, ?)');
            $stmt->execute([$id, $estacionDest, $metodoPago, $referencia]);
            $stmt->closeCursor();

            json_salida(true, null, 'Alquiler finalizado y pago registrado');
            break;

        case 'anular':
            requerir_csrf();
            $usuario = requerir_login();
            $id      = (int)json_entrada('id_alquiler', 0);

            $stmt = $pdo->prepare('CALL sp_obtener_alquiler(?)');
            $stmt->execute([$id]);
            $alquiler = $stmt->fetch();
            $stmt->closeCursor();

            if (!$alquiler) {
                json_salida(false, null, 'Alquiler no encontrado', 404);
            }
            if ($usuario['rol'] === 'CLIENTE' && (int)$alquiler['id_usuario'] !== $usuario['id']) {
                json_salida(false, null, 'No tiene permisos sobre este alquiler', 403);
            }

            $stmt = $pdo->prepare('CALL sp_anular_alquiler(?)');
            $stmt->execute([$id]);
            $stmt->closeCursor();

            json_salida(true, null, 'Alquiler anulado correctamente');
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, mensaje_sql($e), 400);
}
