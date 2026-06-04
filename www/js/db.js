/**
 * db.js - Gestión de datos con SQLite (Capacitor v6)
 * Refactorizado para máxima robustez, persistencia y escalabilidad.
 */
const db = {
    dbName: 'taqueria_pos_db',
    dbConn: null,
    
    // API Síncrona (Cargada en memoria)
    categorias: [],
    productos: [],
    carnes: [],
    mesas: [],
    pedidosActivos: [],
    ventasHistoricas: [],
    gastos: [],
    logsAgotados: [],
    turnos: [],
    turnoActual: null,
    empleados: [],
    asistenciasHoy: [],
    adelantosHoy: [],

    config: {
        pin: '1234',
        pinStaff: '0000',
        nombreTaqueria: 'Mi Taquería',
        telefono: '',
        direccion: '',
        impresoraIP: '192.168.1.100',
        ticketWidth: '58mm',
        activado: false,
        deviceId: null,
        comisionTarjeta: 0,
        bancoNombre: '',
        bancoClabe: '',
        bancoBeneficiario: '',
        extraTacoPremium: 6,   // Diferencia entre $19 y $25
        extraOrdenPremium: 30  // Plus para órdenes/especiales
    },

    async init() {
        console.log("Iniciando DB...");
        try {
            if (!window.Capacitor || !window.Capacitor.Plugins.CapacitorSQLite) {
                throw new Error("Plugin SQLite no disponible");
            }
            this.dbConn = window.Capacitor.Plugins.CapacitorSQLite;

            try {
                await this.dbConn.createConnection({ database: this.dbName, version: 1, encrypted: false, mode: 'no-encryption' });
            } catch (e) {}
            
            await this.dbConn.open({ database: this.dbName });
            await this.initSchema();
            await this.loadFromDb();
            await this.ensureDeviceId();
            console.log("DB Lista.");
        } catch (err) {
            console.error("Fallo SQLite:", err);
            const saved = localStorage.getItem('tpos_config_fallback');
            if (saved) this.config = JSON.parse(saved);
            this.loadDefaults();
        }
    },

    async run(sql, params = []) {
        const res = await this.dbConn.run({ database: this.dbName, statement: sql, values: params });
        // En Capacitor v6, el guardado suele ser automático o se maneja por la conexión
        return res;
    },

    async query(sql, params = []) {
        return await this.dbConn.query({ database: this.dbName, statement: sql, values: params });
    },

    async execute(statements) {
        return await this.dbConn.execute({ database: this.dbName, statements: statements });
    },

    async initSchema() {
        const schema = `
            CREATE TABLE IF NOT EXISTS categorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, categoria_id INTEGER, nombre TEXT NOT NULL, abreviatura TEXT, precio REAL NOT NULL, requiereCarne INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS carnes (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, abreviatura TEXT, disponible INTEGER DEFAULT 1, premium INTEGER DEFAULT 0, exclusivaTaco INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS mesas (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT NOT NULL, x INTEGER, y INTEGER, forma TEXT DEFAULT 'cuadrada', ancho INTEGER DEFAULT 70, alto INTEGER DEFAULT 70, estado TEXT DEFAULT 'libre');
            CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, mesa_id INTEGER, tipo TEXT NOT NULL, estado TEXT DEFAULT 'pendiente', cliente_nombre TEXT, cliente_telefono TEXT, total REAL DEFAULT 0, metodo_pago TEXT, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS pedido_detalles (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER, producto_id INTEGER, cantidad INTEGER NOT NULL, precio_unitario REAL NOT NULL, notas TEXT, plato_index INTEGER DEFAULT 0, sin_cebolla INTEGER DEFAULT 0, sin_cilantro INTEGER DEFAULT 0, sin_verdura INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS turnos (id INTEGER PRIMARY KEY AUTOINCREMENT, fechaApertura TEXT, fechaCierre TEXT, inicioCaja REAL, finCaja REAL, ventas REAL DEFAULT 0, gastos REAL DEFAULT 0, retiros REAL DEFAULT 0, esperado REAL, descuadre REAL, estado TEXT);
            CREATE TABLE IF NOT EXISTS gastos (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, descripcion TEXT, categoria TEXT DEFAULT 'Otros', fecha TEXT, hora TEXT, estado TEXT DEFAULT 'pagado'); -- 'pagado' o 'pendiente' (deuda)
            CREATE TABLE IF NOT EXISTS retiros (id INTEGER PRIMARY KEY AUTOINCREMENT, monto REAL, motivo TEXT, fecha TEXT, hora TEXT, turno_id INTEGER);
            CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE IF NOT EXISTS empleados (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, puesto TEXT, pago_dia REAL DEFAULT 0, activo INTEGER DEFAULT 1, pin TEXT);
            CREATE TABLE IF NOT EXISTS asistencia (id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER, fecha TEXT NOT NULL, hora_entrada TEXT, pago_acordado REAL, estado TEXT DEFAULT 'presente');
            CREATE TABLE IF NOT EXISTS adelantos (id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER, monto REAL NOT NULL, fecha TEXT NOT NULL, hora TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS logs_agotados (id INTEGER PRIMARY KEY AUTOINCREMENT, carne TEXT, fecha TEXT, hora TEXT);
        `;
        await this.execute(schema);
        const res = await this.query("SELECT count(*) as count FROM productos");
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
        await this.execute(seed);
    },

    async loadFromDb() {
        try {
            const catRes = await this.query("SELECT * FROM categorias");
            this.categorias = catRes.values.map(c => c.nombre);

            const prodRes = await this.query("SELECT p.*, c.nombre as categoria FROM productos p JOIN categorias c ON p.categoria_id = c.id");
            this.productos = prodRes.values.map(p => ({ ...p, requiereCarne: !!p.requiereCarne }));

            const carRes = await this.query("SELECT * FROM carnes");
            this.carnes = carRes.values.map(c => ({ ...c, disponible: !!c.disponible }));

            const mesaRes = await this.query("SELECT * FROM mesas");
            this.mesas = mesaRes.values;

            const turRes = await this.query("SELECT * FROM turnos ORDER BY id DESC");
            this.turnos = turRes.values;
            this.turnoActual = this.turnos.find(t => t.estado === 'abierto') || null;

            const gasRes = await this.query("SELECT * FROM gastos ORDER BY id DESC");
            this.gastos = gasRes.values;

            const empRes = await this.query("SELECT * FROM empleados");
            this.empleados = empRes.values;

            const confRes = await this.query("SELECT * FROM config");
            confRes.values.forEach(row => { try { this.config[row.key] = JSON.parse(row.value); } catch (e) { this.config[row.key] = row.value; } });

            this.pedidosActivos = await this.getPedidosPorEstado('pendiente');
        } catch (e) { console.error("Error Carga:", e); }
    },

    async getPedidosPorEstado(estado) {
        let sql = "SELECT p.*, m.numero as mesaNumero FROM pedidos p LEFT JOIN mesas m ON p.mesa_id = m.id WHERE p.estado " + (estado === 'pagado' ? "= 'pagado'" : "!= 'pagado'");
        const res = await this.query(sql);
        const pedidos = [];
        for (let pRow of res.values) {
            const pedido = {
                id: pRow.id, mesaId: pRow.mesa_id, mesaNumero: pRow.mesaNumero, tipo: pRow.tipo, estado: pRow.estado,
                cliente: { nombre: pRow.cliente_nombre, tel: pRow.cliente_telefono }, total: pRow.total, metodo_pago: pRow.metodo_pago,
                fecha: new Date(pRow.fecha_creacion).toLocaleString(), platos: []
            };
            const dRes = await this.query("SELECT pd.*, p.nombre, p.precio FROM pedido_detalles pd JOIN productos p ON pd.producto_id = p.id WHERE pd.pedido_id = ?", [pRow.id]);
            const platosMap = {};
            dRes.values.forEach(d => {
                if (!platosMap[d.plato_index]) platosMap[d.plato_index] = { items: [], sinCebolla: !!d.sin_cebolla, sinCilantro: !!d.sin_cilantro, notas: d.notas || '' };
                platosMap[d.plato_index].items.push({ id: d.producto_id, nombre: d.nombre, precio: d.precio_unitario, cantidad: d.cantidad });
            });
            pedido.platos = Object.values(platosMap);
            pedidos.push(pedido);
        }
        return pedidos;
    },

    async save() {
        try {
            for (let key in this.config) await this.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", [key, JSON.stringify(this.config[key])]);
            localStorage.setItem('tpos_config_fallback', JSON.stringify(this.config));
        } catch (e) { console.error("Error Save Config:", e); }
    },

    async ensureDeviceId() { if (!this.config.deviceId) { this.config.deviceId = 'TPOS-' + Math.random().toString(36).substr(2, 9).toUpperCase(); await this.save(); } },
    async verificarActivacion(codigo) { if (codigo === this.config.deviceId.split('').reverse().join('')) { this.config.activado = true; await this.save(); return true; } return false; },

    verificarPin(p, nivel = 'admin') {
        if (nivel === 'admin') return p === this.config.pin;
        if (nivel === 'staff') return p === this.config.pinStaff || p === this.config.pin;
        return false;
    },

    async abrirTurno(m) {
        const turno = { fechaApertura: new Date().toLocaleString(), inicioCaja: parseFloat(m) || 0, ventas: 0, gastos: 0, estado: 'abierto' };
        const res = await this.run("INSERT INTO turnos (fechaApertura, inicioCaja, ventas, gastos, estado) VALUES (?, ?, ?, ?, ?)", [turno.fechaApertura, turno.inicioCaja, 0, 0, 'abierto']);
        turno.id = res.changes.lastId; this.turnoActual = turno; this.turnos.push(turno);
    },

    async cerrarTurno(m) {
        if (!this.turnoActual) return;
        const t = this.turnoActual;
        t.fechaCierre = new Date().toLocaleString(); t.finCaja = parseFloat(m) || 0;
        t.esperado = t.inicioCaja + t.ventas - t.gastos; t.descuadre = t.finCaja - t.esperado; t.estado = 'cerrado';
        await this.run("UPDATE turnos SET fechaCierre=?, finCaja=?, esperado=?, descuadre=?, estado=? WHERE id=?", [t.fechaCierre, t.finCaja, t.esperado, t.descuadre, 'cerrado', t.id]);
        await this.run("UPDATE carnes SET disponible = 1");
        this.carnes.forEach(c => c.disponible = true);
        this.turnoActual = null;
    },

    async updateMesa(id, data) {
        const idx = this.mesas.findIndex(m => m.id === id);
        if (idx !== -1) {
            this.mesas[idx] = { ...this.mesas[idx], ...data };
            const keys = Object.keys(data); const values = Object.values(data);
            const setClause = keys.map(k => `${k} = ?`).join(', '); values.push(id);
            await this.run(`UPDATE mesas SET ${setClause} WHERE id = ?`, values);
        }
    },

    async guardarPedido(pedido) {
        const total = this.calcularTotal(pedido);
        const check = await this.query("SELECT id FROM pedidos WHERE id = ?", [pedido.id]);
        if (check.values && check.values.length > 0) {
            await this.run("UPDATE pedidos SET mesa_id=?, tipo=?, estado=?, cliente_nombre=?, cliente_telefono=?, total=? WHERE id=?", [pedido.mesaId, pedido.tipo, pedido.estado, pedido.cliente?.nombre || '', pedido.cliente?.tel || '', total, pedido.id]);
            await this.run("DELETE FROM pedido_detalles WHERE pedido_id = ?", [pedido.id]);
        } else {
            const res = await this.run("INSERT INTO pedidos (id, mesa_id, tipo, estado, cliente_nombre, cliente_telefono, total) VALUES (?, ?, ?, ?, ?, ?, ?)", [pedido.id || null, pedido.mesaId, pedido.tipo, pedido.estado, pedido.cliente?.nombre || '', pedido.cliente?.tel || '', total]);
            if (!pedido.id) pedido.id = res.changes.lastId;
        }
        for (let i = 0; i < pedido.platos.length; i++) {
            const pl = pedido.platos[i];
            for (const it of pl.items) {
                await this.run("INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario, notas, plato_index, sin_cebolla, sin_cilantro, sin_verdura) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [pedido.id, it.id, it.cantidad, it.precio, it.notas || '', i, pl.sinCebolla ? 1 : 0, pl.sinCilantro ? 1 : 0, pl.sinVerdura ? 1 : 0]);
            }
        }
        const idx = this.pedidosActivos.findIndex(p => p.id === pedido.id);
        if (idx !== -1) this.pedidosActivos[idx] = pedido; else this.pedidosActivos.push(pedido);
        if (pedido.tipo === 'mesa' && pedido.estado === 'pendiente') await this.updateMesa(pedido.mesaId, { estado: 'ocupada' });
    },

    async cobrarPedido(id, metodo) {
        const idx = this.pedidosActivos.findIndex(p => p.id === id);
        if (idx !== -1) {
            const p = this.pedidosActivos.splice(idx, 1)[0];
            const conComision = (metodo === 'tarjeta');
            const totalFinal = this.calcularTotal(p, conComision);
            await this.run("UPDATE pedidos SET estado = 'pagado', total = ?, metodo_pago = ? WHERE id = ?", [totalFinal, metodo, id]);
            if (this.turnoActual) { this.turnoActual.ventas += totalFinal; await this.run("UPDATE turnos SET ventas = ? WHERE id = ?", [this.turnoActual.ventas, this.turnoActual.id]); }
            if (p.tipo === 'mesa') await this.updateMesa(p.mesaId, { estado: 'libre' });
            return true;
        }
        return false;
    },

    async updatePedidoEstado(id, est) {
        const idx = this.pedidosActivos.findIndex(p => p.id === id);
        if (idx !== -1) { this.pedidosActivos[idx].estado = est; await this.run("UPDATE pedidos SET estado = ? WHERE id = ?", [est, id]); return true; }
        return false;
    },

    calcularTotal(p, conCom = false) {
        let total = 0;
        const basicTacoPrice = 19; // Podría ser configurable también, pero usaremos 19 como base
        
        p.platos.forEach(pl => {
            pl.items.forEach(it => {
                let precioBase = it.precio;
                const prod = this.productos.find(x => x.id === it.id);
                
                // Lógica de Precios Dinámicos
                if (prod && prod.categoria === 'Tacos') {
                    // El precio ya viene en el producto (individuales)
                    precioBase = it.precio;
                } else if (prod && prod.requiereCarne) {
                    // Para Especialidades u Órdenes que piden carne
                    if (it.carneId) {
                        // Buscar si esa carne corresponde a un taco "Caro"
                        const tacoEquivalente = this.productos.find(pr => pr.categoria === 'Tacos' && pr.nombre.toLowerCase() === it.carneId.toLowerCase());
                        const isPremiumMeat = tacoEquivalente && tacoEquivalente.precio > basicTacoPrice;
                        
                        if (isPremiumMeat) {
                            precioBase += (this.config.extraOrdenPremium || 30);
                        }
                    }
                }

                if (prod && prod.nombre === 'Lonche' && it.conQueso) {
                    precioBase += 10;
                }
                
                total += (precioBase * it.cantidad);
            });
        });

        if (p.cliente && p.cliente.zona) total += p.cliente.zona;
        if (conCom && this.config.comisionTarjeta > 0) total = total * (1 + (this.config.comisionTarjeta / 100));
        return total;
    },

    async registrarRetiro(monto, motivo) {
        const f = new Date().toLocaleDateString(); const h = new Date().toLocaleTimeString();
        await this.run("INSERT INTO retiros (monto, motivo, fecha, hora, turno_id) VALUES (?, ?, ?, ?, ?)", [monto, motivo, f, h, this.turnoActual?.id || null]);
        if (this.turnoActual) {
            this.turnoActual.retiros = (this.turnoActual.retiros || 0) + monto;
            await this.run("UPDATE turnos SET retiros = ? WHERE id = ?", [this.turnoActual.retiros, this.turnoActual.id]);
        }
    },

    async addGasto(g) {
        const f = new Date().toLocaleDateString(); const h = new Date().toLocaleTimeString();
        const res = await this.run("INSERT INTO gastos (monto, descripcion, fecha, hora, estado) VALUES (?, ?, ?, ?, ?)", [g.monto, g.descripcion, f, h, g.estado || 'pagado']);
        g.id = res.changes.lastId; g.fecha = f; g.hora = h; g.estado = g.estado || 'pagado';
        this.gastos.push(g);
        if (this.turnoActual && g.estado === 'pagado') {
            this.turnoActual.gastos += g.monto;
            await this.run("UPDATE turnos SET gastos = ? WHERE id = ?", [this.turnoActual.gastos, this.turnoActual.id]);
        }
    },

    async pagarGastoPendiente(id) {
        const g = this.gastos.find(x => x.id === id);
        if (g && g.estado === 'pendiente') {
            g.estado = 'pagado';
            await this.run("UPDATE gastos SET estado = 'pagado' WHERE id = ?", [id]);
            if (this.turnoActual) {
                this.turnoActual.gastos += g.monto;
                await this.run("UPDATE turnos SET gastos = ? WHERE id = ?", [this.turnoActual.gastos, this.turnoActual.id]);
            }
            return true;
        }
        return false;
    },

    async addProducto(p) { 
        const res = await this.run("INSERT INTO productos (categoria_id, nombre, abreviatura, precio, requiereCarne) VALUES ((SELECT id FROM categorias WHERE nombre=?), ?, ?, ?, ?)", [p.categoria, p.nombre, p.abreviatura, p.precio, p.requiereCarne ? 1 : 0]);
        p.id = res.changes.lastId; this.productos.push(p); 
    },
    async updateProducto(p) { await this.run("UPDATE productos SET categoria_id=(SELECT id FROM categorias WHERE nombre=?), nombre=?, abreviatura=?, precio=?, requiereCarne=? WHERE id=?", [p.categoria, p.nombre, p.abreviatura, p.precio, p.requiereCarne ? 1 : 0, p.id]); const idx = this.productos.findIndex(pr => pr.id === p.id); if(idx !== -1) this.productos[idx] = p; },
    async deleteProducto(id) { await this.run("DELETE FROM productos WHERE id = ?", [id]); this.productos = this.productos.filter(p => p.id !== id); },
    async addCategoria(n) { await this.run("INSERT INTO categorias (nombre) VALUES (?)", [n]); this.categorias.push(n); },
    async updateCategoria(old, n) { await this.run("UPDATE categorias SET nombre = ? WHERE nombre = ?", [n, old]); const idx = this.categorias.indexOf(old); if (idx !== -1) this.categorias[idx] = n; this.productos.forEach(p => { if (p.categoria === old) p.categoria = n; }); },
    async deleteCategoria(n) { const res = await this.query("SELECT count(*) as count FROM productos WHERE categoria_id = (SELECT id FROM categorias WHERE nombre = ?)", [n]); if (res.values[0].count > 0) throw new Error("Tiene productos"); await this.run("DELETE FROM categorias WHERE nombre = ?", [n]); this.categorias = this.categorias.filter(c => c !== n); },
    async addMesa(d) { const n = { numero: (this.mesas.length + 1).toString(), x: 50, y: 50, forma: d.forma || 'cuadrada', ancho: d.ancho || 70, alto: d.alto || 70, estado: 'libre' }; const res = await this.run("INSERT INTO mesas (numero, x, y, forma, ancho, alto, estado) VALUES (?, ?, ?, ?, ?, ?, ?)", [n.numero, n.x, n.y, n.forma, n.ancho, n.alto, n.estado]); n.id = res.changes.lastId; this.mesas.push(n); return n; },
    async eliminarMesa(id) { await this.run("DELETE FROM mesas WHERE id = ?", [id]); this.mesas = this.mesas.filter(m => m.id !== id); },
    async toggleCarne(id) { const c = this.carnes.find(x => x.id === id); if (c) { c.disponible = !c.disponible; await this.run("UPDATE carnes SET disponible = ? WHERE id = ?", [c.disponible ? 1 : 0, id]); return c.disponible; } },
    
    async getReporteGeneral(p = 'hoy') {
        const hoy = new Date().toLocaleDateString(); 
        let sqlV = "SELECT * FROM pedidos WHERE estado = 'pagado'";
        let sqlG = "SELECT sum(monto) as total FROM gastos";
        let paramsV = [];
        let paramsG = [];

        if (p === 'semana') {
            sqlV += " AND date(fecha_creacion) >= date('now', '-7 days')";
            sqlG += " WHERE date(fecha) >= date('now', '-7 days')";
        } else if (p === 'mes') {
            sqlV += " AND date(fecha_creacion) >= date('now', 'start of month')";
            sqlG += " WHERE date(fecha) >= date('now', 'start of month')";
        } else {
            sqlV += " AND date(fecha_creacion) = date('now')";
            sqlG += " WHERE date(fecha) = date('now')";
        }

        const vRes = await this.query(sqlV, paramsV);
        const gRes = await this.query(sqlG, paramsG);
        
        const ventasHeaders = vRes.values || [];
        let totalVentas = 0;
        const listaCompleta = [];

        for (const v of ventasHeaders) {
            totalVentas += v.total;
            // Cargar platos y detalles para este pedido
            const platos = [];
            const dRes = await this.query("SELECT * FROM pedido_detalles WHERE pedido_id = ?", [v.id]);
            const detalles = dRes.values || [];
            
            // Agrupar por plato_index
            const maxIdx = detalles.reduce((max, d) => Math.max(max, d.plato_index), 0);
            for (let i = 0; i <= maxIdx; i++) {
                const itemsPlato = detalles.filter(d => d.plato_index === i);
                if (itemsPlato.length > 0) {
                    platos.push({
                        items: itemsPlato.map(d => {
                            const prod = this.productos.find(pr => pr.id === d.producto_id) || { nombre: 'Desc' };
                            return { 
                                id: d.producto_id, 
                                nombre: prod.nombre, 
                                cantidad: d.cantidad, 
                                precio: d.precio_unitario,
                                notes: d.notas
                            };
                        }),
                        sinCebolla: itemsPlato[0].sin_cebolla === 1,
                        sinCilantro: itemsPlato[0].sin_cilantro === 1,
                        sinVerdura: itemsPlato[0].sin_verdura === 1
                    });
                }
            }
            
            listaCompleta.push({
                ...v,
                platos: platos,
                fecha: new Date(v.fecha_creacion).toLocaleDateString()
            });
        }

        return { 
            ventas: totalVentas, 
            totalGastos: gRes.values[0].total || 0,
            lista: listaCompleta.reverse()
        };
    },

    async getMetricasCarnes() {
        const sql = `
            SELECT 
                p.nombre as carne,
                SUM(pd.cantidad) as total_vendido,
                SUM(pd.cantidad * pd.precio_unitario) as total_dinero
            FROM pedido_detalles pd
            JOIN productos p ON pd.producto_id = p.id
            JOIN pedidos ped ON pd.pedido_id = ped.id
            WHERE p.categoria_id = 1 AND ped.estado = 'pagado'
            GROUP BY p.id
            ORDER BY total_vendido DESC
        `;
        const res = await this.query(sql);
        return res.values || [];
    },

    async addEmpleado(n, p, pd, pin) { const res = await this.run("INSERT INTO empleados (nombre, puesto, pago_dia, pin) VALUES (?, ?, ?, ?)", [n, p, pd, pin]); const e = { id: res.changes.lastId, nombre: n, puesto: p, pago_dia: pd, pin, activo: 1 }; this.empleados.push(e); return e; },
    verificarLoginEmpleado(n, p) { return this.empleados.find(e => e.nombre === n && e.pin === p); },
    async registrarAsistencia(id, pd) { const hoy = new Date().toLocaleDateString(); const h = new Date().toLocaleTimeString(); const check = await this.query("SELECT id FROM asistencia WHERE empleado_id = ? AND fecha = ?", [id, hoy]); if (check.values.length > 0) return false; await this.run("INSERT INTO asistencia (empleado_id, fecha, hora_entrada, pago_acordado) VALUES (?, ?, ?, ?)", [id, hoy, h, pd]); if (this.turnoActual) await this.addGasto({ monto: pd, descripcion: `Sueldo: ${id}` }); return true; },
    async addAdelanto(id, m) { const hoy = new Date().toLocaleDateString(); const h = new Date().toLocaleTimeString(); await this.run("INSERT INTO adelantos (empleado_id, monto, fecha, hora) VALUES (?, ?, ?, ?)", [id, m, hoy, h]); await this.addGasto({ monto: m, descripcion: `Adelanto: ${id}` }); },

    async generarPDFCorte() {
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
        doc.setFontSize(22); doc.text(this.config.nombreTaqueria.toUpperCase(), 105, y, { align: 'center' });
        y += 20; doc.setFontSize(16); doc.text("CORTE DE CAJA", 20, y);
        y += 10; doc.setFontSize(12); doc.text(`Ventas: $${this.turnoActual?.ventas || 0}`, 20, y);
        y += 10; doc.text(`Gastos: $${this.turnoActual?.gastos || 0}`, 20, y);
        return doc;
    },
    async sharePDF(doc, fn) { doc.save(fn); }
};
