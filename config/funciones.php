<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

const SESION_TTL = 1800;

function verificar_sesion_activa(): void
{
    $ultima = $_SESSION['ultima_actividad'] ?? 0;
    if ($ultima && (time() - $ultima) > SESION_TTL) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            setcookie(session_name(), '', time() - 42000, '/');
        }
        session_destroy();
        json_salida(false, null, 'Sesión expirada por inactividad', 401);
    }
    $_SESSION['ultima_actividad'] = time();
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function requerir_csrf(): void
{
    $token = (string)json_entrada('_csrf', '');
    if ($token === '' || !hash_equals(csrf_token(), $token)) {
        json_salida(false, null, 'Token CSRF no válido o ausente', 403);
    }
}

function json_salida(bool $ok, mixed $datos = null, string $mensaje = '', int $http = 200): never
{
    http_response_code($http);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        ['ok' => $ok, 'mensaje' => $mensaje, 'datos' => $datos],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function cuerpo_json(): array
{
    $bruto = file_get_contents('php://input');
    $datos = json_decode($bruto ?: '[]', true);
    return is_array($datos) ? $datos : [];
}

function requerir_login(): array
{
    verificar_sesion_activa();
    if (empty($_SESSION['usuario'])) {
        json_salida(false, null, 'Sesión no iniciada', 401);
    }
    return $_SESSION['usuario'];
}

function requerir_roles(array $roles): array
{
    $usuario = requerir_login();
    if (!in_array($usuario['rol'], $roles, true)) {
        json_salida(false, null, 'No tiene permisos para esta operación', 403);
    }
    return $usuario;
}

function mensaje_sql(Throwable $e): string
{
    if (preg_match('/:\s\d+\s(.+)$/u', $e->getMessage(), $m)) {
        return trim($m[1]);
    }
    return 'Error de base de datos: ' . $e->getMessage();
}

function json_entrada(string $clave, mixed $porDefecto = null): mixed
{
    static $cuerpo = null;
    if ($cuerpo === null) {
        $cuerpo = cuerpo_json();
    }
    return $cuerpo[$clave] ?? $porDefecto;
}
