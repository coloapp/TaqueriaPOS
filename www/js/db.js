/**
 * db.js - Gestión de datos con SQLite (Capacitor v6)
 * Restaurado y corregido para activar la aplicación.
 */
const db = {
    dbName: 'taqueria_pos_db',
    dbConn: null,

    categorias: [],
    productos: [],
    carnes: [],
    mesas: [],
    turnos: [],
    pedidosActivos: [],
    gastos: [],
    empleados: [],
    logs: [],

    config: {
        nombreTaqueria: 'Mi Taquería',
        direccion: '',
        telefono: '',
        ticketWidth: '58mm',
        ticketWidth_Cocina: '58mm',
        comisionTarjeta: 0,
        extraTacoPremium: 6,
        extraOrdenPremium: 30,
        imprimirExtras: true,
        bluetoothMAC: '', 
        bluetoothMAC_Cocina: '',
        usarImpresoraCocina: false,
        activado: false,
        pin: '1234',
        pinStaff: '0000',
        deviceId: 'DEVICE-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    },

    async init() {
        console.log("DB: Inicializando...");
        const savedConfig = localStorage.getItem('tpos_config');
        if (savedConfig) {
            this.config = { ...this.config, ...JSON.parse(savedConfig) };
        }

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { SQLiteConnection } = Capacitor.Plugins.CapacitorSQLite;
                const sqlite = new SQLiteConnection(Capacitor.Plugins.CapacitorSQLite);
                this.dbConn = await sqlite.createConnection(this.dbName, false, "no-encryption", 1, false);
                await this.dbConn.open();
                await this.createTables();
                await this.loadFromDb();
            } catch (e) {
                console.error("Error SQLite:", e);
                this.loadMockData();
            }
        } else {
            this.loadMockData();
        }
    },

    async createTables() {
        const schema = `
            CREATE TABLE IF NOT EXISTS categorias (id INTEGER PRIMARY KEY, nombre TEXT UNIQUE);
            CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY, categoria_id INTEGER, nombre TEXT, abreviatura TEXT, precio REAL, requiereCarne INTEGER);
            CREATE TABLE IF NOT EXISTS carnes (id TEXT PRIMARY KEY, nombre TEXT, abreviatura TEXT, disponible INTEGER, premium INTEGER, exclusivaTaco INTEGER);
            CREATE TABLE IF NOT EXISTS mesas (id INTEGER PRIMARY KEY, numero TEXT, x REAL, y REAL, ancho REAL, alto REAL, forma TEXT, estado TEXT);
            CREATE TABLE IF NOT EXISTS empleados (id INTEGER PRIMARY KEY, nombre TEXT, puesto TEXT, pago_dia REAL, pin TEXT);
            CREATE TABLE IF NOT EXISTS turnos (id INTEGER PRIMARY KEY, fecha TEXT, hora_inicio TEXT, hora_fin TEXT, inicioCaja REAL, ventas REAL, gastos REAL, retiros REAL, estado TEXT);
            CREATE TABLE IF NOT EXISTS gastos (id INTEGER PRIMARY KEY, descripcion TEXT, monto REAL, fecha TEXT, hora TEXT, estado TEXT);
            CREATE TABLE IF NOT EXISTS logs_auditoria (id INTEGER PRIMARY KEY, usuario TEXT, accion TEXT, detalles TEXT, fecha TEXT, hora TEXT);
            CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY, tipo TEXT, mesaId INTEGER, mesaNumero TEXT, cliente TEXT, platos TEXT, total REAL, metodo_pago TEXT, estado TEXT, fecha TEXT, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP);
        `;
        await this.dbConn.execute(schema);
        const res = await this.dbConn.query("SELECT count(*) as count FROM productos");
        if (res.values[0].count === 0) await this.seedData();
    },

    async seedData() {
        const seed = `
            INSERT INTO categorias (id, nombre) VALUES (1, 'Tacos'), (2, 'Especiales'), (3, 'Ordenes'), (4, 'Bebidas');
            INSERT INTO productos (id, categoria_id, nombre, abreviatura, precio, requiereCarne) VALUES 
            (1, 1, 'Pastor', 'PAS', 19, 0), (2, 1, 'Suadero', 'SUA', 19, 0), (7, 2, 'Quesadilla', 'QUESA', 45, 1);
            INSERT INTO carnes (id, nombre, abreviatura, disponible, premium) VALUES ('pastor', 'Pastor', 'PAS', 1, 0), ('suadero', 'Suadero', 'SUA', 1, 0);
            INSERT INTO mesas (id, numero, x, y, estado) VALUES (1, '1', 50, 100, 'libre');
        `;
        await this.dbConn.execute(seed);
    },

    async loadFromDb() {
        try {
            const catRes = await this.dbConn.query("SELECT * FROM categorias");
            this.categorias = (catRes.values || []).map(c => c.nombre);
            const prodRes = await this.dbConn.query("SELECT p.*, c.nombre as categoria FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id");
            this.productos = (prodRes.values || []).map(p => ({ ...p, requiereCarne: !!p.requiereCarne }));
            const carRes = await this.dbConn.query("SELECT * FROM carnes");
            this.carnes = (carRes.values || []).map(c => ({ ...c, disponible: !!c.disponible }));
            const mesaRes = await this.dbConn.query("SELECT * FROM mesas");
            this.mesas = mesaRes.values || [];
            const turRes = await this.dbConn.query("SELECT * FROM turnos ORDER BY id DESC");
            this.turnos = turRes.values || [];
            this.turnoActual = this.turnos.find(t => t.estado === 'abierto') || null;
            const gasRes = await this.dbConn.query("SELECT * FROM gastos ORDER BY id DESC");
            this.gastos = gasRes.values || [];
            const empRes = await this.dbConn.query("SELECT * FROM empleados");
            this.empleados = empRes.values || [];
            const pedRes = await this.dbConn.query("SELECT * FROM pedidos WHERE estado != 'pagado' AND estado != 'cancelado'");
            this.pedidosActivos = (pedRes.values || []).map(p => ({ ...p, platos: JSON.parse(p.platos), cliente: JSON.parse(p.cliente) }));
        } catch (e) { console.error("Error Carga:", e); }
    },

    loadMockData() {
        this.categorias = ['Tacos', 'Especiales'];
        this.productos = [{id:1, nombre:'Pastor', categoria:'Tacos', precio:19, requiereCarne:false}];
        this.carnes = [{id:'pastor', nombre:'Pastor', disponible:true}];
        this.mesas = [{id:1, numero:'1', x:50, y:50, ancho:70, alto:70, forma:'cuadrada'}];
        this.pedidosActivos = [];
    },

    async save() {
        localStorage.setItem('tpos_config', JSON.stringify(this.config));
    },

    async verificarActivacion(codigo) {
        // Lógica: código es el deviceId al revés
        const reverseId = this.config.deviceId.split('').reverse().join('');
        if (codigo === reverseId) {
            this.config.activado = true;
            await this.save();
            return true;
        }
        return false;
    },

    async addEmpleado(n, p, pd, pin) {
        if (this.dbConn) {
            const res = await this.dbConn.run("INSERT INTO empleados (nombre, puesto, pago_dia, pin) VALUES (?, ?, ?, ?)", [n, p, pd, pin]);
            const e = { id: res.changes.lastId, nombre: n, puesto: p, pago_dia: pd, pin };
            this.empleados.push(e);
            return e;
        } else {
            const e = { id: Date.now(), nombre: n, puesto: p, pago_dia: pd, pin };
            this.empleados.push(e);
            return e;
        }
    },

    verificarPin(p, nivel = 'admin') {
        if (nivel === 'admin') return p === this.config.pin;
        if (nivel === 'staff') return p === this.config.pinStaff || p === this.config.pin;
        return false;
    },

    async guardarPedido(p) {
        const total = this.calcularTotal(p);
        const pStr = JSON.stringify(p.platos);
        const cStr = JSON.stringify(p.cliente);
        if (this.dbConn) {
            const check = await this.dbConn.query("SELECT id FROM pedidos WHERE id = ?", [p.id]);
            if (check.values.length > 0) {
                await this.dbConn.run("UPDATE pedidos SET platos=?, cliente=?, total=?, estado=? WHERE id=?", [pStr, cStr, total, p.estado, p.id]);
            } else {
                await this.dbConn.run("INSERT INTO pedidos (id, tipo, mesaId, mesaNumero, cliente, platos, total, estado, fecha) VALUES (?,?,?,?,?,?,?,?,?)", [p.id, p.tipo, p.mesaId, p.mesaNumero, cStr, pStr, total, p.estado, new Date().toLocaleDateString()]);
            }
        }
        const idx = this.pedidosActivos.findIndex(x => x.id === p.id);
        if (idx === -1) this.pedidosActivos.push({ ...p, total });
        else this.pedidosActivos[idx] = { ...p, total };
    },

    calcularTotal(p, conComision = false) {
        let subtotal = 0;
        p.platos.forEach(pl => {
            pl.items.forEach(it => {
                let pBase = it.precio;
                if (it.isPremiumMeat) pBase += (it.nombre.toLowerCase().includes('taco') ? this.config.extraTacoPremium : this.config.extraOrdenPremium);
                if (it.conQueso) pBase += 10;
                subtotal += pBase * it.cantidad;
            });
        });
        return conComision ? subtotal * (1 + (this.config.comisionTarjeta / 100)) : subtotal;
    },

    async updatePedidoEstado(id, estado) {
        if (this.dbConn) await this.dbConn.run("UPDATE pedidos SET estado=? WHERE id=?", [estado, id]);
        const p = this.pedidosActivos.find(x => x.id === id);
        if (p) p.estado = estado;
        if (estado === 'cancelado') this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
    },

    async addLog(accion, detalles) {
        if (this.dbConn) {
            const f = new Date().toLocaleDateString();
            const h = new Date().toLocaleTimeString();
            const u = 'SISTEMA';
            await this.dbConn.run("INSERT INTO logs_auditoria (usuario, accion, detalles, fecha, hora) VALUES (?,?,?,?,?)", [u, accion, detalles, f, h]);
        }
    },

    async cobrarPedido(id, metodo) {
        const p = this.pedidosActivos.find(x => x.id === id);
        if (!p) return;
        const total = this.calcularTotal(p, metodo === 'tarjeta');
        p.estado = 'pagado';
        p.metodo_pago = metodo;
        if (this.dbConn) {
            await this.dbConn.run("UPDATE pedidos SET estado='pagado', metodo_pago=? WHERE id=?", [metodo, id]);
            if (this.turnoActual) {
                await this.dbConn.run("UPDATE turnos SET ventas = ventas + ? WHERE id=?", [total, this.turnoActual.id]);
                this.turnoActual.ventas += total;
            }
        }
        this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
        app.showNotification("💰 VENTA REGISTRADA");
    },

    async abrirTurno(monto) {
        const f = new Date().toLocaleDateString();
        const h = new Date().toLocaleTimeString();
        if (this.dbConn) {
            const res = await this.dbConn.run("INSERT INTO turnos (fecha, hora_inicio, inicioCaja, ventas, gastos, retiros, estado) VALUES (?,?,?,?,?,?,?)", [f, h, monto, 0, 0, 0, 'abierto']);
            this.turnoActual = { id: res.changes.lastId, fecha: f, hora_inicio: h, inicioCaja: monto, ventas: 0, gastos: 0, retiros: 0, estado: 'abierto' };
        } else {
            this.turnoActual = { id: Date.now(), fecha: f, hora_inicio: h, inicioCaja: monto, ventas: 0, gastos: 0, retiros: 0, estado: 'abierto' };
        }
    },

    async cerrarTurno() {
        if (!this.turnoActual) return;
        const h = new Date().toLocaleTimeString();
        if (this.dbConn) {
            await this.dbConn.run("UPDATE turnos SET estado='cerrado', hora_fin=? WHERE id=?", [h, this.turnoActual.id]);
        }
        this.turnoActual = null;
    },

    async registrarRetiro(monto, desc) {
        if (this.dbConn && this.turnoActual) {
            await this.dbConn.run("UPDATE turnos SET retiros = retiros + ? WHERE id=?", [monto, this.turnoActual.id]);
            this.turnoActual.retiros += monto;
            await this.addLog('RETIRO', `Monto: ${monto}, Motivo: ${desc}`);
        }
    },

    async repairConnection() {
        console.log("DB: Intentando reparación de conexión...");
        try {
            if (this.dbConn) {
                try {
                    await this.dbConn.close();
                } catch (e) {
                    console.log("Error cerrando conexión previa (esperado):", e);
                }
                this.dbConn = null;
            }
            
            // Re-inicializar
            await this.init();
            
            // Verificar integridad básica
            if (this.dbConn) {
                await this.dbConn.execute("PRAGMA integrity_check;");
                await this.addLog('SISTEMA', 'Conexión a BD reparada manualmente');
                return true;
            }
            return false;
        } catch (e) {
            console.error("Error en reparación de BD:", e);
            throw e;
        }
    }
};
