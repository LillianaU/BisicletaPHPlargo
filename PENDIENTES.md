# MEMORIA DEL PROYECTO — E-Bike Management (Bisicleta)

Fecha de actualización: 2026-10-14
Ubicación: `C:\laragon\www\Bisicleta`
URL local: `http://localhost/Bisicleta/`

---

## ESTADO ACTUAL — PROYECTO COMPLETO Y FUNCIONANDO

El sistema está 100 % operativo y probado en navegador:

| Componente | Estado |
|---|---|
| `Bisicleta.sql` (16 tablas, 13 triggers, 10 SPs, evento, datos demo) | Listo e importado |
| Backend PHP nativo + PDO (`config/`, `api/*.php`) | Listo |
| `creacion_usuario_prueba.php` (muestra contraseñas en salida) | Listo |
| SPA Bootstrap 5 + SweetAlert2 + Canvas (`index.php`, `assets/`) | Listo |
| Panel Mantenimientos con KPIs + dona por tipo + barras por estado | Listo |
| Gráficos Canvas corregidos (tamaño estable, eje Y "nice ticks", valores sobre barras, leyenda) | Listo |
| Pruebas E2E (login por roles, CRUD alquileres con descuento 10 %, finalizar con pago, anular) | Aprobadas |

Credenciales de prueba (sembradas en el SQL y en `creacion_usuario_prueba.php`):

```
admin@ebike.com     Admin123*     (ADMIN)
tecnico@ebike.com   Tecnico123*   (TECNICO)
cliente@ebike.com   Cliente123*   (CLIENTE)
cliente2@ebike.com  Cliente123*   (CLIENTE)
supervisor@ebike.com Cliente123*  (SUPERVISOR)
```

---

## TAREA PENDIENTE 1 — Subir a GitHub (NO INICIADA)

Destino solicitado: `https://github.com/LillianaU/BisicletaPHPlargo`
Cuenta: **LillianaU** (correo lillianauribe@gmail.com)

**Bloqueo encontrado:** `gh` CLI instalado (v2.96.0) pero sin sesión. El flujo de
dispositivo (github.com/login/device) falló 3 veces — GitHub siempre devolvía
`authorization_pending` aunque la usuaria confirmó haber autorizado. Se solicitó
un PAT y la respuesta quedó sin contestar.

### Pasos para continuar (cuando haya credenciales)

1. Autenticar (elegir una):
   - **Opción A (token):** crear PAT en https://github.com/settings/tokens/new
     marcando la casilla `repo`, luego:
     ```powershell
     gh auth login --with-token   # pegar el token cuando lo pida
     gh auth status               # debe mostrar la cuenta LillianaU
     ```
   - **Opción B (manual):** la usuaria ejecuta `gh auth login` en su propia
     terminal y confirma que termina bien.

2. Crear `.gitignore` en la raíz del proyecto con:
   ```gitignore
   *.log
   .DS_Store
   Thumbs.db
   .vscode/
   .idea/
   ```

3. Inicializar y subir (desde `C:\laragon\www\Bisicleta`):
   ```powershell
   git init -b main
   git add -A
   git -c user.name="LillianaU" -c user.email="lillianauribe@gmail.com" commit -m "Sistema de Gestion de Bicicletas Electricas: PHP nativo + MySQL + Bootstrap + Canvas"
   git remote add origin https://github.com/LillianaU/BisicletaPHPlargo.git
   git push -u origin main
   ```
   Nota: si `gh` está autenticado, antes del push ejecutar `gh auth setup-git`
   para que git use las credenciales de gh. Si se usa el token directo:
   `git push https://LillianaU:<TOKEN>@github.com/LillianaU/BisicletaPHPlargo.git main`

4. Si el repositorio no existe aún, crearlo con:
   ```powershell
   gh repo create LillianaU/BisicletaPHPlargo --public --description "Sistema de Gestion de Bicicletas Electricas (SDD): PHP nativo, MySQL/MariaDB, Bootstrap, Canvas, SweetAlert2"
   ```

---

