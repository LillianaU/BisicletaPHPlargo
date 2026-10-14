<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

try {
    $usuario = requerir_roles(['CLIENTE', 'ADMIN']);

    switch ($accion) {

        case 'listar':
            $idUsuario = $usuario['rol'] === 'CLIENTE' ? $usuario['id'] : (int)($_GET['id_usuario'] ?? 0);

            $stmt = $pdo->prepare("SELECT * FROM metodos_pago WHERE id_usuario = ? ORDER BY activo DESC, fecha_creacion DESC");
            $stmt->execute([$idUsuario]);
            json_salida(true, ['metodos' => $stmt->fetchAll()]);
            break;

        case 'crear':
            $tipo = strtoupper((string)json_entrada('tipo', ''));
            $tipos = ['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'PSE', 'NEQUI', 'DAVIPLATA', 'OTRO'];

            if (!in_array($tipo, $tipos, true)) {
                json_salida(false, null, 'Tipo de medio de pago no válido', 422);
            }

            $stmt = $pdo->prepare("INSERT INTO metodos_pago (id_usuario, tipo) VALUES (?, ?)");
            $stmt->execute([$usuario['id'], $tipo]);

            json_salida(true, ['id_metodo' => (int)$pdo->lastInsertId()], 'Medio de pago agregado');
            break;

        case 'alternar':
            $id = (int)json_entrada('id_metodo', 0);

            $stmt = $pdo->prepare("UPDATE metodos_pago SET activo = NOT activo WHERE id_metodo = ? AND id_usuario = ?");
            $stmt->execute([$id, $usuario['id']]);

            json_salida($stmt->rowCount() > 0, null, $stmt->rowCount() > 0 ? 'Medio de pago actualizado' : 'Medio de pago no encontrado', $stmt->rowCount() > 0 ? 200 : 404);
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, mensaje_sql($e), 400);
}
