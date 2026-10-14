<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

try {
    switch ($accion) {

        case 'estaciones':
            requerir_login();
            $filas = $pdo->query(
                "SELECT e.*, COUNT(b.id_bicicleta) AS bicicletas_actuales
                 FROM estaciones e
                 LEFT JOIN bicicletas b ON b.estacion_act = e.id_estacion
                 GROUP BY e.id_estacion
                 ORDER BY e.codigo"
            )->fetchAll();
            json_salida(true, ['estaciones' => $filas]);
            break;

        case 'bicicletas':
            requerir_login();
            $todas = isset($_GET['todas']) && $_GET['todas'] == '1';

            $sql = "SELECT b.*, e.nombre AS estacion
                    FROM bicicletas b
                    LEFT JOIN estaciones e ON e.id_estacion = b.estacion_act";
            if (!$todas) {
                $sql .= " WHERE b.estado = 'DISPONIBLE'";
            }
            $sql .= " ORDER BY b.codigo_qr";

            $filas = $pdo->query($sql)->fetchAll();
            json_salida(true, ['bicicletas' => $filas]);
            break;

        case 'metodos_pago':
            $usuario = requerir_login();
            $idUsuario = $usuario['id'];

            if (in_array($usuario['rol'], ['ADMIN', 'OPERADOR'], true) && !empty($_GET['id_usuario'])) {
                $idUsuario = (int)$_GET['id_usuario'];
            }

            $stmt = $pdo->prepare("SELECT * FROM metodos_pago WHERE id_usuario = ? ORDER BY activo DESC, fecha_creacion DESC");
            $stmt->execute([$idUsuario]);
            json_salida(true, ['metodos' => $stmt->fetchAll()]);
            break;

        case 'clientes':
            requerir_roles(['ADMIN', 'OPERADOR']);
            $filas = $pdo->query(
                "SELECT u.id_usuario, u.nombre, u.email, u.es_cliente_frecuente
                 FROM usuarios u
                 INNER JOIN roles r ON r.id_rol = u.rol_id
                 WHERE r.codigo_rol = 'CLIENTE' AND u.estado = 'ACTIVO'
                 ORDER BY u.nombre"
            )->fetchAll();
            json_salida(true, ['clientes' => $filas]);
            break;

        case 'repuestos':
            requerir_roles(['ADMIN', 'TECNICO']);
            $filas = $pdo->query(
                "SELECT id_repuesto, nombre_rep, cantidad_disponible, precio_actual
                 FROM inventario_costos
                 ORDER BY nombre_rep"
            )->fetchAll();
            json_salida(true, ['repuestos' => $filas]);
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, mensaje_sql($e), 400);
}
