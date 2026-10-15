# E-Bike Management — Sistema de Gestión de Bicicletas Eléctricas

Implementación del SDD (Software Design Description) con **PHP nativo**, **MySQL/MariaDB**, **Bootstrap 5**, **HTML5 Canvas** y **SweetAlert2**.

## ¿En qué consiste el sistema?

Plataforma web para administrar una red de bicicletas eléctricas y sus estaciones de carga:

- **Flota**: estado de cada bicicleta (batería, kilometraje, estación actual), baterías con temperaturas e historial
- **Alquileres**: ciclo completo (reservar → activo → finalizar con cobro / anular), transacciones de pago y medios de pago por cliente
- **Clientes frecuentes**: descuento automático del 10 % aplicado por trigger a quienes superan 5 alquileres en 30 días (evaluados por evento diario)
- **Mantenimientos**: órdenes preventivas/correctivas con inventario de repuestos, control de stock y auditoría de cambios de estado
- **Energía**: alertas automáticas por batería baja o sobrecalentamiento, energía disponible por estación
- **Reportes estadísticos**: alquileres por día/semana/mes renderizados en Canvas (barras y dona interactivas), KPIs de ingresos y operación

## Arquitectura

Arquitectura **monolítica de 3 capas** con estilo **SPA + API JSON** (MVC simplificado):

| Capa | Tecnología | Componentes |
|---|---|---|
| **Presentación** (Vista) | Bootstrap 5, CSS propio, Canvas HTML5, SweetAlert2 | `index.php`, `assets/js/app.js`, `assets/js/graficos.js` |
| **Lógica de negocio** (Controlador) | PHP nativo sin framework, PDO, sesiones, RBAC | `api/*.php`, `config/funciones.php` |
| **Datos** (Modelo) | MySQL/MariaDB: procedimientos almacenados, triggers, evento programado, constraints | `Bisicleta.sql` |

El frontend nunca accede a la base de datos: toda comunicación es `fetch` + JSON contra los endpoints, y la lógica crítica vive delegada en la base de datos.

### Patrones de diseño utilizados

| Patrón | Dónde |
|---|---|
| **Singleton** | `config/database.php` — una única conexión PDO por petición |
| **Front Controller** (simplificado) | Cada `api/*.php` recibe `?accion=` y despacha a un `switch` central |
| **MVC** (variante ligera) | Vista = SPA JS · Controlador = endpoints PHP · Modelo = SPs y triggers |
| **Data Mapper / DAO** (práctico) | Lectura con PDO `FETCH_ASSOC` hacia arrays transferibles en JSON |
| **Lógica en la base de datos** | Reglas de negocio centralizadas en SPs; integridad y reacciones en triggers (patrón *Observer* a nivel BD) |
| **Module Pattern + IIFE** | `app.js` y `graficos.js` con `'use strict'` y funciones encapsuladas |
| **Registry** | `$_SESSION` como almacén central de identidad (usuario, CSRF, actividad) |

## Capas de seguridad

| # | Capa | Implementación |
|---|---|---|
| 1 | **Autenticación** | `password_hash()` (bcrypt) + `password_verify()`; nunca texto plano |
| 2 | **Gestión de sesión** | Sesiones PHP con `session_regenerate_id()` al entrar; **vencimiento por inactividad a los 30 minutos** (`SESION_TTL` en `config/funciones.php`) |
| 3 | **RBAC server-side** | `requerir_roles()` en cada endpoint; el menú por rol del cliente es solo cosmético, la validación real es del servidor |
| 4 | **Propiedad de recursos** | Un CLIENTE solo consulta y opera sobre SUS alquileres y medios de pago (verificación de `id_usuario` en servidor) |
| 5 | **CSRF** | Token aleatorio por sesión (`random_bytes`) exigido en **todas las operaciones POST** (`requerir_csrf()`); el frontend lo envía automáticamente |
| 6 | **Anti SQL Injection** | PDO con consultas preparadas reales (`ATTR_EMULATE_PREPARES = false`) |
| 7 | **Integridad en BD** | Llaves foráneas, `CHECK` constraints, transacciones con rollback automático y `SIGNAL` para reglas de negocio |
| 8 | **Validación de entrada** | Cast de tipos, listas blancas de estados/enums, filtro de email |
| 9 | **Errores controlados** | Mensajes SQL depurados (sin stack trace), códigos HTTP correctos, credenciales aisladas en `config/config.php` |

Mejora futura recomendada: cabeceras de seguridad HTTP (CSP, HSTS) y limitación de intentos de login.

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
