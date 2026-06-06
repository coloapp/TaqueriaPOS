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
        nombreTaqueria: 'EL PASTORCITO',
        direccion: 'Calle Principal #123',
        telefono: '555-0123',
        ticketWidth: '58mm',
        ticketWidth_Cocina: '58mm',
        comisionTarjeta: 0,
        extraTacoPremium: 7, // 18 + 7 = 25
        extraEspecialidadPremium: 10,
        extraCarneEspecialidad: 10, // Sencilla 25 -> Con carne 35
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
                if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
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
            CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY, categoria_id INTEGER, nombre TEXT, abreviatura TEXT, precio REAL, requiereCarne INTEGER, precioSencillo REAL, variantes TEXT, agotado INTEGER DEFAULT 0, stock INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS carnes (id TEXT PRIMARY KEY, nombre TEXT, abreviatura TEXT, disponible INTEGER, premium INTEGER, exclusivaTaco INTEGER);
            CREATE TABLE IF NOT EXISTS mesas (id INTEGER PRIMARY KEY, numero TEXT, x REAL, y REAL, ancho REAL, alto REAL, forma TEXT, estado TEXT);
            CREATE TABLE IF NOT EXISTS empleados (id INTEGER PRIMARY KEY, nombre TEXT, puesto TEXT, pago_dia REAL, pin TEXT);
            CREATE TABLE IF NOT EXISTS turnos (id INTEGER PRIMARY KEY, fecha TEXT, hora_inicio TEXT, hora_fin TEXT, inicioCaja REAL, ventas REAL, gastos REAL, retiros REAL, estado TEXT);
            CREATE TABLE IF NOT EXISTS gastos (id INTEGER PRIMARY KEY, descripcion TEXT, monto REAL, fecha TEXT, hora TEXT, estado TEXT);
            CREATE TABLE IF NOT EXISTS logs_auditoria (id INTEGER PRIMARY KEY, usuario TEXT, accion TEXT, detalles TEXT, fecha TEXT, hora TEXT);
            CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY, tipo TEXT, mesaId INTEGER, mesaNumero TEXT, cliente TEXT, platos TEXT, total REAL, metodo_pago TEXT, estado TEXT, fecha TEXT, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, descuento REAL DEFAULT 0, fiar_a TEXT);
        `;
        await this.dbConn.execute(schema);
        
        // Verificación inteligente: Si no existe la categoría 'Ordenes', forzar seed parcial
        const checkCat = await this.dbConn.query("SELECT count(*) as count FROM categorias WHERE nombre = 'Ordenes'");
        if (checkCat.values[0].count === 0) {
            console.log("DB: Detectada falta de categorías base, ejecutando seed...");
            await this.seedData();
        }
        
        if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
    },

    async seedData() {
        const seed = `
            INSERT OR IGNORE INTO categorias (id, nombre) VALUES (1, 'Tacos'), (2, 'Especialidades'), (3, 'Ordenes'), (4, 'Bebidas'), (5, 'Postres');
            
            INSERT OR IGNORE INTO carnes (id, nombre, abreviatura, disponible, premium) VALUES 
            ('pastor', 'Pastor', 'PAS', 1, 0), ('suadero', 'Suadero', 'SUA', 1, 0), 
            ('chorizo', 'Chorizo', 'CHO', 1, 0), ('bistec', 'Bistec', 'BIS', 1, 0),
            ('cabeza', 'Cabeza', 'CAB', 1, 0), ('carnaza', 'Carnaza', 'CAR', 1, 0),
            ('ojo', 'Ojo', 'OJO', 1, 0), ('arrachera', 'Arrachera', 'ARR', 1, 1), 
            ('tripa', 'Tripa', 'TRI', 1, 1), ('lengua', 'Lengua', 'LEN', 1, 1), 
            ('labio', 'Labio', 'LAB', 1, 1);

            INSERT OR IGNORE INTO productos (id, categoria_id, nombre, abreviatura, precio, requiereCarne, precioSencillo) VALUES 
            (1, 1, 'Taco Pastor', 'T_PAS', 18, 0, 0),
            (2, 1, 'Taco Suadero', 'T_SUA', 18, 0, 0),
            (3, 1, 'Taco Chorizo', 'T_CHO', 18, 0, 0),
            (4, 1, 'Taco Bistec', 'T_BIS', 18, 0, 0),
            (5, 1, 'Taco Cabeza', 'T_CAB', 18, 0, 0),
            (6, 1, 'Taco Carnaza', 'T_CAR', 18, 0, 0),
            (7, 1, 'Taco Ojo', 'T_OJO', 18, 0, 0),
            (8, 1, 'Taco Arrachera', 'T_ARR', 25, 0, 0),
            (9, 1, 'Taco Tripa', 'T_TRI', 25, 0, 0),
            (10, 1, 'Taco Lengua', 'T_LEN', 25, 0, 0),
            (11, 1, 'Taco Labio', 'T_LAB', 25, 0, 0),
            (20, 2, 'Quesadilla', 'QUESA', 35, 1, 25),
            (21, 2, 'Gringa', 'GRI', 45, 1, 35),
            (22, 2, 'Lonche', 'LON', 45, 1, 35),
            (23, 2, 'Volcan', 'VOL', 35, 1, 25),
            (30, 3, 'Orden Chica', 'O_CHI', 160, 1, 0),
            (31, 3, 'Orden Grande', 'O_GRA', 220, 1, 0),
            (40, 4, 'Refresco 500ml', 'REF', 25, 0, 0),
            (41, 4, 'Agua 1L', 'AGU', 35, 0, 0);

            INSERT OR IGNORE INTO mesas (id, numero, x, y, estado, ancho, alto, forma) VALUES 
            (1, '1', 50, 50, 'libre', 70, 70, 'cuadrada'),
            (2, '2', 150, 50, 'libre', 70, 70, 'cuadrada');
        `;
        await this.dbConn.execute(seed);
        if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
    },

    async loadFromDb() {
        try {
            const catRes = await this.dbConn.query("SELECT * FROM categorias");
            this.categorias = (catRes.values || []).map(c => c.nombre);
            const prodRes = await this.dbConn.query("SELECT p.*, c.nombre as categoria FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id");
            this.productos = (prodRes.values || []).map(p => ({ 
                ...p, 
                requiereCarne: !!p.requiereCarne,
                agotado: !!p.agotado,
                stock: p.stock || 0,
                abreviatura: p.abreviatura || p.nombre.substring(0,5).toUpperCase(),
                variantes: (() => {
                    try { return p.variantes ? JSON.parse(p.variantes) : {}; }
                    catch(e) { return {}; }
                })()
            }));
            const carRes = await this.dbConn.query("SELECT * FROM carnes");
            this.carnes = (carRes.values || []).map(c => ({ ...c, disponible: !!c.disponible, premium: !!c.premium }));
            const mesaRes = await this.dbConn.query("SELECT * FROM mesas");
            this.mesas = mesaRes.values || [];
            const turRes = await this.dbConn.query("SELECT * FROM turnos ORDER BY id DESC");
            this.turnos = turRes.values || [];
            this.turnoActual = this.turnos.find(t => t.estado === 'abierto') || null;
            const gasRes = await this.dbConn.query("SELECT * FROM gastos ORDER BY id DESC");
            this.gastos = gasRes.values || [];
            const empRes = await this.dbConn.query("SELECT * FROM empleados");
            this.empleados = empRes.values || [];
            const pedRes = await this.dbConn.query("SELECT * FROM pedidos WHERE estado != 'pagado' AND estado != 'cancelado' AND estado != 'deuda'");
            this.pedidosActivos = (pedRes.values || []).map(p => ({ 
                ...p, 
                platos: JSON.parse(p.platos), 
                cliente: JSON.parse(p.cliente),
                descuento: p.descuento || 0,
                fiar_a: p.fiar_a || null
            }));
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        } catch (e) { console.error("Error Carga:", e); }
    },

    getToday() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    loadMockData() {
        this.categorias = ['Tacos', 'Especialidades', 'Ordenes', 'Bebidas', 'Postres'];
        this.carnes = [
            {id:'pastor', nombre:'Pastor', abreviatura:'PAS', disponible:true, premium:false},
            {id:'suadero', nombre:'Suadero', abreviatura:'SUA', disponible:true, premium:false},
            {id:'chorizo', nombre:'Chorizo', abreviatura:'CHO', disponible:true, premium:false},
            {id:'bistec', nombre:'Bistec', abreviatura:'BIS', disponible:true, premium:false},
            {id:'cabeza', nombre:'Cabeza', abreviatura:'CAB', disponible:true, premium:false},
            {id:'carnaza', nombre:'Carnaza', abreviatura:'CAR', disponible:true, premium:false},
            {id:'ojo', nombre:'Ojo', abreviatura:'OJO', disponible:true, premium:false},
            {id:'arrachera', nombre:'Arrachera', abreviatura:'ARR', disponible:true, premium:true},
            {id:'tripa', nombre:'Tripa', abreviatura:'TRI', disponible:true, premium:true},
            {id:'lengua', nombre:'Lengua', abreviatura:'LEN', disponible:true, premium:true},
            {id:'labio', nombre:'Labio', abreviatura:'LAB', disponible:true, premium:true}
        ];
        this.productos = [
            {id:1, nombre:'Taco Pastor', categoria:'Tacos', abreviatura:'T_PAS', precio:18, requiereCarne:false, agotado:false, stock:0},
            {id:2, nombre:'Taco Suadero', categoria:'Tacos', abreviatura:'T_SUA', precio:18, requiereCarne:false, agotado:false, stock:0},
            {id:3, nombre:'Taco Chorizo', categoria:'Tacos', abreviatura:'T_CHO', precio:18, requiereCarne:false, agotado:false, stock:0},
            {id:4, nombre:'Taco Bistec', categoria:'Tacos', abreviatura:'T_BIS', precio:18, requiereCarne:false, agotado:false, stock:0},
            {id:5, nombre:'Taco Cabeza', categoria:'Tacos', abreviatura:'T_CAB', precio:18, requiereCarne:false, agotado:false, stock:0},
            {id:8, nombre:'Taco Arrachera', categoria:'Tacos', abreviatura:'T_ARR', precio:25, requiereCarne:false, agotado:false, stock:0},
            {id:20, nombre:'Quesadilla', categoria:'Especialidades', abreviatura:'QUESA', precio:35, requiereCarne:true, precioSencillo:25, agotado:false, stock:0, variantes:{}},
            {id:30, nombre:'Orden Chica', categoria:'Ordenes', abreviatura:'O_CHI', precio:160, requiereCarne:true, agotado:false, stock:0}
        ];
        this.mesas = [{id:1, numero:'1', x:50, y:50, ancho:70, alto:70, forma:'cuadrada'}];
        this.pedidosActivos = [];
    },

    async save() {
        localStorage.setItem('tpos_config', JSON.stringify(this.config));
        if (this.dbConn && typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
    },

    async hardReset() {
        if (!this.dbConn) {
            localStorage.clear();
            location.reload();
            return;
        }
        try {
            await this.dbConn.execute("DROP TABLE IF EXISTS categorias; DROP TABLE IF EXISTS productos; DROP TABLE IF EXISTS carnes; DROP TABLE IF EXISTS mesas; DROP TABLE IF EXISTS empleados; DROP TABLE IF EXISTS turnos; DROP TABLE IF EXISTS gastos; DROP TABLE IF EXISTS logs_auditoria; DROP TABLE IF EXISTS pedidos;");
            localStorage.clear();
            location.reload();
        } catch(e) { console.error(e); }
    },

    async verificarActivacion(codigo) {
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
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            return e;
        } else {
            const e = { id: Date.now(), nombre: n, puesto: p, pago_dia: pd, pin };
            this.empleados.push(e);
            return e;
        }
    },

    async updateEmpleado(id, n, p, pd, pin) {
        if (this.dbConn) {
            await this.dbConn.run("UPDATE empleados SET nombre=?, puesto=?, pago_dia=?, pin=? WHERE id=?", [n, p, pd, pin, id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        const idx = this.empleados.findIndex(e => e.id === id);
        if (idx !== -1) this.empleados[idx] = { id, nombre: n, puesto: p, pago_dia: pd, pin };
    },

    async deleteEmpleado(id) {
        if (this.dbConn) {
            await this.dbConn.run("DELETE FROM empleados WHERE id=?", [id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.empleados = this.empleados.filter(e => e.id !== id);
    },

    async addCategoria(n) {
        if (this.dbConn) {
            await this.dbConn.run("INSERT INTO categorias (nombre) VALUES (?)", [n]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        if (!this.categorias.includes(n)) this.categorias.push(n);
    },

    async updateCategoria(oldN, newN) {
        if (this.dbConn) {
            await this.dbConn.run("UPDATE categorias SET nombre=? WHERE nombre=?", [newN, oldN]);
            const catRes = await this.dbConn.query("SELECT id FROM categorias WHERE nombre=?", [newN]);
            const catId = catRes.values[0]?.id;
            await this.dbConn.run("UPDATE productos SET categoria_id=? WHERE categoria_id=(SELECT id FROM categorias WHERE nombre=?)", [catId, oldN]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        const idx = this.categorias.indexOf(oldN);
        if (idx !== -1) this.categorias[idx] = newN;
        this.productos.forEach(p => { if (p.categoria === oldN) p.categoria = newN; });
    },

    async deleteCategoria(n) {
        if (this.dbConn) {
            await this.dbConn.run("DELETE FROM categorias WHERE nombre=?", [n]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.categorias = this.categorias.filter(c => c !== n);
    },

    async addProducto(p) {
        if (this.dbConn) {
            const catRes = await this.dbConn.query("SELECT id FROM categorias WHERE nombre=?", [p.categoria]);
            const catId = catRes.values[0]?.id;
            const variantesStr = JSON.stringify(p.variantes || {});
            const res = await this.dbConn.run("INSERT INTO productos (categoria_id, nombre, abreviatura, precio, requiereCarne, precioSencillo, variantes, agotado, stock) VALUES (?,?,?,?,?,?,?,?,?)", [catId, p.nombre, p.abreviatura || p.nombre.substring(0,5).toUpperCase(), p.precio, p.requiereCarne ? 1 : 0, p.precioSencillo || 0, variantesStr, p.agotado ? 1 : 0, p.stock || 0]);
            p.id = res.changes.lastId;
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        } else {
            p.id = Date.now();
        }
        const newP = { ...p, requiereCarne: !!p.requiereCarne, agotado: !!p.agotado, stock: p.stock || 0, variantes: p.variantes || {} };
        this.productos.push(newP);
        return newP;
    },

    async updateProducto(p) {
        if (this.dbConn) {
            const catRes = await this.dbConn.query("SELECT id FROM categorias WHERE nombre=?", [p.categoria]);
            const catId = catRes.values[0]?.id;
            const variantesStr = JSON.stringify(p.variantes || {});
            await this.dbConn.run("UPDATE productos SET categoria_id=?, nombre=?, precio=?, requiereCarne=?, precioSencillo=?, variantes=?, agotado=?, stock=? WHERE id=?", [catId, p.nombre, p.precio, p.requiereCarne ? 1 : 0, p.precioSencillo || 0, variantesStr, p.agotado ? 1 : 0, p.stock || 0, p.id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        const idx = this.productos.findIndex(x => x.id === p.id);
        if (idx !== -1) this.productos[idx] = { ...p, requiereCarne: !!p.requiereCarne, agotado: !!p.agotado, stock: p.stock || 0, variantes: p.variantes || {} };
    },

    async toggleAgotado(id) {
        const p = this.productos.find(x => x.id === id);
        if (p) {
            p.agotado = !p.agotado;
            if (this.dbConn) {
                await this.dbConn.run("UPDATE productos SET agotado=? WHERE id=?", [p.agotado ? 1 : 0, id]);
                if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            }
        }
    },

    async deleteProducto(id) {
        if (this.dbConn) {
            await this.dbConn.run("DELETE FROM productos WHERE id=?", [id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.productos = this.productos.filter(p => p.id !== id);
    },

    async addCarne(c) {
        if (this.dbConn) {
            await this.dbConn.run("INSERT INTO carnes (id, nombre, abreviatura, disponible, premium) VALUES (?,?,?,?,?)", [c.id, c.nombre, c.id.substring(0,3).toUpperCase(), 1, c.premium ? 1 : 0]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.carnes.push({ id: c.id, nombre: c.nombre, disponible: true, premium: !!c.premium });
        
        // Auto-crear Taco de esta carne en categoría Tacos
        const precio = c.premium ? 25 : 18;
        const abrev = 'T_' + c.id.substring(0,3).toUpperCase();
        await this.addProducto({
            nombre: `Taco de ${c.nombre}`,
            precio: precio,
            categoria: 'Tacos',
            requiereCarne: false, // Tacos de carne fija no requieren selector
            abreviatura: abrev,
            variantes: {}
        });
    },

    async updateCarne(c) {
        if (this.dbConn) {
            await this.dbConn.run("UPDATE carnes SET nombre=?, premium=? WHERE id=?", [c.nombre, c.premium ? 1 : 0, c.id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        const idx = this.carnes.findIndex(x => x.id === c.id);
        if (idx !== -1) this.carnes[idx] = { ...this.carnes[idx], ...c };
    },

    async deleteCarne(id) {
        if (this.dbConn) {
            await this.dbConn.run("DELETE FROM carnes WHERE id=?", [id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.carnes = this.carnes.filter(c => c.id !== id);
    },

    async toggleCarne(id) {
        const c = this.carnes.find(x => x.id === id);
        if (c) {
            c.disponible = !c.disponible;
            if (this.dbConn) {
                await this.dbConn.run("UPDATE carnes SET disponible=? WHERE id=?", [c.disponible ? 1 : 0, id]);
                if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            }
        }
    },

    async addGasto(g) {
        const hoy = this.getToday();
        const h = new Date().toLocaleTimeString();
        if (this.dbConn) {
            const res = await this.dbConn.run("INSERT INTO gastos (descripcion, monto, fecha, hora, estado) VALUES (?,?,?,?,?)", [g.descripcion, g.monto, hoy, h, g.estado]);
            g.id = res.changes.lastId;
            if (g.estado === 'pagado' && this.turnoActual) {
                await this.dbConn.run("UPDATE turnos SET gastos = gastos + ? WHERE id=?", [g.monto, this.turnoActual.id]);
                const tRes = await this.dbConn.query("SELECT * FROM turnos WHERE id = ?", [this.turnoActual.id]);
                if (tRes.values && tRes.values.length > 0) this.turnoActual = tRes.values[0];
            }
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        } else {
            g.id = Date.now();
        }
        g.fecha = hoy; g.hora = h;
        this.gastos.push(g);
        return g;
    },

    async pagarGastoPendiente(id) {
        const g = this.gastos.find(x => x.id === id);
        if (g && g.estado === 'pendiente') {
            g.estado = 'pagado';
            if (this.dbConn) {
                await this.dbConn.run("UPDATE gastos SET estado='pagado' WHERE id=?", [id]);
                if (this.turnoActual) {
                    await this.dbConn.run("UPDATE turnos SET gastos = gastos + ? WHERE id=?", [g.monto, this.turnoActual.id]);
                    const tRes = await this.dbConn.query("SELECT * FROM turnos WHERE id = ?", [this.turnoActual.id]);
                    if (tRes.values && tRes.values.length > 0) this.turnoActual = tRes.values[0];
                }
                if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            }
        }
    },

    async addMesa(m) {
        const id = Date.now();
        const newMesa = { id, numero: (this.mesas.length + 1).toString(), x: 50, y: 50, ancho: 70, alto: 70, forma: m.forma, estado: 'libre' };
        if (this.dbConn) {
            await this.dbConn.run("INSERT INTO mesas (id, numero, x, y, ancho, alto, forma, estado) VALUES (?,?,?,?,?,?,?,?)", [newMesa.id, newMesa.numero, newMesa.x, newMesa.y, newMesa.ancho, newMesa.alto, newMesa.forma, newMesa.estado]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.mesas.push(newMesa);
        return newMesa;
    },

    async updateMesa(id, data) {
        const m = this.mesas.find(x => x.id === id);
        if (m) {
            Object.assign(m, data);
            if (this.dbConn) {
                const sets = Object.keys(data).map(k => `${k}=?`).join(', ');
                const vals = [...Object.values(data), id];
                await this.dbConn.run(`UPDATE mesas SET ${sets} WHERE id=?`, vals);
                if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            }
        }
    },

    async eliminarMesa(id) {
        if (this.dbConn) {
            await this.dbConn.run("DELETE FROM mesas WHERE id=?", [id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.mesas = this.mesas.filter(m => m.id !== id);
    },

    async getReporteGeneral(periodo = 'hoy') {
        if (!this.dbConn) return { ventas: 0, totalGastos: 0, totalDescuentos: 0, deudas: [], lista: [] };
        
        let query = "SELECT * FROM pedidos WHERE (estado='pagado' OR estado='deuda')";
        const hoy = this.getToday();
        
        const res = await this.dbConn.query(query + " ORDER BY id DESC");
        let lista = (res.values || []).map(p => ({ 
            ...p, 
            platos: JSON.parse(p.platos),
            cliente: JSON.parse(p.cliente || '{}')
        }));
        
        if (periodo === 'hoy') {
            lista = lista.filter(p => p.fecha === hoy);
        }
        
        const ventas = lista.reduce((a, b) => a + b.total, 0);
        const totalDescuentos = lista.reduce((a, b) => a + (b.descuento || 0), 0);
        const deudas = lista.filter(p => p.estado === 'deuda');
        
        let gQuery = "SELECT * FROM gastos WHERE estado='pagado'";
        const gRes = await this.dbConn.query(gQuery);
        let gastosLista = gRes.values || [];
        if (periodo === 'hoy') {
            gastosLista = gastosLista.filter(g => g.fecha === hoy);
        }
        const totalGastos = gastosLista.reduce((a, b) => a + b.monto, 0);
        
        return { ventas, totalGastos, totalDescuentos, deudas, lista };
    },

    async getMetricasCarnes() {
        if (!this.dbConn) return [];
        const hoy = this.getToday();
        const res = await this.dbConn.query("SELECT platos, total FROM pedidos WHERE (estado='pagado' OR estado='deuda') AND fecha = ?", [hoy]);
        const metrics = {};
        (res.values || []).forEach(p => {
            const platos = JSON.parse(p.platos);
            platos.forEach(pl => {
                pl.items.forEach(it => {
                    if (it.carneId) {
                        const c = this.carnes.find(x => x.id === it.carneId);
                        const cNombre = c ? c.nombre : it.carneId;
                        if (!metrics[cNombre]) metrics[cNombre] = { carne: cNombre, total_vendido: 0, total_dinero: 0 };
                        metrics[cNombre].total_vendido += it.cantidad;
                        metrics[cNombre].total_dinero += (it.precio * it.cantidad);
                    }
                });
            });
        });
        return Object.values(metrics);
    },

    async registrarAsistencia(id, sueldo) {
        await this.addLog('ASISTENCIA', `Empleado ID: ${id}, Pago: ${sueldo}`);
        return true;
    },

    async addAdelanto(id, monto) {
        await this.addLog('ADELANTO', `Empleado ID: ${id}, Monto: ${monto}`);
        return true;
    },

    verificarPin(p, nivel = 'admin') {
        if (nivel === 'admin') return p === this.config.pin;
        if (nivel === 'staff') {
            if (p === this.config.pinStaff || p === this.config.pin) return true;
            return this.empleados.some(e => e.pin === p);
        }
        return false;
    },

    async guardarPedido(p) {
        const total = this.calcularTotal(p);
        const pStr = JSON.stringify(p.platos);
        const cStr = JSON.stringify(p.cliente);
        const hoy = this.getToday();
        if (this.dbConn) {
            const check = await this.dbConn.query("SELECT id FROM pedidos WHERE id = ?", [p.id]);
            if (check.values.length > 0) {
                await this.dbConn.run("UPDATE pedidos SET platos=?, cliente=?, total=?, estado=?, descuento=?, fiar_a=? WHERE id=?", [pStr, cStr, total, p.estado, p.descuento || 0, p.fiar_a || null, p.id]);
            } else {
                await this.dbConn.run("INSERT INTO pedidos (id, tipo, mesaId, mesaNumero, cliente, platos, total, estado, fecha, descuento, fiar_a) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [p.id, p.tipo, p.mesaId, p.mesaNumero, cStr, pStr, total, p.estado, hoy, p.descuento || 0, p.fiar_a || null]);
            }
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            // Automatizar badge
            if (typeof router !== 'undefined' && router.updateMonitorBadge) router.updateMonitorBadge();
        }
        const idx = this.pedidosActivos.findIndex(x => x.id === p.id);
        if (idx === -1) this.pedidosActivos.push({ ...p, total, fecha: hoy });
        else this.pedidosActivos[idx] = { ...p, total, fecha: hoy };
    },

    calcularTotal(p, conComision = false) {
        let subtotal = 0;
        p.platos.forEach(pl => {
            pl.items.forEach(it => {
                let pBase = it.precio;
                const v = it.variantes || {};
                
                if (it.categoria === 'Ordenes') {
                    // Lógica para Ordenes: Base + Extra Premium si lleva alguna carne premium
                    if (it.isPremiumMeat) {
                        const extra = parseFloat(v['extra_premium']) || 30;
                        pBase += extra;
                    }
                } else if (it.categoria === 'Especialidades') {
                    if (it.carneId) {
                        const extra = parseFloat(v[it.carneId]) || 0;
                        pBase += extra;
                    } else if (it.precioSencillo > 0) {
                        pBase = it.precioSencillo;
                    }
                } else if (it.categoria === 'Tacos') {
                    // Tacos ya traen su precio final por producto
                }
                
                if (it.conQueso) {
                    pBase += (parseFloat(v['queso']) || 0);
                }
                
                subtotal += pBase * it.cantidad;
            });
        });

        // Aplicar descuento
        subtotal -= (p.descuento || 0);
        if (subtotal < 0) subtotal = 0;

        if (conComision && this.config.comisionTarjeta > 0) {
            subtotal = subtotal * (1 + (this.config.comisionTarjeta / 100));
        }
        return subtotal;
    },

    async updatePedidoEstado(id, estado) {
        if (this.dbConn) {
            await this.dbConn.run("UPDATE pedidos SET estado=? WHERE id=?", [estado, id]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            // Automatizar badge
            if (typeof router !== 'undefined' && router.updateMonitorBadge) router.updateMonitorBadge();
        }
        const p = this.pedidosActivos.find(x => x.id === id);
        if (p) p.estado = estado;
        if (estado === 'cancelado' || estado === 'pagado' || estado === 'deuda') this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
    },

    async addLog(accion, detalles) {
        if (this.dbConn) {
            const hoy = this.getToday();
            const h = new Date().toLocaleTimeString();
            const u = (typeof router !== 'undefined' && router.currentUser) ? router.currentUser.nombre : 'SISTEMA';
            await this.dbConn.run("INSERT INTO logs_auditoria (usuario, accion, detalles, fecha, hora) VALUES (?,?,?,?,?)", [u, accion, detalles, hoy, h]);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
    },

    async cobrarPedido(id, metodo, fiarA = null) {
        const p = this.pedidosActivos.find(x => x.id === id);
        if (!p) return;
        const total = this.calcularTotal(p, metodo === 'tarjeta');
        p.estado = metodo === 'fiado' ? 'deuda' : 'pagado';
        p.metodo_pago = metodo;
        if (fiarA) p.fiar_a = fiarA;

        if (this.dbConn) {
            await this.dbConn.run("UPDATE pedidos SET estado=?, metodo_pago=?, total=?, fiar_a=? WHERE id=?", [p.estado, metodo, total, p.fiar_a || null, id]);
            
            // Actualizar turno actual si existe
            if (this.turnoActual) {
                await this.dbConn.run("UPDATE turnos SET ventas = ventas + ? WHERE id=?", [total, this.turnoActual.id]);
                // RECARGA CRÍTICA DEL TURNO
                const tRes = await this.dbConn.query("SELECT * FROM turnos WHERE id = ?", [this.turnoActual.id]);
                if (tRes.values && tRes.values.length > 0) this.turnoActual = tRes.values[0];
            }
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
            // Automatizar badge
            if (typeof router !== 'undefined' && router.updateMonitorBadge) router.updateMonitorBadge();
        }
        this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
        app.showNotification(metodo === 'fiado' ? "📝 DEUDA REGISTRADA: $" + total.toFixed(2) : "💰 VENTA REGISTRADA: $" + total.toFixed(2));
    },

    async abrirTurno(monto) {
        const hoy = this.getToday();
        const h = new Date().toLocaleTimeString();
        const m = parseFloat(monto) || 0;
        if (this.dbConn) {
            const res = await this.dbConn.run("INSERT INTO turnos (fecha, hora_inicio, inicioCaja, ventas, gastos, retiros, estado) VALUES (?,?,?,?,?,?,?)", [hoy, h, m, 0, 0, 0, 'abierto']);
            this.turnoActual = { id: res.changes.lastId, fecha: hoy, hora_inicio: h, inicioCaja: m, ventas: 0, gastos: 0, retiros: 0, estado: 'abierto' };
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        } else {
            this.turnoActual = { id: Date.now(), fecha: hoy, hora_inicio: h, inicioCaja: m, ventas: 0, gastos: 0, retiros: 0, estado: 'abierto' };
        }
        await this.addLog('APERTURA', `Fondo Inicial: ${m}`);
    },

    async cerrarTurno(montoReal) {
        if (!this.turnoActual) return;
        const h = new Date().toLocaleTimeString();
        const mR = parseFloat(montoReal) || 0;
        if (this.dbConn) {
            await this.dbConn.run("UPDATE turnos SET estado='cerrado', hora_fin=? WHERE id=?", [h, this.turnoActual.id]);
            await this.addLog('CORTE', `Caja Final: ${mR}, Esperado: ${this.turnoActual.inicioCaja + this.turnoActual.ventas - this.turnoActual.gastos - this.turnoActual.retiros}`);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
        }
        this.turnoActual = null;
    },

    async registrarRetiro(monto, desc) {
        const m = parseFloat(monto) || 0;
        if (this.dbConn && this.turnoActual) {
            await this.dbConn.run("UPDATE turnos SET retiros = retiros + ? WHERE id=?", [m, this.turnoActual.id]);
            // RECARGA CRÍTICA DEL TURNO
            const tRes = await this.dbConn.query("SELECT * FROM turnos WHERE id = ?", [this.turnoActual.id]);
            if (tRes.values && tRes.values.length > 0) this.turnoActual = tRes.values[0];

            await this.addLog('RETIRO', `Monto: ${m}, Motivo: ${desc}`);
            if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
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
            await this.init();
            if (this.dbConn) {
                await this.dbConn.execute("PRAGMA integrity_check;");
                await this.addLog('SISTEMA', 'Conexión a BD reparada manualmente');
                if (typeof this.dbConn.saveToStore === 'function') await this.dbConn.saveToStore();
                return true;
            }
            return false;
        } catch (e) {
            console.error("Error en reparación de BD:", e);
            throw e;
        }
    }
};
