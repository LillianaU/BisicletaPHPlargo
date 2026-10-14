<?php

class Database
{
    private static ?PDO $conexion = null;

    public static function getConnection(): PDO
    {
        if (self::$conexion === null) {
            $cfg = require __DIR__ . '/config.php';

            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $cfg['host'],
                $cfg['puerto'],
                $cfg['basedatos'],
                $cfg['charset']
            );

            self::$conexion = new PDO($dsn, $cfg['usuario'], $cfg['clave'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }

        return self::$conexion;
    }
}
