# E-Bike Management — Sistema de Gestión de Bicicletas Eléctricas

Implementación del SDD (Software Design Description) con **PHP nativo**, **MySQL/MariaDB**, **Bootstrap 5**, **HTML5 Canvas** y **SweetAlert2**.

## Características

- Autenticación con `password_hash()` y RBAC por roles: **ADMIN**, **TECNICO**, **CLIENTE** (+ OPERADOR y SUPERVISOR de lectura)
- CRUD de alquileres centralizado en **procedimientos almacenados** vía PDO con consultas preparadas
- Integridad transaccional respaldada por **13 triggers** (descuento de cliente frecuente 10 %, validación de batería ≥ 20 %, cambios de estado de bicicletas, auditoría, alertas energéticas)
- Reporte estadístico `sp_reporte_cantidad_alquileres` con filtros **diario / semanal / mensual** renderizado en **Canvas** (barras y dona interactivas)
- Evento diario que reevalúa clientes frecuentes (≥ 5 alquileres en 30 días)
- SPA responsiva (móvil / tablet / escritorio) con paleta verde caro 55 %, verde menta 30 %, verde oliva 15 %, dorado 10 %

## Requisitos

- [Laragon](https://laragon.org/) (PHP 8+, MariaDB 10.10+ o MySQL 8+) o XAMPP equivalente

## Instalación

1. Clonar en la raíz web (ej. `C:\laragon\www\Bisicleta`).
2. Importar la base de datos:
   ```bash
   mysql -u root --default-character-set=utf8mb4 < Bisicleta.sql
   ```
   (o desde HeidiSQL/phpMyAdmin; el script incluye `SET NAMES utf8mb4`).
3. Revisar credenciales en `config/config.php` (por defecto: host `127.0.0.1`, usuario `root`, sin clave).
4. (Opcional) Crear/restaurar usuarios de prueba: abrir `http://localhost/Bisicleta/creacion_usuario_prueba.php`.
5. Entrar a `http://localhost/Bisicleta/`.

## Usuarios de prueba

| Email | Contraseña | Rol |
|---|---|---|
| admin@ebike.com | Admin123* | ADMIN |
| tecnico@ebike.com | Tecnico123* | TECNICO |
| cliente@ebike.com | Cliente123* | CLIENTE |
| supervisor@ebike.com | Cliente123* | SUPERVISOR |

## Estructura

```
Bisicleta.sql                  Script completo: tablas, triggers, SPs, evento, datos demo
creacion_usuario_prueba.php    Alta de usuarios de prueba (script independiente)
index.php                      Shell de la SPA
config/                        Conexión PDO, sesión y RBAC
api/                           Endpoints JSON (auth, alquileres, reportes, catálogos…)
assets/css/estilos.css         Paleta y diseño responsivo
assets/js/app.js               Lógica SPA + modales SweetAlert2
assets/js/graficos.js          Motor de gráficos Canvas (barras + dona)
```
