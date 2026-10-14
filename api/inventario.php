<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

try {
    switch ($accion) {

        case 'listar':
            requerir_roles(['ADMIN', 'TECNICO']);
            $filas = $pdo->query(
                "SELECT i.*, (i.costo_repuestos + i.costo_mano_obra) AS costo_real
                 FROM inventario_costos i
                 ORDER BY i.nombre_rep"
            )->fetchAll();
            json_salida(true, ['repuestos' => $filas]);
            break;

        case 'crear':
            requerir_roles(['ADMIN', 'TECNICO']);

            $nombre    = trim((string)json_entrada('nombre_rep', ''));
            $cantidad  = (int)json_entrada('cantidad_disponible', 0);
            $precio    = round((float)json_entrada('precio_actual', 0), 2);
            $cRepuesto = round((float)json_entrada('costo_repuestos', 0), 2);
            $cMano     = round((float)json_entrada('costo_mano_obra', 0), 2);
            $proveedor = trim((string)json_entrada('proveedor', ''));

            if ($nombre === '' || $cantidad < 0 || $precio < 0 || $cRepuesto < 0 || $cMano < 0) {
                json_salida(false, null, 'Nombre, cantidades y costos son obligatorios (no negativos)', 422);
            }

            $stmt = $pdo->prepare(
                "INSERT INTO inventario_costos
                    (nombre_rep, cantidad_disponible, precio_actual, costo_repuestos, proveedor, costo_mano_obra, costo_total)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([$nombre, $cantidad, $precio, $cRepuesto, $proveedor ?: null, $cMano, round($cRepuesto + $cMano, 2)]);

            json_salida(true, ['id_repuesto' => (int)$pdo->lastInsertId()], 'Repuesto agregado al inventario');
            break;

        case 'actualizar':
            requerir_roles(['ADMIN', 'TECNICO']);
            $id        = (int)json_entrada('id_repuesto', 0);
            $cantidad  = (int)json_entrada('cantidad_disponible', 0);
            $precio    = round((float)json_entrada('precio_actual', 0), 2);
            $cRepuesto = round((float)json_entrada('costo_repuestos', 0), 2);
            $cMano     = round((float)json_entrada('costo_mano_obra', 0), 2);
            $proveedor = trim((string)json_entrada('proveedor', ''));

            if (!$id || $cantidad < 0 || $precio < 0 || $cRepuesto < 0 || $cMano < 0) {
                json_salida(false, null, 'Datos no válidos', 422);
            }

            $stmt = $pdo->prepare(
                "UPDATE inventario_costos
                 SET cantidad_disponible = ?, precio_actual = ?, costo_repuestos = ?, costo_mano_obra = ?, costo_total = ?, proveedor = ?
                 WHERE id_repuesto = ?"
            );
            $stmt->execute([$cantidad, $precio, $cRepuesto, $cMano, round($cRepuesto + $cMano, 2), $proveedor ?: null, $id]);

            json_salida(true, null, 'Repuesto actualizado');
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, mensaje_sql($e), 400);
}
