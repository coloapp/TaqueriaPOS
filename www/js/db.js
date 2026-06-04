/**
 * db.js - Gestión de datos con SQLite (Capacitor v6)
 * Refactorizado para máxima robustez, persistencia y escalabilidad.
 */
const db = {
    dbName: 'taqueria_pos_db',
    dbConn: null,
    
    // API Síncrona (Cargada en memoria para velocidad de UI)
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
        ticketWidth: '58mm', // Ancho Caja
        ticketWidth_Cocina: '58mm', // Ancho Cocina
        comisionTarjeta: 0,
        extraTacoPremium: 6,
        extraOrdenPremium: 30,
        imprimirExtras: true,
        bluetoothMAC: '', // Impresora Caja
        bluetoothMAC_Cocina: '', // Impresora Cocina
        usarImpresoraCocina: false,
        pin: '1234',
        pinStaff: '0000',
        deviceId: 'DEVICE-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    },

    async init() {
        console.log("DB: Inicializando persistencia...");
        
        // 1. Cargar configuración básica de localStorage (si existe)
        const savedConfig = localStorage.getItem('tpos_config');
        if (savedConfig) {
            this.config = { ...this.config, ...JSON.parse(savedConfig) };
        }

        // 2. Conectar a SQLite
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { SQLiteConnection, SQLiteDBConnection } = Capacitor.Plugins.CapacitorSQLite;
                const sqlite = new SQLiteConnection(Capacitor.Plugins.CapacitorSQLite);
                this.dbConn = await sqlite.createConnection(this.dbName, false, "no-encryption", 1, false);
                await this.dbConn.open();
                await this.createTables();
                await this.loadFromDb();
            } catch (e) {
                console.error("Error SQLite nativo:", e);
                this.loadMockData(); // Fallback
            }
        } else {
            console.log("DB: Modo Navegador/Simulado");
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
            INSERT INTO categorias (id, nombre) VALUES (1, 'Tacos'), (2, 'Especiales'), (3, 'Ordenes'), (4, 'Bebidas'), (5, 'Postres'), (6, 'Dulces');
            INSERT INTO productos (id, categoria_id, nombre, abreviatura, precio, requiereCarne) VALUES 
            (1, 1, 'Pastor', 'PAS', 19, 0), (2, 1, 'Suadero', 'SUA', 19, 0), (3, 1, 'Bistec', 'BIS', 19, 0), (4, 1, 'Tripa', 'TRI', 25, 0),
            (5, 1, 'Cabeza', 'CAB', 19, 0), (6, 1, 'Chorizo', 'CHO', 19, 0), (18, 1, 'Arrachera', 'ARR', 25, 0), (19, 1, 'Lengua', 'LEN', 25, 0),
            (20, 1, 'Labio', 'LAB', 25, 0), (21, 1, 'Sesos', 'SES', 25, 0),
            (7, 2, 'Quesadilla', 'QUESA', 45, 1), (8, 2, 'Lonche', 'LONCH', 60, 1),
            (9, 2, 'Volcan', 'VOLC', 35, 1), (10, 2, 'Papa Rellena', 'PAPA', 85, 1), 
            (16, 3, 'Orden Chica', 'ORD-CH', 160, 1), (17, 3, 'Orden Grande', 'ORD-GR', 220, 1),
            (11, 4, 'Agua 1L', 'AGUA', 40, 0), (12, 4, 'Coca 0.5L', 'COCA', 25, 0),
            (13, 5, 'Flan', 'FLAN', 35, 0), (14, 6, 'Mazapan', 'MAZA', 10, 0), (15, 6, 'Paleta Payaso', 'PALET', 25, 0);
            INSERT INTO carnes (id, nombre, abreviatura, disponible, premium, exclusivaTaco) VALUES 
            ('pastor', 'Pastor', 'PAS', 1, 0, 0), ('suadero', 'Suadero', 'SUA', 1, 0, 0), 
            ('bistec', 'Bistec', 'BIS', 1, 0, 0), ('tripa', 'Tripa', 'TRI', 1, 1, 0),
            ('cabeza', 'Cabeza', 'CAB', 1, 0, 0), ('chorizo', 'Chorizo', 'CHO', 1, 0, 0), 
            ('arrachera', 'Arrachera', 'ARR', 1, 1, 0), ('lengua', 'Lengua', 'LEN', 1, 1, 1),
            ('labio', 'Labio', 'LAB', 1, 1, 0), ('sesos', 'Sesos', 'SES', 1, 1, 0);
            INSERT INTO mesas (id, numero, x, y, estado) VALUES (1, '1', 50, 100, 'libre'), (2, '2', 150, 100, 'libre'), (3, '3', 250, 100, 'libre');
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
        } catch (e) {
            console.error("Error cargando desde DB:", e);
        }
    },

    loadMockData() {
        this.categorias = ['Tacos', 'Especiales', 'Ordenes', 'Bebidas', 'Postres'];
        this.carnes = [
            {id:'pastor', nombre:'Pastor', abreviatura:'PAS', disponible:true},
            {id:'suadero', nombre:'Suadero', abreviatura:'SUA', disponible:true},
            {id:'bistec', nombre:'Bistec', abreviatura:'BIS', disponible:true},
            {id:'tripa', nombre:'Tripa', abreviatura:'TRI', disponible:true, premium:true},
            {id:'cabeza', nombre:'Cabeza', abreviatura:'CAB', disponible:true},
            {id:'chorizo', nombre:'Chorizo', abreviatura:'CHO', disponible:true},
            {id:'arrachera', nombre:'Arrachera', abreviatura:'ARR', disponible:true, premium:true},
            {id:'lengua', nombre:'Lengua', abreviatura:'LEN', disponible:true, premium:true},
        ];
        this.productos = [
            {id:1, nombre:'Pastor', categoria:'Tacos', precio:19, requiereCarne:false},
            {id:2, nombre:'Suadero', categoria:'Tacos', precio:19, requiereCarne:false},
            {id:3, nombre:'Bistec', categoria:'Tacos', precio:19, requiereCarne:false},
            {id:7, nombre:'Quesadilla', categoria:'Especiales', precio:45, requiereCarne:true},
            {id:8, nombre:'Lonche', categoria:'Especiales', precio:60, requiereCarne:true},
            {id:11, nombre:'Agua 1L', categoria:'Bebidas', precio:40},
            {id:12, nombre:'Coca 0.5L', categoria:'Bebidas', precio:25}
        ];
        this.mesas = [{id:1, numero:'1', x:50, y:50, ancho:70, alto:70, forma:'cuadrada'}];
        this.pedidosActivos = [];
    },

    // --- Persistencia Config ---
    async save() {
        localStorage.setItem('tpos_config', JSON.stringify(this.config));
        console.log("DB: Configuración guardada en LocalStorage");
    },

    // --- Operaciones de Negocio ---
    async guardarPedido(p) {
        const idx = this.pedidosActivos.findIndex(x => x.id === p.id);
        const total = this.calcularTotal(p);
        const pStr = JSON.stringify(p.platos);
        const cStr = JSON.stringify(p.cliente);

        if (this.dbConn) {
            if (idx === -1) {
                await this.dbConn.run("INSERT INTO pedidos (id, tipo, mesaId, mesaNumero, cliente, platos, total, estado, fecha) VALUES (?,?,?,?,?,?,?,?,?)", 
                    [p.id, p.tipo, p.mesaId, p.mesaNumero, cStr, pStr, total, p.estado, new Date().toLocaleDateString()]);
            } else {
                await this.dbConn.run("UPDATE pedidos SET platos=?, cliente=?, total=?, estado=? WHERE id=?", [pStr, cStr, total, p.estado, p.id]);
            }
        }

        if (idx === -1) this.pedidosActivos.push({ ...p, total });
        else this.pedidosActivos[idx] = { ...p, total };
    },

    async cobrarPedido(id, metodo) {
        const p = this.pedidosActivos.find(x => x.id === id);
        if (!p) return;
        
        const totalFinal = this.calcularTotal(p, metodo === 'tarjeta');
        
        if (this.dbConn) {
            await this.dbConn.run("UPDATE pedidos SET estado='pagado', metodo_pago=?, total=? WHERE id=?", [metodo, totalFinal, id]);
        }
        
        if (this.turnoActual) {
            this.turnoActual.ventas += totalFinal;
            if (this.dbConn) await this.dbConn.run("UPDATE turnos SET ventas=? WHERE id=?", [this.turnoActual.ventas, this.turnoActual.id]);
        }

        this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
        
        // Registrar log
        await this.addLog('COBRO', `Pedido: ${id}, Total: ${totalFinal}, Método: ${metodo}`);
        
        // Imprimir Ticket de Cobro Silencioso (si ya se imprimió el de cuenta)
        // printer.printBill(p); // Opcional, ya lo tiene router
    },

    async updatePedidoEstado(id, estado) {
        if (this.dbConn) await this.dbConn.run("UPDATE pedidos SET estado=? WHERE id=?", [estado, id]);
        const p = this.pedidosActivos.find(x => x.id === id);
        if (p) p.estado = estado;
        if (estado === 'cancelado') this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
    },

    calcularTotal(p, conComision = false) {
        let subtotal = 0;
        p.platos.forEach(pl => {
            pl.items.forEach(it => {
                let precioBase = it.precio;
                // Lógica de extras premium
                if (it.isPremiumMeat) {
                    const esTaco = it.nombre.toLowerCase().includes('taco');
                    precioBase += esTaco ? (this.config.extraTacoPremium || 0) : (this.config.extraOrdenPremium || 0);
                }
                if (it.conQueso) precioBase += 10;
                subtotal += precioBase * it.cantidad;
            });
        });
        if (conComision) subtotal *= (1 + (this.config.comisionTarjeta / 100));
        return subtotal;
    },

    // --- Turnos y Caja ---
    async abrirTurno(monto) {
        const t = {
            fecha: new Date().toLocaleDateString(),
            hora_inicio: new Date().toLocaleTimeString(),
            inicioCaja: parseFloat(monto),
            ventas: 0,
            gastos: 0,
            retiros: 0,
            estado: 'abierto'
        };
        if (this.dbConn) {
            const res = await this.dbConn.run("INSERT INTO turnos (fecha, hora_inicio, inicioCaja, ventas, gastos, retiros, estado) VALUES (?,?,?,?,?,?,?)", 
                [t.fecha, t.hora_inicio, t.inicioCaja, 0, 0, 0, 'abierto']);
            t.id = res.changes.lastId;
        }
        this.turnoActual = t;
        this.turnos.unshift(t);
    },

    async cerrarTurno(montoFisico) {
        if (!this.turnoActual) return;
        this.turnoActual.estado = 'cerrado';
        this.turnoActual.hora_fin = new Date().toLocaleTimeString();
        if (this.dbConn) {
            await this.dbConn.run("UPDATE turnos SET estado='cerrado', hora_fin=? WHERE id=?", [this.turnoActual.hora_fin, this.turnoActual.id]);
        }
        
        await this.addLog('CIERRE CAJA', `Turno: ${this.turnoActual.id}, Esperado: $${(this.turnoActual.inicioCaja + this.turnoActual.ventas - this.turnoActual.gastos)}, Físico: $${montoFisico}`);
        this.turnoActual = null;
    },

    // --- Auditoría ---
    async addLog(accion, detalles) {
        const log = {
            usuario: router.currentUser ? router.currentUser.nombre : 'SISTEMA',
            accion, detalles,
            fecha: new Date().toLocaleDateString(),
            hora: new Date().toLocaleTimeString()
        };
        if (this.dbConn) {
            await this.dbConn.run("INSERT INTO logs_auditoria (usuario, accion, detalles, fecha, hora) VALUES (?,?,?,?,?)", 
                [log.usuario, log.accion, log.detalles, log.fecha, log.hora]);
        }
    },

    // --- Helpers ---
    async query(sql, params = []) {
        if (this.dbConn) return await this.dbConn.query(sql, params);
        return { values: [] };
    }
};
