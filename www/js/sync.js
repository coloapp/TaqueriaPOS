/**
 * sync.js - Lógica de Sincronización Real y Comunicación.
 */
const sync = {
    role: null,
    serverIP: null,
    port: 8080,
    offlineQueue: [],
    
    init() {
        this.role = localStorage.getItem('tpos_role');
        this.serverIP = localStorage.getItem('tpos_server_ip');
        const savedQueue = localStorage.getItem('tpos_offline_queue');
        if (savedQueue) this.offlineQueue = JSON.parse(savedQueue);

        if (!this.role) {
            document.getElementById('setup-screen').classList.remove('hidden');
        } else {
            document.addEventListener('deviceready', () => this.start(), false);
            if (!window.cordova) setTimeout(() => this.start(), 1000);
        }
        
        // Procesador de cola cada 10 segundos
        setInterval(() => this.processQueue(), 10000);
    },

    setRole(r) {
        this.role = r; localStorage.setItem('tpos_role', r);
        document.getElementById('setup-screen').classList.add('hidden');
        if (r === 'caja') this.showSetupModal();
        else this.showDiscovery();
    },

    showSetupModal() {
        // Eliminar si ya existe
        const old = document.getElementById('setup-modal');
        if(old) old.remove();

        const m = document.createElement('div');
        m.id = 'setup-modal';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:15000;";
        m.innerHTML = `
            <div style="background:white; padding:30px; border-radius:var(--radius); text-align:center; width:90%; max-width:400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h2 style="color:var(--primary); margin-bottom:15px;">Configuración Inicial</h2>
                <p style="color:#666; margin-bottom:20px;">Ingresa el nombre de tu taquería.</p>
                <input type="text" id="setup-n" placeholder="Ej: Tacos El Primo" style="width:100%; padding:15px; margin-bottom:20px; border:1px solid #ddd; border-radius:10px; font-size:1rem;">
                <button class="btn-primary" style="width:100%; padding:18px; font-weight:bold;" onclick="sync.finishCajaSetup()">GUARDAR Y CONTINUAR</button>
            </div>
        `;
        document.body.appendChild(m);
    },

    async finishCajaSetup() {
        const n = document.getElementById('setup-n').value;
        if(!n) return alert("El nombre es obligatorio");
        db.config.nombreTaqueria = n; 
        await db.save();
        document.getElementById('setup-modal').remove();
        app.startUI('caja');
    },

    async start() {
        document.getElementById('setup-screen').classList.add('hidden');
        app.startUI(this.role);
        if (this.role === 'caja') { 
            this.startServer(); 
            this.broadcast(); 
        } else {
            this.startDiscovery();
            this.updateStatus();
        }
    },

    startServer() {
        if (!window.webserver) {
            console.warn("Plugin WebServer no detectado. Simulando...");
            return;
        }
        webserver.onRequest(async (req) => {
            console.log(`Petición recibida: ${req.method} ${req.path}`);
            if (req.method === 'POST' && req.path === '/api/pedido') {
                try {
                    const p = JSON.parse(req.body);
                    await db.guardarPedido(p);
                    // Notificar si estamos en la vista de cocina o caja
                    const view = document.getElementById('content').dataset.view;
                    if (view === 'cocina') router.renderCocina();
                    if (view === 'caja') router.renderCaja();
                    
                    webserver.sendResponse(req.requestId, { 
                        status: 200, 
                        body: '{"ok":true}', 
                        headers: {'Content-Type':'application/json'} 
                    });
                } catch(e) { 
                    console.error("Error procesando pedido entrante:", e);
                    webserver.sendResponse(req.requestId, { status: 400, body: '{"error":"bad_json"}' }); 
                }
            } else {
                webserver.sendResponse(req.requestId, { status: 404, body: 'Not Found' });
            }
        });
        webserver.start(() => {
            console.log("🚀 Servidor de Caja escuchando en puerto " + this.port);
            app.showNotification("📡 Servidor de Caja Activo");
        }, (e) => console.error("❌ Error al iniciar Servidor", e), this.port);
    },

    broadcast() {
        if (!window.zeroconf) {
            console.warn("Plugin ZeroConf no detectado.");
            document.getElementById('sync-status').innerHTML = "● MODO LOCAL (SIN RED)";
            return;
        }
        zeroconf.register('_taqueriapos._tcp.', 'local.', db.config.nombreTaqueria || 'Caja Principal', this.port, { id: db.config.deviceId }, 
            () => {
                document.getElementById('sync-status').innerHTML = "● EN LÍNEA (CAJA)";
                console.log("📢 Transmitiendo presencia en red local...");
            }, 
            (e) => {
                document.getElementById('sync-status').innerHTML = "● ERROR SYNC";
                console.error("❌ Error en Broadcast:", e);
            });
    },

    startDiscovery() {
        if (this.role === 'caja') return;
        
        console.log("🔎 Iniciando radar de búsqueda...");
        if (window.zeroconf) {
            zeroconf.watch('_taqueriapos._tcp.', 'local.', (res) => {
                if (res.action === 'resolved') {
                    const ip = res.service.ipv4Addresses[0];
                    const name = res.service.name;
                    console.log(`✨ Caja encontrada: ${name} en ${ip}`);
                    this.addFound(ip, name);
                    
                    // Auto-conectar si no tenemos IP configurada
                    if (!this.serverIP) {
                        this.serverIP = ip;
                        localStorage.setItem('tpos_server_ip', ip);
                        this.updateStatus();
                        app.showNotification(`🔗 Conectado a ${name}`);
                    }
                }
            });
        } else {
            // Fallback para pruebas en navegador
            setTimeout(() => this.addFound('192.168.1.15', 'CAJA PRUEBA (MOCK)'), 3000);
        }
    },

    showDiscovery() {
        // Esta función ahora solo muestra el estado actual del radar
        const view = document.getElementById('content').dataset.view;
        if (view === 'admin_dispositivos') router.renderDispositivos();
        
        // Si no hay IP, mostrar modal de búsqueda
        if (!this.serverIP) {
            const old = document.getElementById('disc-modal');
            if(old) old.remove();

            const m = document.createElement('div');
            m.id = 'disc-modal';
            m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:15000;";
            m.innerHTML = `
                <div style="background:white; padding:30px; border-radius:var(--radius); text-align:center; width:90%; max-width:400px; box-shadow: 0 15px 40px rgba(0,0,0,0.5);">
                    <div class="radar-animation"></div>
                    <h3 style="margin-top:20px;">Buscando Caja Principal...</h3>
                    <p style="font-size:0.8rem; color:#666;">Asegúrate de que la Tablet de Caja esté encendida y en la misma red Wi-Fi.</p>
                    <div id="found-list" style="margin:20px 0; text-align:left; max-height:200px; overflow-y:auto;">Buscando dispositivos...</div>
                    <button class="btn-secondary" style="width:100%;" onclick="document.getElementById('disc-modal').remove()">CERRAR</button>
                </div>
            `;
            document.body.appendChild(m);
        }
    },

    addFound(ip, name) {
        const list = document.getElementById('found-list');
        const view = document.getElementById('content').dataset.view;
        
        // Actualizar UI del administrador si está abierta
        if (view === 'admin_dispositivos') router.renderDispositivos();

        if(!list) return;
        if(list.innerText.includes('Buscando')) list.innerHTML = '';
        
        // Evitar duplicados visuales
        if (list.querySelector(`[data-ip="${ip}"]`)) return;

        const item = document.createElement('div');
        item.dataset.ip = ip;
        item.className = "found-device-item";
        item.style = "padding:15px; background:#f0f9f0; border:1px solid #4CAF50; border-radius:12px; margin-bottom:10px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;";
        item.innerHTML = `
            <div>
                <b>🏠 ${name}</b><br>
                <small style="color:#666;">${ip}</small>
            </div>
            <div style="color:#4CAF50; font-weight:bold;">CONECTAR</div>
        `;
        item.onclick = () => { 
            this.serverIP = ip; 
            localStorage.setItem('tpos_server_ip', ip); 
            const modal = document.getElementById('disc-modal');
            if(modal) modal.remove(); 
            this.updateStatus();
            app.showNotification("✅ Conexión Establecida");
        };
        list.appendChild(item);
    },

    updateStatus() {
        const el = document.getElementById('sync-status');
        if (!el) return;
        const queueCount = this.offlineQueue.length;
        const queueHtml = queueCount > 0 ? `<span style="color:#ff9800; font-weight:bold;"> [PENDIENTES: ${queueCount}]</span>` : '';
        
        if (this.role === 'caja') {
            el.innerHTML = `● CAJA ACTIVA`;
        } else {
            el.innerHTML = this.serverIP ? `● CONECTADO A CAJA${queueHtml}` : `● BUSCANDO RED...${queueHtml}`;
        }
    },

    async enviarOrdenACaja(p) {
        if (this.role === 'caja') return;
        
        if (!this.serverIP) {
            this.addToQueue(p);
            app.showNotification("⚠️ Sin red. Pedido guardado en cola.");
            return;
        }

        try {
            const url = `http://${this.serverIP}:${this.port}/api/pedido`;
            console.log(`Enviando pedido a: ${url}`);
            
            let res;
            if (window.Capacitor?.Plugins?.Http) {
                res = await Capacitor.Plugins.Http.post({ 
                    url, 
                    data: p, 
                    headers: {'Content-Type':'application/json'}, 
                    connectTimeout: 5000,
                    readTimeout: 5000
                });
                if (res.status !== 200) throw new Error("Status " + res.status);
            } else {
                res = await fetch(url, { 
                    method: 'POST', 
                    headers: {'Content-Type':'application/json'}, 
                    body: JSON.stringify(p) 
                });
                if (!res.ok) throw new Error("Status " + res.status);
            }
            console.log("✅ Pedido entregado con éxito");
        } catch(e) { 
            console.error("❌ Error de red al enviar:", e);
            this.addToQueue(p);
            app.showNotification("⚠️ Error de conexión. Guardado en cola.");
        }
    },

    addToQueue(p) {
        // Evitar duplicados en la cola
        if (!this.offlineQueue.find(x => x.id === p.id)) {
            this.offlineQueue.push(p);
            this.saveQueue();
            this.updateStatus();
        }
    },

    saveQueue() {
        localStorage.setItem('tpos_offline_queue', JSON.stringify(this.offlineQueue));
    },

    async processQueue() {
        if (this.role === 'caja' || !this.serverIP || this.offlineQueue.length === 0) return;
        
        console.log(`📦 Procesando cola offline (${this.offlineQueue.length} pendientes)...`);
        const p = this.offlineQueue[0];
        
        try {
            const url = `http://${this.serverIP}:${this.port}/api/pedido`;
            let res;
            if (window.Capacitor?.Plugins?.Http) {
                res = await Capacitor.Plugins.Http.post({ 
                    url, 
                    data: p, 
                    headers: {'Content-Type':'application/json'}, 
                    connectTimeout: 8000 
                });
                if (res.status !== 200) throw new Error("Caja no disponible");
            } else {
                res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) });
                if (!res.ok) throw new Error("Caja no disponible");
            }
            
            console.log(`✅ Pedido ${p.id} de la cola entregado.`);
            this.offlineQueue.shift(); // Eliminar el primero con éxito
            this.saveQueue();
            this.updateStatus();
            
            // Si hay más, procesar el siguiente después de un breve respiro
            if (this.offlineQueue.length > 0) setTimeout(() => this.processQueue(), 500);
        } catch(e) {
            console.warn("⏳ Sincronización fallida, reintentando en 10 segundos...");
        }
    }
};
