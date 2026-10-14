<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';

try {
    switch ($accion) {
        case 'login':
            $email    = trim((string)json_entrada('email', ''));
            $password = (string)json_entrada('password', '');

            if ($email === '' || $password === '') {
                json_salida(false, null, 'Email y contraseña son obligatorios', 422);
            }

            $pdo  = Database::getConnection();
            $stmt = $pdo->prepare(
                "SELECT u.id_usuario, u.nombre, u.email, u.telefono, u.estado,
                        u.es_cliente_frecuente, u.cantidad_alquileres,
                        u.password_hash, r.codigo_rol, r.nombre_rol
                 FROM usuarios u
                 INNER JOIN roles r ON r.id_rol = u.rol_id
                 WHERE u.email = ?
                 LIMIT 1"
            );
            $stmt->execute([$email]);
            $fila = $stmt->fetch();

            if (!$fila || !password_verify($password, $fila['password_hash'])) {
                json_salida(false, null, 'Credenciales incorrectas', 401);
            }

            if ($fila['estado'] !== 'ACTIVO') {
                json_salida(false, null, 'Su cuenta se encuentra ' . strtolower($fila['estado']), 403);
            }

            session_regenerate_id(true);

            $_SESSION['usuario'] = [
                'id'          => (int)$fila['id_usuario'],
                'nombre'      => $fila['nombre'],
                'email'       => $fila['email'],
                'telefono'    => $fila['telefono'],
                'rol'         => $fila['codigo_rol'],
                'nombre_rol'  => $fila['nombre_rol'],
                'frecuente'   => (bool)$fila['es_cliente_frecuente'],
                'alquileres'  => (int)$fila['cantidad_alquileres'],
            ];

            json_salida(true, ['usuario' => $_SESSION['usuario']], 'Bienvenido, ' . $fila['nombre']);
            break;

        case 'logout':
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                setcookie(session_name(), '', time() - 42000, '/');
            }
            session_destroy();
            json_salida(true, null, 'Sesión finalizada');
            break;

        case 'me':
            if (empty($_SESSION['usuario'])) {
                json_salida(false, null, 'Sin sesión activa', 401);
            }
            json_salida(true, ['usuario' => $_SESSION['usuario']]);
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, 'Error interno: ' . $e->getMessage(), 500);
}
