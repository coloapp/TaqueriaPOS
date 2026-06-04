/**
 * app.js - Lógica Principal e Inicialización
 */
const app = {
    async init() {
        console.log("App Iniciando...");
        const splash = document.getElementById('splash-screen');
        splash.classList.add('active'); // pointer-events: all
        
        await db.init();
        
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.classList.remove('active');
                splash.classList.add('hidden');
                sync.init();
            }, 600);
        }, 1500);
    },

    showActivationScreen() {
        // Limpiar otros modales
        const oldAct = document.getElementById('activation-screen');
        if(oldAct) oldAct.remove();
        const oldSetup = document.getElementById('setup-modal');
        if(oldSetup) oldSetup.remove();

        const div = document.createElement('div');
        div.id = 'activation-screen';
        div.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:var(--bg-dark); display:flex; justify-content:center; align-items:center; z-index:16000;";
        div.innerHTML = `
            <div style="background:white; padding:30px; border-radius:var(--radius); text-align:center; max-width:450px; width:90%; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h2 style="color:var(--primary); margin-bottom:10px;">Activar Taquería</h2>
                <p style="color:#666; font-size:0.9rem; margin-bottom:25px;">Configura tu negocio para empezar.</p>
                
                <div style="text-align:left; margin-bottom:20px;">
                    <input type="text" id="cfg-tel" value="${db.config.telefono}" placeholder="Teléfono del Local" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">
                    <input type="text" id="cfg-dir" value="${db.config.direccion}" placeholder="Dirección del Local" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px;">
                </div>

                <div style="background:#f5f5f5; padding:15px; border-radius:10px; margin-bottom:20px; border:1px dashed #bbb;">
                    <p style="font-size:0.75rem; margin-bottom:5px; color:#777;">ID DE EQUIPO:</p>
                    <div style="font-family:monospace; font-size:1.2rem; font-weight:bold; color:var(--primary); margin-bottom:15px;">${db.config.deviceId}</div>
                    <input type="text" id="activation-code" placeholder="CÓDIGO DE ACTIVACIÓN" style="width:100%; padding:15px; border:1px solid var(--primary); border-radius:8px; text-align:center; font-weight:bold; letter-spacing:1px;">
                </div>

                <button class="btn-primary" style="width:100%; padding:18px; font-size:1.1rem;" onclick="app.activarLicencia()">ACTIVAR AHORA</button>
            </div>
        `;
        document.body.appendChild(div);
    },

    async activarLicencia() {
        const tel = document.getElementById('cfg-tel').value;
        const dir = document.getElementById('cfg-dir').value;
        const code = document.getElementById('activation-code').value;

        if (await db.verificarActivacion(code)) {
            db.config.telefono = tel;
            db.config.direccion = dir;
            await db.save();
            
            app.showNotification("¡ACTIVADO!");
            const screen = document.getElementById('activation-screen');
            if(screen) screen.remove();
            this.startUI('caja');

            if (!localStorage.getItem('tpos_tour_done')) {
                setTimeout(() => { router.startTour(); localStorage.setItem('tpos_tour_done', 'true'); }, 1000);
            }
        } else {
            alert("Código incorrecto");
        }
    },

    showNotification(msg) {
        const notif = document.getElementById('notificaciones');
        notif.innerText = msg;
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 3000);
    },

    startUI(role) {
        if (role === 'caja' && !db.config.activado) {
            this.showActivationScreen();
            return;
        }

        // Limpiar todo overlay de configuración
        const act = document.getElementById('activation-screen'); if(act) act.remove();
        const set = document.getElementById('setup-modal'); if(set) set.remove();
        
        document.getElementById('taqueria-name-display').innerText = db.config.nombreTaqueria;
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        const mainNav = document.getElementById('main-nav');
        const sidebarMenu = document.getElementById('sidebar-menu');
        
        if (role === 'caja') {
            mainNav.innerHTML = `
                <button id="btn-pos-nav" onclick="router.navigate('pos')">POS</button>
                <button id="btn-mesas-nav" onclick="router.navigate('mesas')">Mesas</button>
                <button id="btn-caja-nav" onclick="router.navigate('caja')">Caja</button>
                <button id="btn-monitor-nav" onclick="router.navigate('cocina')">Monitor</button>
            `;
        } else {
            mainNav.innerHTML = `<button id="btn-mesas-nav" onclick="router.navigate('mesas')">Mesas</button>`;
        }
        
        router.navigate('login');

        // El menú lateral ahora es visible para ambos roles por petición del usuario
        sidebarMenu.innerHTML = `
            <div class="sidebar-header">
                <div style="font-size:2rem; margin-bottom:10px;">🌮</div>
                <h2 style="margin:0; font-size:1.2rem;">TaqueriaPOS</h2>
                <small style="opacity:0.8;">Sistema de Gestión Offline</small>
            </div>
            
            <div style="margin-top:20px;">
                <div class="sidebar-item" onclick="router.navigate('pos')"><span>🛒</span> Ventas POS</div>
                <div class="sidebar-item" onclick="router.navigate('mesas')"><span>📍</span> Mapa de Mesas</div>
                <div class="sidebar-item" onclick="router.navigate('cocina')"><span>👨‍🍳</span> Monitor Cocina</div>
                <div class="sidebar-item" onclick="router.navigate('caja')"><span>💰</span> Caja y Cobros</div>
                
                <div style="margin:25px 20px 10px; font-size:0.65rem; color:#999; letter-spacing:1.5px; font-weight:900;">ADMINISTRACIÓN</div>
                <div class="sidebar-item" onclick="router.navigate('admin_dashboard')"><span>📊</span> Dashboard</div>
                <div class="sidebar-item" onclick="router.navigate('admin_informes')"><span>📈</span> Historial Ventas</div>
                <div class="sidebar-item" onclick="router.navigate('admin_productos')"><span>🌮</span> Catálogo Menú</div>
                <div class="sidebar-item" onclick="router.navigate('admin_carnes')"><span>🥩</span> Inventario Carnes</div>
                <div class="sidebar-item" onclick="router.navigate('admin_gastos')"><span>💸</span> Gastos y Egresos</div>
                <div class="sidebar-item" onclick="router.navigate('admin_hrm')"><span>👥</span> Personal y Sueldos</div>
                <div class="sidebar-item" onclick="router.navigate('admin_logs')"><span>📝</span> Auditoría (Logs)</div>
                <div class="sidebar-item" onclick="router.navigate('config')"><span>⚙️</span> Configuración</div>
            </div>

            <div style="margin-top:40px; padding:0 15px 30px;">
                <button class="btn-secondary" style="width:100%; border-color:#ffcdd2; color:#d32f2f; background:#fff5f5; border-radius:12px; padding:12px;" onclick="location.reload()">
                    🚪 CERRAR SESIÓN
                </button>
            </div>
        `;
    }
};

document.addEventListener('deviceready', () => app.init(), false);
if (!window.cordova) document.addEventListener('DOMContentLoaded', () => { if (!window.Capacitor) app.init(); else setTimeout(() => app.init(), 500); });
