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
        if (this.role === 'caja') { this.startServer(); this.broadcast(); }
        else this.updateStatus();
    },

    startServer() {
        if (!window.webserver) return;
        webserver.onRequest(async (req) => {
            if (req.method === 'POST' && req.path === '/api/pedido') {
                try {
                    const p = JSON.parse(req.body);
                    await db.guardarPedido(p);
                    if (document.getElementById('content').dataset.view === 'cocina') router.renderCocina();
                    webserver.sendResponse(req.requestId, { status: 200, body: '{"ok":true}', headers: {'Content-Type':'application/json'} });
                } catch(e) { webserver.sendResponse(req.requestId, { status: 400, body: '{"error":"bad_json"}' }); }
            } else webserver.sendResponse(req.requestId, { status: 404, body: 'Not Found' });
        });
        webserver.start(() => console.log("Servidor iniciado"), (e) => console.error("Error Servidor", e), this.port);
    },

    broadcast() {
        if (!window.zeroconf) return document.getElementById('sync-status').innerHTML = "● MODO LOCAL";
        zeroconf.register('_taqueriapos._tcp.', 'local.', db.config.nombreTaqueria, this.port, { id: db.config.deviceId }, 
            () => document.getElementById('sync-status').innerHTML = "● EN LÍNEA (CAJA)", 
            () => document.getElementById('sync-status').innerHTML = "● ERROR SYNC");
    },

    showDiscovery() {
        const old = document.getElementById('disc-modal');
        if(old) old.remove();

        const m = document.createElement('div');
        m.id = 'disc-modal';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:15000;";
        m.innerHTML = `
            <div style="background:white; padding:30px; border-radius:var(--radius); text-align:center; width:90%; max-width:400px;">
                <h3>Buscando Caja Principal...</h3>
                <div id="found-list" style="margin:20px 0; text-align:left; max-height:200px; overflow-y:auto;">Buscando en red local...</div>
                <button class="btn-primary" style="background:#666;" onclick="document.getElementById('disc-modal').remove()">CANCELAR</button>
            </div>
        `;
        document.body.appendChild(m);
        if (window.zeroconf) {
            zeroconf.watch('_taqueriapos._tcp.', 'local.', (res) => {
                if (res.action === 'resolved') this.addFound(res.service.ipv4Addresses[0], res.service.name);
            });
        } else setTimeout(() => this.addFound('192.168.1.15', 'CAJA PRUEBA (MOCK)'), 2000);
    },

    addFound(ip, name) {
        const list = document.getElementById('found-list');
        if(!list || list.querySelector(`[data-ip="${ip}"]`)) return;
        if(list.innerText.includes('Buscando')) list.innerHTML = '';
        const item = document.createElement('div');
        item.style = "padding:15px; background:#f0f9f0; border:1px solid #4CAF50; border-radius:10px; margin-bottom:10px; cursor:pointer;";
        item.innerHTML = `<b>🏠 ${name}</b><br><small>${ip}</small>`;
        item.onclick = () => { this.serverIP = ip; localStorage.setItem('tpos_server_ip', ip); document.getElementById('disc-modal').remove(); this.start(); };
        list.appendChild(item);
    },

    updateStatus() {
        const el = document.getElementById('sync-status');
        const queueCount = this.offlineQueue.length;
        const queueHtml = queueCount > 0 ? `<span style="color:orange;"> [Pendientes: ${queueCount}]</span>` : '';
        el.innerHTML = this.serverIP ? `● CONECTADO: ${this.serverIP}${queueHtml}` : `● SIN CONEXIÓN${queueHtml}`;
    },

    async enviarOrdenACaja(p) {
        if (this.role === 'caja') return;
        if (!this.serverIP) {
            this.addToQueue(p);
            app.showNotification("⚠️ Sin red. Guardado en cola.");
            return;
        }
        try {
            const url = `http://${this.serverIP}:${this.port}/api/pedido`;
            let res;
            if (window.Capacitor?.Plugins?.Http) {
                res = await Capacitor.Plugins.Http.post({ url, data: p, headers: {'Content-Type':'application/json'}, connectTimeout: 3000 });
                if (res.status !== 200) throw new Error("Status " + res.status);
            } else {
                res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) });
                if (!res.ok) throw new Error("Status " + res.status);
            }
            app.showNotification("Orden enviada ✓");
        } catch(e) { 
            console.error("Fallo envio:", e);
            this.addToQueue(p);
            app.showNotification("⚠️ Fallo red. Guardado en cola.");
        }
    },

    addToQueue(p) {
        // Evitar duplicados si es re-envio (usar ID del pedido)
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
        console.log("Procesando cola...");
        const p = this.offlineQueue[0];
        try {
            const url = `http://${this.serverIP}:${this.port}/api/pedido`;
            if (window.Capacitor?.Plugins?.Http) {
                await Capacitor.Plugins.Http.post({ url, data: p, headers: {'Content-Type':'application/json'}, connectTimeout: 5000 });
            } else {
                await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) });
            }
            this.offlineQueue.shift();
            this.saveQueue();
            this.updateStatus();
            // Continuar con el siguiente si hay
            if (this.offlineQueue.length > 0) setTimeout(() => this.processQueue(), 1000);
        } catch(e) {
            console.log("Servidor aún no responde...");
        }
    }
};
