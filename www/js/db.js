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
        const res = await this.dbConn.query("SELECT count(*) as count FROM productos");
        if (res.values[0].count === 0) await this.seedData();
    },

    async seedData() {
        const seed = `
            INSERT INTO categorias (id, nombre) VALUES (1, 'Tacos'), (2, 'Especialidades'), (3, 'Ordenes'), (4, 'Bebidas');
            
            INSERT INTO carnes (id, nombre, abreviatura, disponible, premium) VALUES 
            ('pastor', 'Pastor', 'PAS', 1, 0), ('suadero', 'Suadero', 'SUA', 1, 0), 
            ('cabeza', 'Cabeza', 'CAB', 1, 0), ('carnaza', 'Carnaza', 'CAR', 1, 0),
            ('ojo', 'Ojo', 'OJO', 1, 0), ('bistec', 'Bistec', 'BIS', 1, 0), 
            ('chorizo', 'Chorizo', 'CHO', 1, 0),
            ('arrachera', 'Arrachera', 'ARR', 1, 1), ('labio', 'Labio', 'LAB', 1, 1),
            ('lengua', 'Lengua', 'LEN', 1, 1), ('sesos', 'Sesos', 'SES', 1, 1),
            ('tripa', 'Tripa', 'TRI', 1, 1);

            INSERT INTO productos (id, categoria_id, nombre, abreviatura, precio, requiereCarne, precioSencillo) VALUES 
            (1, 1, 'Taco Pastor', 'T_PAS', 18, 1, 0),
            (2, 1, 'Taco Suadero', 'T_SUA', 18, 1, 0),
            (3, 1, 'Taco Bistec', 'T_BIS', 18, 1, 0),
            (7, 2, 'Quesadilla', 'QUESA', 35, 1, 25),
            (8, 2, 'Gringa', 'GRI', 45, 1, 35),
            (9, 2, 'Lonche', 'LON', 45, 1, 35),
            (10, 2, 'Volcan', 'VOL', 35, 1, 25),
            (11, 2, 'Papa Rellena', 'PAPA', 75, 1, 60),
            (20, 4, 'Refresco 500ml', 'REF', 25, 0, 0),
            (21, 4, 'Agua 1L', 'AGU', 35, 0, 0),
            (22, 4, 'Agua 0.5L', 'AGU5', 20, 0, 0);

            INSERT INTO mesas (id, numero, x, y, estado, ancho, alto, forma) VALUES 
            (1, '1', 50, 50, 'libre', 70, 70, 'cuadrada'),
            (2, '2', 150, 50, 'libre', 70, 70, 'cuadrada'),
            (3, '3', 250, 50, 'libre', 70, 70, 'redonda');
        `;
        await this.dbConn.execute(seed);
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
                variantes: (() => {
                    try { return p.variantes ? JSON.parse(p.variantes) : {}; }
                    catch(e) { return {}; }
                })()
            }));
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
            const pedRes = await this.dbConn.query("SELECT * FROM pedidos WHERE estado != 'pagado' AND estado != 'cancelado' AND estado != 'deuda'");
            this.pedidosActivos = (pedRes.values || []).map(p => ({ 
                ...p, 
                platos: JSON.parse(p.platos), 
                cliente: JSON.parse(p.cliente),
                descuento: p.descuento || 0,
                fiar_a: p.fiar_a || null
            }));
        } catch (e) { console.error("Error Carga:", e); }
    },

    loadMockData() {
        this.categorias = ['Tacos', 'Especialidades', 'Bebidas'];
        this.productos = [
            {id:1, nombre:'Taco Pastor', categoria:'Tacos', precio:18, requiereCarne:true, agotado:false, stock:0, variantes:{}},
            {id:7, nombre:'Quesadilla', categoria:'Especialidades', precio:35, requiereCarne:true, precioSencillo:25, agotado:false, stock:0, variantes:{}}
        ];
        this.carnes = [
            {id:'pastor', nombre:'Pastor', disponible:true, premium:false},
            {id:'arrachera', nombre:'Arrachera', disponible:true, premium:true}
        ];
        this.mesas = [{id:1, numero:'1', x:50, y:50, ancho:70, alto:70, forma:'cuadrada'}];
        this.pedidosActivos = [];
    },

    async save() {
        localStorage.setItem('tpos_config', JSON.stringify(this.config));
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
        }
        const idx = this.empleados.findIndex(e => e.id === id);
        if (idx !== -1) this.empleados[idx] = { id, nombre: n, puesto: p, pago_dia: pd, pin };
    },

    async deleteEmpleado(id) {
        if (this.dbConn) await this.dbConn.run("DELETE FROM empleados WHERE id=?", [id]);
        this.empleados = this.empleados.filter(e => e.id !== id);
    },

    async addCategoria(n) {
        if (this.dbConn) await this.dbConn.run("INSERT INTO categorias (nombre) VALUES (?)", [n]);
        if (!this.categorias.includes(n)) this.categorias.push(n);
    },

    async updateCategoria(oldN, newN) {
        if (this.dbConn) {
            await this.dbConn.run("UPDATE categorias SET nombre=? WHERE nombre=?", [newN, oldN]);
            const catRes = await this.dbConn.query("SELECT id FROM categorias WHERE nombre=?", [newN]);
            const catId = catRes.values[0]?.id;
            await this.dbConn.run("UPDATE productos SET categoria_id=? WHERE categoria_id=(SELECT id FROM categorias WHERE nombre=?)", [catId, oldN]);
        }
        const idx = this.categorias.indexOf(oldN);
        if (idx !== -1) this.categorias[idx] = newN;
        this.productos.forEach(p => { if (p.categoria === oldN) p.categoria = newN; });
    },

    async deleteCategoria(n) {
        if (this.dbConn) await this.dbConn.run("DELETE FROM categorias WHERE nombre=?", [n]);
        this.categorias = this.categorias.filter(c => c !== n);
    },

    async addProducto(p) {
        if (this.dbConn) {
            const catRes = await this.dbConn.query("SELECT id FROM categorias WHERE nombre=?", [p.categoria]);
            const catId = catRes.values[0]?.id;
            const variantesStr = JSON.stringify(p.variantes || {});
            const res = await this.dbConn.run("INSERT INTO productos (categoria_id, nombre, abreviatura, precio, requiereCarne, precioSencillo, variantes, agotado, stock) VALUES (?,?,?,?,?,?,?,?,?)", [catId, p.nombre, p.abreviatura || p.nombre.substring(0,5).toUpperCase(), p.precio, p.requiereCarne ? 1 : 0, p.precioSencillo || 0, variantesStr, p.agotado ? 1 : 0, p.stock || 0]);
            p.id = res.changes.lastId;
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
        }
        const idx = this.productos.findIndex(x => x.id === p.id);
        if (idx !== -1) this.productos[idx] = { ...p, requiereCarne: !!p.requiereCarne, agotado: !!p.agotado, stock: p.stock || 0, variantes: p.variantes || {} };
    },

    async toggleAgotado(id) {
        const p = this.productos.find(x => x.id === id);
        if (p) {
            p.agotado = !p.agotado;
            if (this.dbConn) await this.dbConn.run("UPDATE productos SET agotado=? WHERE id=?", [p.agotado ? 1 : 0, id]);
        }
    },

    async deleteProducto(id) {
        if (this.dbConn) await this.dbConn.run("DELETE FROM productos WHERE id=?", [id]);
        this.productos = this.productos.filter(p => p.id !== id);
    },

    async addCarne(c) {
        if (this.dbConn) {
            await this.dbConn.run("INSERT INTO carnes (id, nombre, abreviatura, disponible, premium) VALUES (?,?,?,?,?)", [c.id, c.nombre, c.id.substring(0,3).toUpperCase(), 1, c.premium ? 1 : 0]);
        }
        this.carnes.push({ id: c.id, nombre: c.nombre, disponible: true, premium: !!c.premium });
        
        // Auto-crear Tacos
        const catTacos = this.categorias.find(cat => cat.toLowerCase().includes('taco'));
        if (catTacos) {
            const precio = c.premium ? 25 : 18;
            await this.addProducto({
                nombre: `Taco de ${c.nombre}`,
                precio: precio,
                categoria: catTacos,
                requiereCarne: true,
                variantes: {}
            });
        }
    },

    async updateCarne(c) {
        if (this.dbConn) {
            await this.dbConn.run("UPDATE carnes SET nombre=?, premium=? WHERE id=?", [c.nombre, c.premium ? 1 : 0, c.id]);
        }
        const idx = this.carnes.findIndex(x => x.id === c.id);
        if (idx !== -1) this.carnes[idx] = { ...this.carnes[idx], ...c };
    },

    async deleteCarne(id) {
        if (this.dbConn) await this.dbConn.run("DELETE FROM carnes WHERE id=?", [id]);
        this.carnes = this.carnes.filter(c => c.id !== id);
    },

    async toggleCarne(id) {
        const c = this.carnes.find(x => x.id === id);
        if (c) {
            c.disponible = !c.disponible;
            if (this.dbConn) await this.dbConn.run("UPDATE carnes SET disponible=? WHERE id=?", [c.disponible ? 1 : 0, id]);
        }
    },

    async addGasto(g) {
        const f = new Date().toLocaleDateString();
        const h = new Date().toLocaleTimeString();
        if (this.dbConn) {
            const res = await this.dbConn.run("INSERT INTO gastos (descripcion, monto, fecha, hora, estado) VALUES (?,?,?,?,?)", [g.descripcion, g.monto, f, h, g.estado]);
            g.id = res.changes.lastId;
            if (g.estado === 'pagado' && this.turnoActual) {
                await this.dbConn.run("UPDATE turnos SET gastos = gastos + ? WHERE id=?", [g.monto, this.turnoActual.id]);
                this.turnoActual.gastos += g.monto;
            }
        } else {
            g.id = Date.now();
        }
        g.fecha = f; g.hora = h;
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
                    this.turnoActual.gastos += g.monto;
                }
            }
        }
    },

    async addMesa(m) {
        const id = Date.now();
        const newMesa = { id, numero: (this.mesas.length + 1).toString(), x: 50, y: 50, ancho: 70, alto: 70, forma: m.forma, estado: 'libre' };
        if (this.dbConn) {
            await this.dbConn.run("INSERT INTO mesas (id, numero, x, y, ancho, alto, forma, estado) VALUES (?,?,?,?,?,?,?,?)", [newMesa.id, newMesa.numero, newMesa.x, newMesa.y, newMesa.ancho, newMesa.alto, newMesa.forma, newMesa.estado]);
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
            }
        }
    },

    async eliminarMesa(id) {
        if (this.dbConn) await this.dbConn.run("DELETE FROM mesas WHERE id=?", [id]);
        this.mesas = this.mesas.filter(m => m.id !== id);
    },

    async getReporteGeneral(periodo = 'hoy') {
        if (!this.dbConn) return { ventas: 0, totalGastos: 0, totalDescuentos: 0, deudas: [], lista: [] };
        let query = "SELECT * FROM pedidos WHERE (estado='pagado' OR estado='deuda')";
        if (periodo === 'hoy') query += " AND fecha = '" + new Date().toLocaleDateString() + "'";
        const res = await this.dbConn.query(query + " ORDER BY id DESC");
        const lista = (res.values || []).map(p => ({ ...p, platos: JSON.parse(p.platos) }));
        
        const ventas = lista.reduce((a, b) => a + b.total, 0);
        const totalDescuentos = lista.reduce((a, b) => a + (b.descuento || 0), 0);
        const deudas = lista.filter(p => p.estado === 'deuda');
        
        let gQuery = "SELECT SUM(monto) as total FROM gastos WHERE estado='pagado'";
        if (periodo === 'hoy') gQuery += " AND fecha = '" + new Date().toLocaleDateString() + "'";
        const gRes = await this.dbConn.query(gQuery);
        const totalGastos = gRes.values[0].total || 0;
        
        return { ventas, totalGastos, totalDescuentos, deudas, lista };
    },

    async getMetricasCarnes() {
        if (!this.dbConn) return [];
        const res = await this.dbConn.query("SELECT platos, total FROM pedidos WHERE (estado='pagado' OR estado='deuda') AND fecha = ?", [new Date().toLocaleDateString()]);
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
        if (this.dbConn) {
            const check = await this.dbConn.query("SELECT id FROM pedidos WHERE id = ?", [p.id]);
            if (check.values.length > 0) {
                await this.dbConn.run("UPDATE pedidos SET platos=?, cliente=?, total=?, estado=?, descuento=?, fiar_a=? WHERE id=?", [pStr, cStr, total, p.estado, p.descuento || 0, p.fiar_a || null, p.id]);
            } else {
                await this.dbConn.run("INSERT INTO pedidos (id, tipo, mesaId, mesaNumero, cliente, platos, total, estado, fecha, descuento, fiar_a) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [p.id, p.tipo, p.mesaId, p.mesaNumero, cStr, pStr, total, p.estado, new Date().toLocaleDateString(), p.descuento || 0, p.fiar_a || null]);
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
                const v = it.variantes || {};
                
                if (it.requiereCarne && it.carneId) {
                    const extra = parseFloat(v[it.carneId]) || 0;
                    pBase += extra;
                } else if (it.requiereCarne && !it.carneId && it.precioSencillo > 0) {
                    pBase = it.precioSencillo;
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
        if (this.dbConn) await this.dbConn.run("UPDATE pedidos SET estado=? WHERE id=?", [estado, id]);
        const p = this.pedidosActivos.find(x => x.id === id);
        if (p) p.estado = estado;
        if (estado === 'cancelado' || estado === 'pagado' || estado === 'deuda') this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
    },

    async addLog(accion, detalles) {
        if (this.dbConn) {
            const f = new Date().toLocaleDateString();
            const h = new Date().toLocaleTimeString();
            const u = router.currentUser ? router.currentUser.nombre : 'SISTEMA';
            await this.dbConn.run("INSERT INTO logs_auditoria (usuario, accion, detalles, fecha, hora) VALUES (?,?,?,?,?)", [u, accion, detalles, f, h]);
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
            if (this.turnoActual) {
                await this.dbConn.run("UPDATE turnos SET ventas = ventas + ? WHERE id=?", [total, this.turnoActual.id]);
                this.turnoActual.ventas += total;
            }
        }
        this.pedidosActivos = this.pedidosActivos.filter(x => x.id !== id);
        app.showNotification(metodo === 'fiado' ? "📝 DEUDA REGISTRADA: $" + total.toFixed(2) : "💰 VENTA REGISTRADA: $" + total.toFixed(2));
    },

    async abrirTurno(monto) {
        const f = new Date().toLocaleDateString();
        const h = new Date().toLocaleTimeString();
        const m = parseFloat(monto) || 0;
        if (this.dbConn) {
            const res = await this.dbConn.run("INSERT INTO turnos (fecha, hora_inicio, inicioCaja, ventas, gastos, retiros, estado) VALUES (?,?,?,?,?,?,?)", [f, h, m, 0, 0, 0, 'abierto']);
            this.turnoActual = { id: res.changes.lastId, fecha: f, hora_inicio: h, inicioCaja: m, ventas: 0, gastos: 0, retiros: 0, estado: 'abierto' };
        } else {
            this.turnoActual = { id: Date.now(), fecha: f, hora_inicio: h, inicioCaja: m, ventas: 0, gastos: 0, retiros: 0, estado: 'abierto' };
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
        }
        this.turnoActual = null;
    },

    async registrarRetiro(monto, desc) {
        const m = parseFloat(monto) || 0;
        if (this.dbConn && this.turnoActual) {
            await this.dbConn.run("UPDATE turnos SET retiros = retiros + ? WHERE id=?", [m, this.turnoActual.id]);
            this.turnoActual.retiros += m;
            await this.addLog('RETIRO', `Monto: ${m}, Motivo: ${desc}`);
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
                return true;
            }
            return false;
        } catch (e) {
            console.error("Error en reparación de BD:", e);
            throw e;
        }
    }
};
