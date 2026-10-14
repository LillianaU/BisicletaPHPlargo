-- ============================================================
-- BASE DE DATOS: SISTEMA DE GESTIÓN DE BICICLETAS ELÉCTRICAS
-- PHP nativo + MySQL / MariaDB + Bootstrap + Canvas (SDD)
-- ============================================================

DROP DATABASE IF EXISTS ebike_management;
CREATE DATABASE ebike_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ebike_management;

SET NAMES utf8mb4;


-- ============================================================
-- 1. ESTRUCTURA DE TABLAS
-- ============================================================

-- 1.1 ROLES
CREATE TABLE roles (
    id_rol INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo_rol VARCHAR(30) NOT NULL UNIQUE,
    nombre_rol VARCHAR(100) NOT NULL,
    permisos JSON NULL,
    nivel_acceso TINYINT UNSIGNED NOT NULL DEFAULT 1,
    CONSTRAINT chk_roles_nivel CHECK (nivel_acceso BETWEEN 1 AND 10)
) ENGINE=InnoDB;

-- 1.2 USUARIOS
CREATE TABLE usuarios (
    id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    estado ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    es_cliente_frecuente BOOLEAN NOT NULL DEFAULT FALSE,
    cantidad_alquileres INT UNSIGNED NOT NULL DEFAULT 0,
    fecha_ultima_evaluacion DATETIME NULL,
    rol_id INT UNSIGNED NOT NULL,
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (rol_id) REFERENCES roles(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_usuarios_rol (rol_id),
    INDEX idx_usuarios_estado (estado),
    INDEX idx_usuarios_frecuente (es_cliente_frecuente)
) ENGINE=InnoDB;

-- 1.3 EMPLEADOS
CREATE TABLE empleados (
    id_empleado BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    cargo VARCHAR(100) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_empleados_estado (estado)
) ENGINE=InnoDB;

-- 1.4 ESTACIONES
CREATE TABLE estaciones (
    id_estacion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    coordenadas VARCHAR(100),
    capacidad INT UNSIGNED NOT NULL,
    energia_disp DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado ENUM('ACTIVA', 'INACTIVA', 'MANTENIMIENTO', 'FUERA_SERVICIO') NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT chk_estacion_capacidad CHECK (capacidad > 0),
    CONSTRAINT chk_estacion_energia CHECK (energia_disp >= 0),
    INDEX idx_estaciones_estado (estado)
) ENGINE=InnoDB;

-- 1.5 BICICLETAS
CREATE TABLE bicicletas (
    id_bicicleta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    estacion_act INT UNSIGNED NULL,
    codigo_qr VARCHAR(150) NOT NULL UNIQUE,
    modelo VARCHAR(100) NOT NULL,
    num_serie VARCHAR(100) NOT NULL UNIQUE,
    nivel_bateria DECIMAL(5,2) NOT NULL DEFAULT 100,
    estado ENUM('DISPONIBLE', 'ALQUILADA', 'MANTENIMIENTO', 'FUERA_SERVICIO', 'CARGANDO') NOT NULL DEFAULT 'DISPONIBLE',
    kilometraje DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_bicicletas_estaciones FOREIGN KEY (estacion_act) REFERENCES estaciones(id_estacion) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_bicicleta_bateria CHECK (nivel_bateria BETWEEN 0 AND 100),
    CONSTRAINT chk_bicicleta_kilometraje CHECK (kilometraje >= 0),
    INDEX idx_bicicletas_estacion (estacion_act),
    INDEX idx_bicicletas_estado (estado),
    INDEX idx_bicicletas_bateria (nivel_bateria)
) ENGINE=InnoDB;

-- 1.6 ALQUILERES
CREATE TABLE alquileres (
    id_alquiler BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid_alquiler CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
    id_usuario BIGINT UNSIGNED NOT NULL,
    id_bicicleta BIGINT UNSIGNED NOT NULL,
    estacion_orig INT UNSIGNED NOT NULL,
    estacion_dest INT UNSIGNED NULL,
    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME NULL,
    costo_base DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
    porcentaje_descuento DECIMAL(5,2) NOT NULL DEFAULT 0,
    costo_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado ENUM('RESERVADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO', 'PENDIENTE_PAGO') NOT NULL DEFAULT 'RESERVADO',
    CONSTRAINT fk_alquiler_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_alquiler_bicicleta FOREIGN KEY (id_bicicleta) REFERENCES bicicletas(id_bicicleta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_alquiler_estacion_origen FOREIGN KEY (estacion_orig) REFERENCES estaciones(id_estacion) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_alquiler_estacion_destino FOREIGN KEY (estacion_dest) REFERENCES estaciones(id_estacion) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_alquiler_costos CHECK (costo_base >= 0 AND descuento >= 0 AND costo_total >= 0),
    CONSTRAINT chk_alquiler_descuento CHECK (porcentaje_descuento BETWEEN 0 AND 100),
    INDEX idx_alquiler_usuario (id_usuario),
    INDEX idx_alquiler_bicicleta (id_bicicleta),
    INDEX idx_alquiler_estado (estado),
    INDEX idx_alquiler_fecha_inicio (fecha_inicio),
    INDEX idx_alquiler_fecha_fin (fecha_fin)
) ENGINE=InnoDB;

-- 1.7 MÉTODOS DE PAGO
CREATE TABLE metodos_pago (
    id_metodo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario BIGINT UNSIGNED NOT NULL,
    tipo ENUM('EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'PSE', 'NEQUI', 'DAVIPLATA', 'OTRO') NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_metodo_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_metodos_usuario (id_usuario),
    INDEX idx_metodos_activo (activo)
) ENGINE=InnoDB;

-- 1.8 TRANSACCIONES
CREATE TABLE transacciones (
    id_transaccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_alquiler BIGINT UNSIGNED NOT NULL,
    id_metodo_pago BIGINT UNSIGNED NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    estado_pago ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO', 'REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
    referencia_ext VARCHAR(150) NULL,
    fecha_proceso DATETIME NULL,
    imagen_verificar VARCHAR(500) NULL,
    CONSTRAINT fk_transaccion_alquiler FOREIGN KEY (id_alquiler) REFERENCES alquileres(id_alquiler) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_transaccion_metodo FOREIGN KEY (id_metodo_pago) REFERENCES metodos_pago(id_metodo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_transaccion_monto CHECK (monto >= 0),
    INDEX idx_transacciones_alquiler (id_alquiler),
    INDEX idx_transacciones_metodo (id_metodo_pago),
    INDEX idx_transacciones_estado (estado_pago),
    INDEX idx_transacciones_fecha (fecha_proceso)
) ENGINE=InnoDB;

-- 1.9 INVENTARIO DE REPUESTOS
CREATE TABLE inventario_costos (
    id_repuesto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_rep VARCHAR(150) NOT NULL,
    cantidad_disponible INT UNSIGNED NOT NULL DEFAULT 0,
    precio_actual DECIMAL(12,2) NOT NULL DEFAULT 0,
    costo_repuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
    proveedor VARCHAR(150),
    costo_mano_obra DECIMAL(12,2) NOT NULL DEFAULT 0,
    costo_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_inventario_cantidad CHECK (cantidad_disponible >= 0),
    CONSTRAINT chk_inventario_precios CHECK (precio_actual >= 0 AND costo_repuestos >= 0 AND costo_mano_obra >= 0 AND costo_total >= 0)
) ENGINE=InnoDB;

-- 1.10 MANTENIMIENTOS
CREATE TABLE mantenimientos (
    id_manten BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_bicicleta BIGINT UNSIGNED NOT NULL,
    tipo_manten ENUM('PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'EMERGENCIA') NOT NULL,
    diagnostico TEXT,
    descripcion TEXT,
    tecnico BIGINT UNSIGNED NULL,
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida DATETIME NULL,
    costo DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado ENUM('PROGRAMADO', 'EN_REVISION', 'EN_REPARACION', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'PROGRAMADO',
    CONSTRAINT fk_mantenimiento_bicicleta FOREIGN KEY (id_bicicleta) REFERENCES bicicletas(id_bicicleta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mantenimiento_tecnico FOREIGN KEY (tecnico) REFERENCES empleados(id_empleado) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_mantenimiento_costo CHECK (costo >= 0),
    INDEX idx_mantenimiento_bicicleta (id_bicicleta),
    INDEX idx_mantenimiento_estado (estado),
    INDEX idx_mantenimiento_tecnico (tecnico),
    INDEX idx_mantenimiento_fecha (fecha_ingreso)
) ENGINE=InnoDB;

-- 1.11 DETALLE REPUESTOS MANTENIMIENTO
CREATE TABLE mantenimiento_repuestos (
    id_mantenimiento_repuesto BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_manten BIGINT UNSIGNED NOT NULL,
    id_repuesto BIGINT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_mr_mantenimiento FOREIGN KEY (id_manten) REFERENCES mantenimientos(id_manten) ON DELETE CASCADE,
    CONSTRAINT fk_mr_repuesto FOREIGN KEY (id_repuesto) REFERENCES inventario_costos(id_repuesto) ON DELETE RESTRICT,
    CONSTRAINT chk_mr_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_mr_precio CHECK (precio_unitario >= 0),
    CONSTRAINT chk_mr_subtotal CHECK (subtotal >= 0),
    UNIQUE (id_manten, id_repuesto)
) ENGINE=InnoDB;

-- 1.12 LOGS DE AUDITORÍA
CREATE TABLE logs_auditoria (
    id_log BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_manten BIGINT UNSIGNED NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    id_empleado BIGINT UNSIGNED NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_mantenimiento FOREIGN KEY (id_manten) REFERENCES mantenimientos(id_manten) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_log_empleado FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_logs_mantenimiento (id_manten),
    INDEX idx_logs_empleado (id_empleado),
    INDEX idx_logs_fecha (fecha_hora)
) ENGINE=InnoDB;

-- 1.13 BATERÍAS
CREATE TABLE baterias (
    id_bateria BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo_bateria VARCHAR(100) NOT NULL UNIQUE,
    capacidad_wh DECIMAL(10,2) NOT NULL,
    nivel_carga DECIMAL(5,2) NOT NULL DEFAULT 100,
    temperatura DECIMAL(6,2) NULL,
    estado ENUM('DISPONIBLE', 'INSTALADA', 'CARGANDO', 'BAJA', 'DAÑADA', 'FUERA_SERVICIO') NOT NULL DEFAULT 'DISPONIBLE',
    fecha_instalacion DATE NULL,
    vida_util INT UNSIGNED NULL,
    id_bicicleta BIGINT UNSIGNED NULL,
    CONSTRAINT fk_bateria_bicicleta FOREIGN KEY (id_bicicleta) REFERENCES bicicletas(id_bicicleta) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_bateria_capacidad CHECK (capacidad_wh > 0),
    CONSTRAINT chk_bateria_carga CHECK (nivel_carga BETWEEN 0 AND 100),
    INDEX idx_baterias_bicicleta (id_bicicleta),
    INDEX idx_baterias_estado (estado)
) ENGINE=InnoDB;

-- 1.14 HISTORIAL DE CARGA
CREATE TABLE historial_carga (
    id_historial BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_bateria BIGINT UNSIGNED NOT NULL,
    id_estacion INT UNSIGNED NOT NULL,
    porcentaje_inicial DECIMAL(5,2) NOT NULL,
    porcentaje_final DECIMAL(5,2) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    tiempo_carga INT UNSIGNED NULL COMMENT 'Tiempo en minutos',
    energia_consumida DECIMAL(10,3) NULL COMMENT 'Energia en kWh',
    CONSTRAINT fk_historial_bateria FOREIGN KEY (id_bateria) REFERENCES baterias(id_bateria) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_historial_estacion FOREIGN KEY (id_estacion) REFERENCES estaciones(id_estacion) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_historial_porcentajes CHECK (porcentaje_inicial BETWEEN 0 AND 100 AND porcentaje_final BETWEEN 0 AND 100),
    INDEX idx_historial_bateria (id_bateria),
    INDEX idx_historial_estacion (id_estacion),
    INDEX idx_historial_fecha (fecha_inicio)
) ENGINE=InnoDB;

-- 1.15 ALERTAS DE ENERGÍA
CREATE TABLE alertas_energia (
    id_alerta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_bateria BIGINT UNSIGNED NOT NULL,
    tipo_alerta ENUM('BATERIA_BAJA', 'SOBRETEMPERATURA', 'BATERIA_DAÑADA', 'SOBRECARGA', 'MANTENIMIENTO', 'OTRA') NOT NULL,
    descripcion TEXT NOT NULL,
    nivel_prioridad ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
    fecha_alerta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado_alerta ENUM('PENDIENTE', 'ATENDIDA', 'CERRADA') NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT fk_alerta_bateria FOREIGN KEY (id_bateria) REFERENCES baterias(id_bateria) ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_alertas_bateria (id_bateria),
    INDEX idx_alertas_estado (estado_alerta),
    INDEX idx_alertas_prioridad (nivel_prioridad)
) ENGINE=InnoDB;

-- 1.16 REGISTRO DE ENERGÍA
CREATE TABLE registro_energia (
    id_registro BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_estacion INT UNSIGNED NOT NULL,
    cantidad_kwh DECIMAL(12,3) NOT NULL,
    costo_kwh DECIMAL(12,4) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_costo DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado_registro ENUM('PENDIENTE', 'PAGADO', 'ANULADO') NOT NULL DEFAULT 'PENDIENTE',
    descripcion TEXT,
    CONSTRAINT fk_registro_estacion FOREIGN KEY (id_estacion) REFERENCES estaciones(id_estacion) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_energia_cantidad CHECK (cantidad_kwh >= 0),
    CONSTRAINT chk_energia_costo CHECK (costo_kwh >= 0),
    INDEX idx_energia_estacion (id_estacion),
    INDEX idx_energia_fecha (fecha_registro),
    INDEX idx_energia_estado (estado_registro)
) ENGINE=InnoDB;


-- ============================================================
-- 2. DATOS INICIALES (ROLES)
-- ============================================================

INSERT INTO roles (codigo_rol, nombre_rol, permisos, nivel_acceso) VALUES
('ADMIN', 'Administrador General', JSON_OBJECT('usuarios', 'CRUD', 'estaciones', 'CRUD', 'bicicletas', 'CRUD', 'alquileres', 'CRUD', 'pagos', 'CRUD', 'mantenimiento', 'CRUD', 'energia', 'CRUD', 'reportes', 'CRUD'), 10),
('OPERADOR', 'Operador de Estación', JSON_OBJECT('estaciones', 'READ', 'bicicletas', 'CRUD', 'alquileres', 'CRUD'), 6),
('TECNICO', 'Técnico de Mantenimiento', JSON_OBJECT('bicicletas', 'READ', 'mantenimiento', 'CRUD', 'inventario', 'READ'), 5),
('SUPERVISOR', 'Supervisor', JSON_OBJECT('usuarios', 'READ', 'estaciones', 'READ', 'bicicletas', 'READ', 'alquileres', 'READ', 'mantenimiento', 'READ', 'reportes', 'READ'), 8),
('CLIENTE', 'Cliente', JSON_OBJECT('perfil', 'CRUD', 'alquileres', 'READ', 'pagos', 'CRUD'), 1);


-- ============================================================
-- 3. TRIGGERS
-- ============================================================

DELIMITER $$

-- 1. UUID Usuario
CREATE TRIGGER trg_usuarios_uuid
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
    IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
        SET NEW.uuid = UUID();
    END IF;
END$$

-- 2. UUID Alquiler
CREATE TRIGGER trg_alquiler_uuid
BEFORE INSERT ON alquileres
FOR EACH ROW
BEGIN
    IF NEW.uuid_alquiler IS NULL OR NEW.uuid_alquiler = '' THEN
        SET NEW.uuid_alquiler = UUID();
    END IF;
END$$

-- 3. Calcular descuento cliente frecuente
CREATE TRIGGER trg_alquiler_cliente_frecuente
BEFORE INSERT ON alquileres
FOR EACH ROW
BEGIN
    DECLARE v_cliente_frecuente BOOLEAN DEFAULT FALSE;
    SELECT es_cliente_frecuente INTO v_cliente_frecuente FROM usuarios WHERE id_usuario = NEW.id_usuario;

    IF v_cliente_frecuente = TRUE THEN
        SET NEW.porcentaje_descuento = 10;
        SET NEW.descuento = ROUND(NEW.costo_base * 0.10, 2);
        SET NEW.costo_total = ROUND(NEW.costo_base - NEW.descuento, 2);
    ELSE
        SET NEW.porcentaje_descuento = 0;
        SET NEW.descuento = 0;
        SET NEW.costo_total = NEW.costo_base;
    END IF;
END$$

-- 4. Validar disponibilidad y batería
CREATE TRIGGER trg_validar_bicicleta_alquiler
BEFORE INSERT ON alquileres
FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(30);
    DECLARE v_bateria DECIMAL(5,2);

    SELECT estado, nivel_bateria INTO v_estado, v_bateria FROM bicicletas WHERE id_bicicleta = NEW.id_bicicleta;

    IF v_estado <> 'DISPONIBLE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bicicleta no está disponible para alquiler';
    END IF;

    IF v_bateria < 20 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bicicleta tiene un nivel de batería inferior al 20%';
    END IF;
END$$

-- 5. Cambiar bicicleta a ALQUILADA
CREATE TRIGGER trg_bicicleta_alquilada
AFTER INSERT ON alquileres
FOR EACH ROW
BEGIN
    IF NEW.estado IN ('RESERVADO', 'ACTIVO') THEN
        UPDATE bicicletas SET estado = 'ALQUILADA' WHERE id_bicicleta = NEW.id_bicicleta;
    END IF;
END$$

-- 6. Liberar bicicleta al finalizar alquiler
CREATE TRIGGER trg_finalizar_alquiler
AFTER UPDATE ON alquileres
FOR EACH ROW
BEGIN
    IF NEW.estado = 'FINALIZADO' AND OLD.estado <> 'FINALIZADO' THEN
        UPDATE bicicletas SET estado = 'DISPONIBLE', estacion_act = NEW.estacion_dest WHERE id_bicicleta = NEW.id_bicicleta;
    END IF;
END$$

-- 7. Auditoría de mantenimiento
CREATE TRIGGER trg_auditoria_mantenimiento
AFTER UPDATE ON mantenimientos
FOR EACH ROW
BEGIN
    IF OLD.estado <> NEW.estado THEN
        INSERT INTO logs_auditoria (id_manten, estado_anterior, estado_nuevo, id_empleado, fecha_hora)
        VALUES (NEW.id_manten, OLD.estado, NEW.estado, NEW.tecnico, NOW());
    END IF;
END$$

-- 8. Bicicleta a MANTENIMIENTO
CREATE TRIGGER trg_bicicleta_mantenimiento
AFTER INSERT ON mantenimientos
FOR EACH ROW
BEGIN
    IF NEW.estado IN ('PROGRAMADO', 'EN_REVISION', 'EN_REPARACION') THEN
        UPDATE bicicletas SET estado = 'MANTENIMIENTO' WHERE id_bicicleta = NEW.id_bicicleta;
    END IF;
END$$

-- 9. Alerta por Batería Baja
CREATE TRIGGER trg_alerta_bateria_baja
AFTER UPDATE ON baterias
FOR EACH ROW
BEGIN
    IF NEW.nivel_carga <= 20 AND OLD.nivel_carga > 20 THEN
        INSERT INTO alertas_energia (id_bateria, tipo_alerta, descripcion, nivel_prioridad, estado_alerta)
        VALUES (NEW.id_bateria, 'BATERIA_BAJA', 'Batería en nivel crítico (<= 20%)', 'ALTA', 'PENDIENTE');
    END IF;
END$$

-- 10. Alerta por Sobretemperatura
CREATE TRIGGER trg_alerta_temperatura
AFTER UPDATE ON baterias
FOR EACH ROW
BEGIN
    IF NEW.temperatura >= 45 AND (OLD.temperatura IS NULL OR OLD.temperatura < 45) THEN
        INSERT INTO alertas_energia (id_bateria, tipo_alerta, descripcion, nivel_prioridad, estado_alerta)
        VALUES (NEW.id_bateria, 'SOBRETEMPERATURA', 'Temperatura superior a 45°C', 'CRITICA', 'PENDIENTE');
    END IF;
END$$

-- 11. Recalcular descuento al actualizar costo base (integridad en UPDATE)
CREATE TRIGGER trg_alquiler_cliente_frecuente_upd
BEFORE UPDATE ON alquileres
FOR EACH ROW
BEGIN
    DECLARE v_cliente_frecuente BOOLEAN DEFAULT FALSE;
    IF NOT (OLD.costo_base <=> NEW.costo_base) THEN
        SELECT es_cliente_frecuente INTO v_cliente_frecuente FROM usuarios WHERE id_usuario = NEW.id_usuario;

        IF v_cliente_frecuente = TRUE THEN
            SET NEW.porcentaje_descuento = 10;
            SET NEW.descuento = ROUND(NEW.costo_base * 0.10, 2);
            SET NEW.costo_total = ROUND(NEW.costo_base - NEW.descuento, 2);
        ELSE
            SET NEW.porcentaje_descuento = 0;
            SET NEW.descuento = 0;
            SET NEW.costo_total = NEW.costo_base;
        END IF;
    END IF;
END$$

-- 12. Liberar bicicleta al anular un alquiler activo
CREATE TRIGGER trg_cancelar_alquiler
AFTER UPDATE ON alquileres
FOR EACH ROW
BEGIN
    IF NEW.estado = 'CANCELADO' AND OLD.estado <> 'CANCELADO' AND OLD.estado IN ('RESERVADO', 'ACTIVO') THEN
        UPDATE bicicletas SET estado = 'DISPONIBLE' WHERE id_bicicleta = NEW.id_bicicleta AND estado = 'ALQUILADA';
    END IF;
END$$

-- 13. Liberar bicicleta al finalizar un mantenimiento
CREATE TRIGGER trg_mantenimiento_finalizado
AFTER UPDATE ON mantenimientos
FOR EACH ROW
BEGIN
    IF NEW.estado = 'FINALIZADO' AND OLD.estado <> 'FINALIZADO' THEN
        UPDATE bicicletas SET estado = 'DISPONIBLE' WHERE id_bicicleta = NEW.id_bicicleta AND estado = 'MANTENIMIENTO';
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- 4. PROCEDIMIENTOS ALMACENADOS (OPERACIONALES)
-- ============================================================

DELIMITER $$

-- 1. Registrar alquiler
CREATE PROCEDURE sp_registrar_alquiler(
    IN p_id_usuario BIGINT UNSIGNED,
    IN p_id_bicicleta BIGINT UNSIGNED,
    IN p_estacion_orig INT UNSIGNED,
    IN p_costo_base DECIMAL(12,2),
    OUT p_id_alquiler BIGINT UNSIGNED
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
        INSERT INTO alquileres (id_usuario, id_bicicleta, estacion_orig, costo_base, estado)
        VALUES (p_id_usuario, p_id_bicicleta, p_estacion_orig, p_costo_base, 'ACTIVO');
        SET p_id_alquiler = LAST_INSERT_ID();
    COMMIT;
END$$

-- 2. Finalizar alquiler y pago
CREATE PROCEDURE sp_finalizar_alquiler(
    IN p_id_alquiler BIGINT UNSIGNED,
    IN p_estacion_dest INT UNSIGNED,
    IN p_id_metodo_pago BIGINT UNSIGNED,
    IN p_referencia_pago VARCHAR(150)
)
BEGIN
    DECLARE v_monto DECIMAL(12,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
        UPDATE alquileres SET estacion_dest = p_estacion_dest, fecha_fin = NOW(), estado = 'FINALIZADO' WHERE id_alquiler = p_id_alquiler;
        SELECT costo_total INTO v_monto FROM alquileres WHERE id_alquiler = p_id_alquiler;
        INSERT INTO transacciones (id_alquiler, id_metodo_pago, monto, estado_pago, referencia_ext, fecha_proceso)
        VALUES (p_id_alquiler, p_id_metodo_pago, v_monto, 'APROBADO', p_referencia_pago, NOW());
    COMMIT;
END$$

-- 3. Asignar repuesto a mantenimiento y descontar stock
CREATE PROCEDURE sp_agregar_repuesto_mantenimiento(
    IN p_id_manten BIGINT UNSIGNED,
    IN p_id_repuesto BIGINT UNSIGNED,
    IN p_cantidad INT UNSIGNED
)
BEGIN
    DECLARE v_stock INT UNSIGNED;
    DECLARE v_precio DECIMAL(12,2);
    DECLARE v_subtotal DECIMAL(12,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

    START TRANSACTION;
        SELECT cantidad_disponible, precio_actual INTO v_stock, v_precio
        FROM inventario_costos WHERE id_repuesto = p_id_repuesto FOR UPDATE;

        IF v_stock < p_cantidad THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente de repuesto';
        END IF;

        SET v_subtotal = ROUND(v_precio * p_cantidad, 2);

        INSERT INTO mantenimiento_repuestos (id_manten, id_repuesto, cantidad, precio_unitario, subtotal)
        VALUES (p_id_manten, p_id_repuesto, p_cantidad, v_precio, v_subtotal);

        UPDATE inventario_costos SET cantidad_disponible = cantidad_disponible - p_cantidad WHERE id_repuesto = p_id_repuesto;
        UPDATE mantenimientos SET costo = costo + v_subtotal WHERE id_manten = p_id_manten;
    COMMIT;
END$$

-- 4. Reporte general de estación
CREATE PROCEDURE sp_reporte_estacion(
    IN p_id_estacion INT UNSIGNED
)
BEGIN
    SELECT
        e.nombre AS estacion,
        e.capacidad,
        COUNT(b.id_bicicleta) AS bicicletas_actuales,
        SUM(CASE WHEN b.estado = 'DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles,
        SUM(CASE WHEN b.estado = 'CARGANDO' THEN 1 ELSE 0 END) AS cargando,
        e.energia_disp AS energia_disponible_kwh
    FROM estaciones e
    LEFT JOIN bicicletas b ON e.id_estacion = b.estacion_act
    WHERE e.id_estacion = p_id_estacion
    GROUP BY e.id_estacion;
END$$

-- 5. Reevaluar cliente frecuente individual
CREATE PROCEDURE sp_evaluar_cliente_frecuente(
    IN p_id_usuario BIGINT UNSIGNED
)
BEGIN
    DECLARE v_cantidad INT DEFAULT 0;

    SELECT COUNT(*) INTO v_cantidad
    FROM alquileres
    WHERE id_usuario = p_id_usuario AND estado = 'FINALIZADO' AND fecha_fin >= NOW() - INTERVAL 30 DAY;

    UPDATE usuarios
    SET cantidad_alquileres = v_cantidad,
        es_cliente_frecuente = CASE WHEN v_cantidad >= 5 THEN TRUE ELSE FALSE END,
        fecha_ultima_evaluacion = NOW()
    WHERE id_usuario = p_id_usuario;
END$$

DELIMITER ;


-- ============================================================
-- 5. PROCEDIMIENTOS ALMACENADOS (CRUD ALQUILERES + REPORTE)
-- ============================================================

DELIMITER $$

-- 1. LISTAR alquileres (p_id_usuario NULL = todos; p_estado vacío = todos)
CREATE PROCEDURE sp_listar_alquileres(
    IN p_id_usuario BIGINT UNSIGNED,
    IN p_estado VARCHAR(20)
)
BEGIN
    SELECT
        a.id_alquiler,
        a.uuid_alquiler,
        a.id_usuario,
        u.nombre AS cliente,
        u.es_cliente_frecuente,
        a.id_bicicleta,
        b.codigo_qr,
        b.modelo,
        eo.id_estacion AS id_estacion_orig,
        eo.nombre AS estacion_origen,
        ed.id_estacion AS id_estacion_dest,
        ed.nombre AS estacion_destino,
        a.fecha_inicio,
        a.fecha_fin,
        a.costo_base,
        a.descuento,
        a.porcentaje_descuento,
        a.costo_total,
        a.estado
    FROM alquileres a
    INNER JOIN usuarios u    ON u.id_usuario = a.id_usuario
    INNER JOIN bicicletas b  ON b.id_bicicleta = a.id_bicicleta
    INNER JOIN estaciones eo ON eo.id_estacion = a.estacion_orig
    LEFT  JOIN estaciones ed ON ed.id_estacion = a.estacion_dest
    WHERE (p_id_usuario IS NULL OR a.id_usuario = p_id_usuario)
      AND (p_estado IS NULL OR p_estado = '' OR a.estado = p_estado)
    ORDER BY a.fecha_inicio DESC;
END$$

-- 2. OBTENER un alquiler individual
CREATE PROCEDURE sp_obtener_alquiler(
    IN p_id_alquiler BIGINT UNSIGNED
)
BEGIN
    SELECT
        a.*,
        u.nombre AS cliente,
        b.codigo_qr,
        b.modelo,
        eo.nombre AS estacion_origen,
        ed.nombre AS estacion_destino
    FROM alquileres a
    INNER JOIN usuarios u    ON u.id_usuario = a.id_usuario
    INNER JOIN bicicletas b  ON b.id_bicicleta = a.id_bicicleta
    INNER JOIN estaciones eo ON eo.id_estacion = a.estacion_orig
    LEFT  JOIN estaciones ed ON ed.id_estacion = a.estacion_dest
    WHERE a.id_alquiler = p_id_alquiler;
END$$

-- 3. ACTUALIZAR alquiler (solo mientras esté RESERVADO / PENDIENTE_PAGO)
CREATE PROCEDURE sp_actualizar_alquiler(
    IN p_id_alquiler BIGINT UNSIGNED,
    IN p_costo_base DECIMAL(12,2),
    IN p_estacion_orig INT UNSIGNED,
    IN p_estado VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
        UPDATE alquileres
        SET costo_base = p_costo_base,
            estacion_orig = p_estacion_orig,
            estado = p_estado
        WHERE id_alquiler = p_id_alquiler
          AND estado IN ('RESERVADO', 'PENDIENTE_PAGO');

        IF ROW_COUNT() = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo es posible editar alquileres en estado RESERVADO o PENDIENTE_PAGO';
        END IF;
    COMMIT;
END$$

-- 4. ANULAR alquiler
CREATE PROCEDURE sp_anular_alquiler(
    IN p_id_alquiler BIGINT UNSIGNED
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
        UPDATE alquileres
        SET estado = 'CANCELADO',
            fecha_fin = COALESCE(fecha_fin, NOW())
        WHERE id_alquiler = p_id_alquiler
          AND estado IN ('RESERVADO', 'ACTIVO', 'PENDIENTE_PAGO');

        IF ROW_COUNT() = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El alquiler no puede anularse en su estado actual';
        END IF;
    COMMIT;
END$$

-- 5. REPORTE ESTADÍSTICO: cantidad de alquileres
--    p_tipo = 'DIA'    -> alquileres de hoy agrupados por hora
--             'SEMANA' -> alquileres de la semana actual agrupados por día
--             'MES'    -> alquileres del mes actual agrupados por día
CREATE PROCEDURE sp_reporte_cantidad_alquileres(
    IN p_tipo VARCHAR(10)
)
BEGIN
    IF p_tipo = 'DIA' THEN
        WITH RECURSIVE horas AS (
            SELECT 0 AS h
            UNION ALL SELECT h + 1 FROM horas WHERE h < 23
        )
        SELECT
            CONCAT(LPAD(h, 2, '0'), ':00') AS etiqueta,
            (SELECT COUNT(*)
               FROM alquileres
              WHERE DATE(fecha_inicio) = CURDATE()
                AND HOUR(fecha_inicio) = h) AS cantidad
        FROM horas;

    ELSEIF p_tipo = 'SEMANA' THEN
        WITH RECURSIVE dias AS (
            SELECT 0 AS n
            UNION ALL SELECT n + 1 FROM dias WHERE n < 6
        )
        SELECT
            DATE_FORMAT(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL n DAY), '%d/%m') AS etiqueta,
            (SELECT COUNT(*)
               FROM alquileres
              WHERE DATE(fecha_inicio) = DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL n DAY)) AS cantidad
        FROM dias;

    ELSE
        WITH RECURSIVE dias AS (
            SELECT 1 AS d
            UNION ALL SELECT d + 1 FROM dias WHERE d < DAY(LAST_DAY(CURDATE()))
        )
        SELECT
            CONCAT(LPAD(d, 2, '0'), '/', DATE_FORMAT(CURDATE(), '%m')) AS etiqueta,
            (SELECT COUNT(*)
               FROM alquileres
              WHERE YEAR(fecha_inicio) = YEAR(CURDATE())
                AND MONTH(fecha_inicio) = MONTH(CURDATE())
                AND DAY(fecha_inicio) = d) AS cantidad
        FROM dias;
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- 6. EVENTO AUTOMÁTICO (TEMPORIZADOR DIARIO)
-- ============================================================

SET GLOBAL event_scheduler = ON;

DELIMITER $$

CREATE EVENT ev_actualizar_clientes_frecuentes
ON SCHEDULE
    EVERY 1 DAY
    STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
DO
BEGIN
    UPDATE usuarios u
    LEFT JOIN (
        SELECT id_usuario, COUNT(*) AS cantidad
        FROM alquileres
        WHERE estado = 'FINALIZADO' AND fecha_fin >= NOW() - INTERVAL 30 DAY
        GROUP BY id_usuario
    ) a ON u.id_usuario = a.id_usuario
    SET
        u.cantidad_alquileres = COALESCE(a.cantidad, 0),
        u.es_cliente_frecuente = CASE WHEN COALESCE(a.cantidad, 0) >= 5 THEN TRUE ELSE FALSE END,
        u.fecha_ultima_evaluacion = NOW();
END$$

DELIMITER ;


-- ============================================================
-- 7. DATOS DE PRUEBA (ESTACIONES, FLOTA, INVENTARIO, USUARIOS)
-- ============================================================

-- 7.1 Estaciones
INSERT INTO estaciones (codigo, nombre, direccion, coordenadas, capacidad, energia_disp, estado) VALUES
('EST-001', 'Estación Norte',        'Av. Caracas #12-30',  '4.6533,-74.0836', 12, 480.50, 'ACTIVA'),
('EST-002', 'Estación Centro',       'Cra. 7 #23-15',       '4.6110,-74.0708', 15, 620.00, 'ACTIVA'),
('EST-003', 'Estación Sur',          'Av. Boyacá #45-90',   '4.5781,-74.1318', 10, 310.25, 'ACTIVA'),
('EST-004', 'Estación Occidente',    'Calle 80 #68-45',     '4.6842,-74.1105',  8, 150.00, 'MANTENIMIENTO');

-- 7.2 Bicicletas
INSERT INTO bicicletas (estacion_act, codigo_qr, modelo, num_serie, nivel_bateria, estado, kilometraje) VALUES
(1, 'QR-EBK-001', 'EcoRide X1',   'SNX10001', 92.00, 'DISPONIBLE', 145.50),
(1, 'QR-EBK-002', 'EcoRide X1',   'SNX10002', 45.50, 'DISPONIBLE', 302.10),
(1, 'QR-EBK-003', 'VoltMax 3000', 'SNV30001', 15.00, 'CARGANDO',   88.75),
(2, 'QR-EBK-004', 'VoltMax 3000', 'SNV30002', 88.00, 'DISPONIBLE', 512.40),
(2, 'QR-EBK-005', 'EcoRide X1',   'SNX10003', 64.25, 'DISPONIBLE', 220.00),
(2, 'QR-EBK-006', 'Andina Pro',   'SNA20001', 30.00, 'DISPONIBLE', 640.80),
(3, 'QR-EBK-007', 'Andina Pro',   'SNA20002', 97.75, 'DISPONIBLE', 75.30),
(3, 'QR-EBK-008', 'EcoRide X1',   'SNX10004', 55.00, 'MANTENIMIENTO', 430.60);

-- 7.3 Baterías asociadas
INSERT INTO baterias (codigo_bateria, capacidad_wh, nivel_carga, temperatura, estado, fecha_instalacion, vida_util, id_bicicleta) VALUES
('BAT-0001', 504.00, 92.00, 28.50, 'INSTALADA', '2025-01-10', 800, 1),
('BAT-0002', 504.00, 45.50, 30.10, 'INSTALADA', '2025-01-10', 800, 2),
('BAT-0003', 560.00, 15.00, 31.75, 'CARGANDO',  '2025-02-01', 800, 3),
('BAT-0004', 560.00, 88.00, 27.90, 'INSTALADA', '2025-02-01', 800, 4),
('BAT-0005', 504.00, 64.25, 29.35, 'INSTALADA', '2025-03-15', 800, 5),
('BAT-0006', 620.00, 30.00, 33.40, 'INSTALADA', '2025-03-15', 900, 6),
('BAT-0007', 620.00, 97.75, 26.80, 'INSTALADA', '2025-04-20', 900, 7),
('BAT-0008', 504.00, 55.00, 35.10, 'INSTALADA', '2025-04-20', 800, 8);

-- 7.4 Empleados (técnicos: email debe coincidir con el usuario para vincular sesión)
INSERT INTO empleados (nombre, email, telefono, cargo, estado) VALUES
('Carlos Pérez',   'tecnico@ebike.com',  '3001112233', 'Técnico de Mantenimiento', 'ACTIVO'),
('Luisa Gómez',    'tecnico2@ebike.com', '3004445566', 'Técnico de Mantenimiento', 'ACTIVO'),
('Marta Rodríguez','supervisor@ebike.com','3007778899','Supervisor de Flota',      'ACTIVO');

-- 7.5 Inventario de repuestos
INSERT INTO inventario_costos (nombre_rep, cantidad_disponible, precio_actual, costo_repuestos, proveedor, costo_mano_obra, costo_total) VALUES
('Frenos de disco hidráulico', 14, 120000.00, 85000.00, 'BikeParts S.A.S.', 35000.00, 120000.00),
('Cadena para e-bike 9v',      22,  65000.00, 40000.00, 'Rodamientos Andinos', 18000.00,  58000.00),
('Llanta 27.5 antipinchazos',  10,  98000.00, 70000.00, 'BikeParts S.A.S.', 22000.00,  92000.00),
('Batería 48V 12Ah',            4, 850000.00, 700000.00, 'EnergyCell Ltda.', 90000.00, 790000.00),
('Controlador de motor 350W',   6, 320000.00, 250000.00, 'EnergyCell Ltda.', 45000.00, 295000.00),
('Sensor de pedal assist',      9, 150000.00, 110000.00, 'Rodamientos Andinos', 25000.00, 135000.00);

-- 7.6 Usuarios (contraseñas cifradas con password_hash desde PHP)
INSERT INTO usuarios (nombre, email, password_hash, telefono, estado, rol_id) VALUES
('Ana Administradora', 'admin@ebike.com',   '$2y$12$.NQ6TWIJEfoT0X78c32yoee8rvYrf5PpfDYkjquSzwD7L.9Rf8h8C', '3010000001', 'ACTIVO', 1),
('Carlos Pérez',       'tecnico@ebike.com', '$2y$12$jf8noBqt1eeNuCmVOVL2vepOtX/EFgnq.4pVpXztzYpwgLVdj/xn.', '3010000002', 'ACTIVO', 3),
('Juan Cliente',       'cliente@ebike.com', '$2y$12$UylnpAK.MCNe.hq52zNUretnTNa/6K9dgmlhfGF7OiUEQByFv1y3i', '3010000003', 'ACTIVO', 5),
('María Cliente',      'cliente2@ebike.com','$2y$12$UylnpAK.MCNe.hq52zNUretnTNa/6K9dgmlhfGF7OiUEQByFv1y3i', '3010000004', 'ACTIVO', 5),
('Marta Rodríguez',    'supervisor@ebike.com','$2y$12$UylnpAK.MCNe.hq52zNUretnTNa/6K9dgmlhfGF7OiUEQByFv1y3i','3010000005','ACTIVO', 4);

-- 7.7 Medios de pago de los clientes
INSERT INTO metodos_pago (id_usuario, tipo, activo) VALUES
(3, 'NEQUI',           TRUE),
(3, 'TARJETA_CREDITO', TRUE),
(4, 'DAVIPLATA',       TRUE);

-- 7.8 Generador de alquileres históricos (para los gráficos Canvas)
DELIMITER $$

CREATE PROCEDURE sp_seed_alquileres_demo()
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE v_dia INT;
    DECLARE v_bike BIGINT;
    DECLARE v_usuario BIGINT;
    DECLARE v_estacion INT;
    DECLARE v_costo DECIMAL(12,2);

    WHILE i < 45 DO
        SET v_dia      = FLOOR(RAND() * 35);
        -- Solo bicicletas sembradas en estado DISPONIBLE (ids 1,2,4,5,6,7)
        SET v_bike     = CASE (i MOD 6) WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 4 WHEN 3 THEN 5 WHEN 4 THEN 6 ELSE 7 END;
        SET v_usuario  = 3 + (i MOD 2);
        SET v_estacion = 1 + (i MOD 3);
        SET v_costo    = 5000 + (i MOD 5) * 1500;

        INSERT INTO alquileres
            (id_usuario, id_bicicleta, estacion_orig, estacion_dest, fecha_inicio, fecha_fin, costo_base, estado)
        VALUES
            (v_usuario, v_bike, v_estacion, v_estacion,
             NOW() - INTERVAL v_dia DAY,
             NOW() - INTERVAL v_dia DAY + INTERVAL 45 MINUTE,
             v_costo, 'FINALIZADO');

        -- El trigger de inserción marca la bici como ALQUILADA; se devuelve a DISPONIBLE para la siguiente iteración
        UPDATE bicicletas SET estado = 'DISPONIBLE' WHERE id_bicicleta = v_bike;

        SET i = i + 1;
    END WHILE;
END$$

CALL sp_seed_alquileres_demo()$$
DROP PROCEDURE sp_seed_alquileres_demo$$

-- Evaluar clientes frecuentes con los datos generados
CALL sp_evaluar_cliente_frecuente(3)$$
CALL sp_evaluar_cliente_frecuente(4)$$

DELIMITER ;


-- ============================================================
-- 8. MANTENIMIENTOS DEMO (para el panel del taller)
-- ============================================================

INSERT INTO mantenimientos (id_bicicleta, tipo_manten, diagnostico, descripcion, tecnico, estado, fecha_ingreso, fecha_salida, costo) VALUES
(8,'PREVENTIVO','Desgaste leve de pastillas de freno','Cambio de pastillas y ajuste general',1,'FINALIZADO', NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 10 DAY, 120000),
(4,'CORRECTIVO','Falla en controlador de motor','Reemplazo de controlador 350W',1,'FINALIZADO', NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 6 DAY, 295000),
(6,'PREVENTIVO','Revisión de 500 km','Mantenimiento preventivo programado',2,'EN_REVISION', NOW() - INTERVAL 1 DAY, NULL, 0),
(7,'CORRECTIVO','Cadena floja y rayada','Cambio de cadena 9v',2,'PROGRAMADO', NOW() - INTERVAL 3 HOUR, NULL, 0),
(5,'EMERGENCIA','Frenos sin respuesta reportada por usuario',NULL,1,'CANCELADO', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 19 DAY, 0);
