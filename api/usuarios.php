<?php

require_once __DIR__ . '/../config/funciones.php';
require_once __DIR__ . '/../config/database.php';

$accion = $_GET['accion'] ?? '';
$pdo    = Database::getConnection();

try {
    switch ($accion) {

        case 'listar':
            $usuario = requerir_roles(['ADMIN', 'SUPERVISOR']);
            $filas = $pdo->query(
                "SELECT u.id_usuario, u.uuid, u.nombre, u.email, u.telefono, u.estado,
                        u.es_cliente_frecuente, u.cantidad_alquileres, u.fecha_registro,
                        r.codigo_rol, r.nombre_rol
                 FROM usuarios u
                 INNER JOIN roles r ON r.id_rol = u.rol_id
                 ORDER BY u.fecha_registro DESC"
            )->fetchAll();
            json_salida(true, ['usuarios' => $filas]);
            break;

        case 'roles':
            requerir_roles(['ADMIN']);
            $filas = $pdo->query("SELECT id_rol, codigo_rol, nombre_rol FROM roles ORDER BY nivel_acceso DESC")->fetchAll();
            json_salida(true, ['roles' => $filas]);
            break;

        case 'crear':
            requerir_csrf();
            requerir_roles(['ADMIN']);

            $nombre   = trim((string)json_entrada('nombre', ''));
            $email    = trim((string)json_entrada('email', ''));
            $password = (string)json_entrada('password', '');
            $telefono = trim((string)json_entrada('telefono', ''));
            $rolId    = (int)json_entrada('rol_id', 0);

            if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || !$rolId) {
                json_salida(false, null, 'Datos incompletos: nombre, email válido, contraseña (mín. 8) y rol son obligatorios', 422);
            }

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE email = ?");
            $stmt->execute([$email]);
            if ((int)$stmt->fetchColumn() > 0) {
                json_salida(false, null, 'El email ya está registrado', 409);
            }

            $stmt = $pdo->prepare(
                "INSERT INTO usuarios (nombre, email, password_hash, telefono, rol_id)
                 VALUES (?, ?, ?, ?, ?)"
            );
            $stmt->execute([$nombre, $email, password_hash($password, PASSWORD_DEFAULT), $telefono ?: null, $rolId]);

            json_salida(true, ['id_usuario' => (int)$pdo->lastInsertId()], 'Usuario creado correctamente');
            break;

        case 'cambiar_estado':
            requerir_csrf();
            requerir_roles(['ADMIN']);
            $id     = (int)json_entrada('id_usuario', 0);
            $estado = strtoupper((string)json_entrada('estado', ''));

            if (!in_array($estado, ['ACTIVO', 'INACTIVO', 'BLOQUEADO'], true)) {
                json_salida(false, null, 'Estado no válido', 422);
            }

            $stmt = $pdo->prepare("UPDATE usuarios SET estado = ? WHERE id_usuario = ? AND id_usuario <> ?");
            $stmt->execute([$estado, $id, $_SESSION['usuario']['id']]);

            json_salida(true, null, 'Estado del usuario actualizado');
            break;

        case 'perfil_get':
            $usuario = requerir_login();
            json_salida(true, ['usuario' => $usuario]);
            break;

        case 'perfil_guardar':
            requerir_csrf();
            $usuario = requerir_login();
            $telefono = trim((string)json_entrada('telefono', ''));
            $passwordActual = (string)json_entrada('password_actual', '');
            $passwordNueva  = (string)json_entrada('password_nueva', '');

            $stmt = $pdo->prepare("UPDATE usuarios SET telefono = ? WHERE id_usuario = ?");
            $stmt->execute([$telefono ?: null, $usuario['id']]);

            if ($passwordNueva !== '') {
                if (strlen($passwordNueva) < 8) {
                    json_salida(false, null, 'La nueva contraseña debe tener al menos 8 caracteres', 422);
                }
                $stmt = $pdo->prepare("SELECT password_hash FROM usuarios WHERE id_usuario = ?");
                $stmt->execute([$usuario['id']]);
                if (!password_verify($passwordActual, $stmt->fetchColumn())) {
                    json_salida(false, null, 'La contraseña actual no es correcta', 401);
                }
                $stmt = $pdo->prepare("UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?");
                $stmt->execute([password_hash($passwordNueva, PASSWORD_DEFAULT), $usuario['id']]);
            }

            $_SESSION['usuario']['telefono'] = $telefono;
            json_salida(true, null, 'Perfil actualizado correctamente');
            break;

        default:
            json_salida(false, null, 'Acción no válida', 400);
    }
} catch (Throwable $e) {
    json_salida(false, null, mensaje_sql($e), 400);
}