## TAREA PENDIENTE 2 — Persistir el seed de mantenimientos en el SQL

Los 5 mantenimientos demo se insertaron directo en la BD (no están en
`Bisicleta.sql`). Si se reimporta el SQL, el panel de Mantenimientos quedará
vacío. Para fijarlos, agregar al final de la sección 7 de `Bisicleta.sql`
(antes del `DELIMITER ;` final o en SQL plano):

```sql
INSERT INTO mantenimientos (id_bicicleta, tipo_manten, diagnostico, descripcion, tecnico, estado, fecha_ingreso, fecha_salida, costo) VALUES
(8,'PREVENTIVO','Desgaste leve de pastillas de freno','Cambio de pastillas y ajuste general',1,'FINALIZADO', NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 10 DAY, 120000),
(4,'CORRECTIVO','Falla en controlador de motor','Reemplazo de controlador 350W',1,'FINALIZADO', NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 6 DAY, 295000),
(6,'PREVENTIVO','Revisión de 500 km','Mantenimiento preventivo programado',2,'EN_REVISION', NOW() - INTERVAL 1 DAY, NULL, 0),
(7,'CORRECTIVO','Cadena floja y rayada','Cambio de cadena 9v',2,'PROGRAMADO', NOW() - INTERVAL 3 HOUR, NULL, 0),
(5,'EMERGENCIA','Frenos sin respuesta reportada por usuario',NULL,1,'CANCELADO', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 19 DAY, 0);
```

---

## TAREA OPCIONAL 3 — README del repositorio

No creado por defecto. Si se desea, incluir: descripción del SDD, requisitos
(Laragon: PHP 8+, MariaDB 10.10+), pasos de instalación (importar
`Bisicleta.sql`, configurar `config/config.php`, abrir
`creacion_usuario_prueba.php`, entrar a `index.php`) y las credenciales de prueba.

---

## ESTRUCTURA DEL PROYECTO (referencia)

```
Bisicleta/
├── Bisicleta.sql                  Script completo de BD (importar con utf8mb4)
├── creacion_usuario_prueba.php    Alta de usuarios de prueba (independiente)
├── index.php                      Shell SPA
├── config/
│   ├── config.php                 Credenciales BD (Laragon: root sin clave)
│   ├── database.php               Singleton PDO
│   └── funciones.php              Sesión, RBAC, JSON, mensajes SQL
├── api/
│   ├── auth.php                   login / logout / me
│   ├── alquileres.php             CRUD vía SPs + finalizar + anular
│   ├── reportes.php               resumen KPIs + sp_reporte_cantidad_alquileres
│   ├── catalogos.php              estaciones, bicicletas, clientes, repuestos, medios
│   ├── usuarios.php               gestión usuarios + perfil
│   ├── mantenimientos.php         órdenes + repuestos + finalizar/cancelar
│   ├── inventario.php             CRUD repuestos
│   ├── alertas.php                alertas energéticas (atender/cerrar)
│   └── pagos.php                  medios de pago del cliente
└── assets/
    ├── css/estilos.css            Paleta: verde caro 55%, menta 30%, oliva 15%, dorado 10%
    └── js/
        ├── app.js                 SPA (vistas, modales SweetAlert2, RBAC)
        └── graficos.js            Motor Canvas (barras + dona, tooltip, leyenda)
```

## NOTAS TÉCNICAS IMPORTANTES (lecciones de esta sesión)

- MariaDB 11.7 es el servidor activo (no MySQL): validar sintaxis contra MariaDB.
- Columnas `uuid` necesitan `DEFAULT (UUID())` porque el modo estricto valida el
  default ANTES de ejecutar los triggers.
- `DECLARE` en triggers/procedures debe ir al inicio del bloque `BEGIN`.
- IMPORTANTE: no editar `Bisicleta.sql` con `Set-Content` de PowerShell 5.1 —
  corrompe el UTF-8 (doble codificación). Ya está reparado; usar el Write tool
  o PHP para reescribirlo.
- El import exige `--default-character-set=utf8mb4` (el script incluye `SET NAMES utf8mb4`).
