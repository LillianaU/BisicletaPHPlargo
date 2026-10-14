<?php
/**
 * SCRIPT INDEPENDIENTE DE PRUEBAS — SDD §3
 * Alta administrativa directa de usuarios de prueba, aislado del flujo público.
 * Asocia un rol (ADMIN, TECNICO, CLIENTE) y cifra la contraseña con password_hash().
 *
 * Uso CLI:      php creacion_usuario_prueba.php
 * Uso navegador: http://localhost/Bisicleta/creacion_usuario_prueba.php
 */

require_once __DIR__ . '/config/funciones.php';
require_once __DIR__ . '/config/database.php';

$usuariosPrueba = [
    [
        'nombre'   => 'Ana Administradora',
        'email'    => 'admin@ebike.com',
        'password' => 'Admin123*',
        'telefono' => '3010000001',
        'rol'      => 'ADMIN',
    ],
    [
        'nombre'   => 'Carlos Pérez',
        'email'    => 'tecnico@ebike.com',
        'password' => 'Tecnico123*',
        'telefono' => '3010000002',
        'rol'      => 'TECNICO',
    ],
    [
        'nombre'   => 'Juan Cliente',
        'email'    => 'cliente@ebike.com',
        'password' => 'Cliente123*',
        'telefono' => '3010000003',
        'rol'      => 'CLIENTE',
    ],
    [
        'nombre'   => 'María Cliente',
        'email'    => 'cliente2@ebike.com',
        'password' => 'Cliente123*',
        'telefono' => '3010000004',
        'rol'      => 'CLIENTE',
    ],
];

$resultados = [];

try {
    $pdo = Database::getConnection();

    foreach ($usuariosPrueba as $datos) {
        $stmt = $pdo->prepare("SELECT id_rol FROM roles WHERE codigo_rol = ? LIMIT 1");
        $stmt->execute([$datos['rol']]);
        $idRol = $stmt->fetchColumn();

        if (!$idRol) {
            $resultados[] = ['email' => $datos['email'], 'password' => $datos['password'], 'ok' => false, 'mensaje' => "El rol {$datos['rol']} no existe en la base de datos"];
            continue;
        }

        $hash = password_hash($datos['password'], PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("SELECT id_usuario FROM usuarios WHERE email = ? LIMIT 1");
        $stmt->execute([$datos['email']]);
        $idExistente = $stmt->fetchColumn();

        if ($idExistente) {
            $stmt = $pdo->prepare(
                "UPDATE usuarios
                 SET nombre = ?, password_hash = ?, telefono = ?, rol_id = ?, estado = 'ACTIVO'
                 WHERE id_usuario = ?"
            );
            $stmt->execute([$datos['nombre'], $hash, $datos['telefono'], $idRol, $idExistente]);
            $resultados[] = ['email' => $datos['email'], 'password' => $datos['password'], 'ok' => true, 'mensaje' => 'Actualizado (id ' . $idExistente . ')'];
        } else {
            $stmt = $pdo->prepare(
                "INSERT INTO usuarios (nombre, email, password_hash, telefono, rol_id)
                 VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([$datos['nombre'], $datos['email'], $hash, $datos['telefono'], $idRol]);
            $resultados[] = ['email' => $datos['email'], 'password' => $datos['password'], 'ok' => true, 'mensaje' => 'Creado (id ' . $pdo->lastInsertId() . ')'];
        }
    }
} catch (Throwable $e) {
    $resultados[] = ['email' => '-', 'password' => '-', 'ok' => false, 'mensaje' => mensaje_sql($e)];
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(
    ['script' => 'creacion_usuario_prueba.php', 'resultados' => $resultados],
    JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
);
