/**
 * router.js - Gestión de Navegación y Vistas Dinámicas
 */
const router = {
    currentCategory: 'Tacos',
    sidebarActive: false,
    orderType: 'llevar', // Predeterminado para cajera
    currentMesa: null,
    cliente: { nombre: '', tel: '', dir: '', zona: null },
    ordenActual: { platos: [{ items: [], sinCebolla: false, sinCilantro: false, sinVerdura: false, notas: '' }] },
    currentPlatoIdx: 0,
    currentUser: null,
    _enviando: false,

    navigate(view) {
        this.closeSidebar();
        const content = document.getElementById('content');
        content.innerHTML = '';
        content.dataset.view = view;
        
        if (!this.currentUser && view !== 'login') {
            this.renderLogin();
            return;
        }

        const adminViews = ['admin_dashboard', 'admin_informes', 'admin_hrm', 'config', 'admin_productos', 'admin_carnes', 'admin_dispositivos', 'admin_croquis', 'admin_logs'];
        if (adminViews.includes(view) && this.currentUser.puesto !== 'admin') {
            app.showNotification("🚫 Acceso restringido solo para Administrador");
            this.navigate('pos');
            return;
        }

        switch(view) {
            case 'login': this.renderLogin(); break;
            case 'pos': this.renderPOS(); break;
            case 'mesas': this.renderMesas(); break;
            case 'caja': this.renderCaja(); break;
            case 'cocina': this.renderCocina(); break;
            case 'admin_carnes': this.renderAdminCarnes(); break;
            case 'admin_dashboard': this.renderDashboard(); break;
            case 'admin_gastos': this.renderGastos(); break;
            case 'admin_dispositivos': this.renderDispositivos(); break;
            case 'admin_croquis': this.renderEditorCroquis(); break;
            case 'admin_hrm': this.renderHRM(); break;
            case 'admin_informes': this.renderInformes(); break;
            case 'admin_logs': this.renderLogs(); break;
            case 'admin_productos': this.renderCatalogo(); break;
            case 'config': this.renderConfig(); break;
            default: this.renderPOS();
        }
    },

    toggleSidebar() {
        this.sidebarActive = !this.sidebarActive;
        document.getElementById('sidebar').classList.toggle('active', this.sidebarActive);
    },

    closeSidebar() {
        this.sidebarActive = false;
        document.getElementById('sidebar').classList.remove('active');
    },

    _pinCallback: null,
    _pinBuffer: '',

    askForPin(level, callback) {
        this._pinCallback = callback;
        this._pinBuffer = '';
        const m = document.createElement('div');
        m.className = 'modal-full';
        m.id = 'pin-modal';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:30000;";
        m.innerHTML = `
            <div class="pin-modal-card">
                <div style="font-size:3rem; margin-bottom:10px;">🔒</div>
                <h3 style="margin-bottom:20px; letter-spacing:1px;">PIN REQUERIDO</h3>
                <input type="password" id="pin-input" readonly class="pin-display" placeholder="••••">
                <div class="numpad-grid" id="numpad">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="btn-numpad" onclick="router._handlePinKey('${n}', '${level}')">${n}</button>`).join('')}
                    <button class="btn-numpad clear" onclick="router._handlePinKey('C', '${level}')">C</button>
                    <button class="btn-numpad" onclick="router._handlePinKey('0', '${level}')">0</button>
                    <button class="btn-numpad cancel" onclick="document.getElementById('pin-modal').remove()">ESC</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    _handlePinKey(key, level) {
        const input = document.getElementById('pin-input');
        if (key === 'C') { this._pinBuffer = ''; } 
        else {
            if (this._pinBuffer.length < 4) this._pinBuffer += key;
            if (this._pinBuffer.length === 4) {
                if (db.verificarPin(this._pinBuffer, level)) {
                    setTimeout(() => {
                        const modal = document.getElementById('pin-modal');
                        if (modal) modal.remove();
                        if (this._pinCallback) this._pinCallback();
                        this._pinCallback = null;
                    }, 200);
                } else { app.showNotification("❌ PIN INCORRECTO"); this._pinBuffer = ''; }
            }
        }
        if (input) input.value = this._pinBuffer.replace(/./g, '*');
    },

    renderLogin() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="user-avatar">👤</div>
                    <h2 style="margin-bottom:5px;">Acceso Personal</h2>
                    <div style="text-align:left;">
                        <label style="font-size:0.8rem; font-weight:bold;">USUARIO:</label>
                        <input type="text" id="login-user" placeholder="Nombre de usuario" style="width:100%; padding:15px; border:2px solid #eee; border-radius:12px; margin-bottom:15px;">
                        <label style="font-size:0.8rem; font-weight:bold;">PIN:</label>
                        <input type="password" id="login-pin-direct" placeholder="••••" maxlength="6" inputmode="numeric" oninput="if(this.value.length>=4) router.handleLoginDirect()" style="width:100%; padding:15px; border:2px solid #eee; border-radius:12px; margin-bottom:20px; font-size:1.5rem; text-align:center; letter-spacing:5px;">
                        <button class="btn-primary" style="width:100%; padding:15px;" onclick="router.handleLoginDirect()">INGRESAR</button>
                    </div>
                    <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eee;">
                        <button class="btn-secondary" style="width:100%; border:none; font-size:0.85rem; color:var(--primary); font-weight:bold;" onclick="app.showActivationScreen()">⚙️ ACTIVAR ADMINISTRADOR</button>
                    </div>
                </div>
            </div>
        `;
    },

    async handleLoginDirect() {
        const userStr = document.getElementById('login-user').value.trim();
        const pinStr = document.getElementById('login-pin-direct').value;
        if (!userStr || !pinStr) { app.showNotification("⚠️ Completa campos"); return; }
        let user = db.empleados.find(e => e.nombre.toLowerCase() === userStr.toLowerCase() && e.pin === pinStr);
        if (!user && userStr.toLowerCase() === 'admin' && db.verificarPin(pinStr, 'admin')) user = { nombre: 'Admin', puesto: 'admin', pin: pinStr };
        if (user) { this.currentUser = user; app.showNotification(`Bienvenido, ${user.nombre}`); this.navigate('pos'); }
        else { app.showNotification("❌ PIN incorrecto"); }
    },

    renderPOS() {
        if (!db.turnoActual && sync.role === 'caja') { this.navigate('caja'); app.showNotification("⚠️ Debe abrir caja"); return; }
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="pos-main-wrapper">
                <div class="catalog-container">
                    <div class="user-header">
                        <span>👤 ${this.currentUser?.nombre || 'Invitado'}</span>
                        <span id="pos-mesa-info">${this.currentMesa ? 'MESA #' + this.currentMesa.numero : this.orderType.toUpperCase()}</span>
                    </div>
                    <div class="category-carousel" id="category-carousel"></div>
                    <div class="catalog-scroll-area"><div class="products-grid" id="products-grid"></div></div>
                </div>
                <div class="order-side-panel" id="order-side"></div>
            </div>
            <div class="floating-actions" id="pos-floating-actions">
                <div class="btn-float add-plato" onclick="router.nuevoPlato()">🍽️+</div>
                <div class="btn-float cart" onclick="router.toggleMobileOrder()">🛒</div>
            </div>
        `;
        this.renderCategories(); 
        this.renderProducts(); 
        this.renderOrderPanel(); 
        
        // El layout dual (side-by-side) se maneja ahora puramente por CSS media queries (801px+)
    },

    renderCategories() {
        const container = document.getElementById('category-carousel');
        if (!container) return;
        container.innerHTML = db.categorias.map(cat => `
            <div class="category-card ${this.currentCategory === cat ? 'active' : ''}" onclick="router.selectCategory('${cat}')">
                <div style="font-size:1.4rem;">${cat.toLowerCase().includes('taco') ? '🌮' : (cat.toLowerCase().includes('bebida') ? '🥤' : '✨')}</div>
                <div style="font-size:0.7rem;">${cat.toUpperCase()}</div>
            </div>
        `).join('');
    },

    renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        const prods = db.productos.filter(p => p.categoria === this.currentCategory);
        grid.innerHTML = prods.map(p => `
            <div class="product-card ${p.agotado ? 'sold-out' : ''}" onclick="${p.agotado ? '' : `router.addToOrder(${JSON.stringify(p).replace(/"/g, '&quot;')})`}">
                ${p.agotado ? '<div class="sold-out-badge">AGOTADO</div>' : ''}
                <div class="prod-code">${p.abreviatura || p.nombre.substring(0,5).toUpperCase()}</div>
                <div class="prod-price">$${p.precio}</div>
                <div class="prod-name">${p.nombre.toUpperCase()}</div>
            </div>
        `).join('');
    },

    selectCategory(cat) { this.currentCategory = cat; this.renderCategories(); this.renderProducts(); },
    toggleQuickSwitch(field) { const pl = this.ordenActual.platos[this.currentPlatoIdx]; pl[field] = !pl[field]; this.refreshOrderList(); },

    addToOrder(prod) {
        // LÓGICA DE NEGOCIO POR CATEGORÍA
        if (prod.categoria === 'Tacos') {
            // Tacos son de cajón: Se agrega directo sin preguntar carne (ya viene en el nombre/id)
            this._addItemToOrder(prod);
        } else if (prod.categoria === 'Especialidades') {
            this.showMeatSelector(prod);
        } else if (prod.categoria === 'Ordenes') {
            this.showMultipleMeatSelector(prod);
        } else {
            this._addItemToOrder(prod);
        }
    },

    showMeatSelector(prod) {
        const m = document.createElement('div'); m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:25000;";
        const isLonche = prod.nombre.toLowerCase().includes('lonche');
        const v = prod.variantes || {};
        
        m.innerHTML = `
            <div style="background:white; padding:25px; border-radius:20px; width:95%; max-width:450px; text-align:center;">
                <h2 style="margin-bottom:5px;">${prod.nombre.toUpperCase()}</h2>
                <p style="color:#666; margin-bottom:20px;">Elige la carne o sencilla</p>
                
                ${prod.precioSencillo > 0 ? `
                    <button class="btn-primary" style="width:100%; padding:18px; margin-bottom:15px; background:#455a64; font-size:1.1rem;" 
                            onclick="router._addItemToOrder(${JSON.stringify(prod).replace(/"/g, '&quot;')}, null, false)">
                        SENCILLA ($${prod.precioSencillo})
                    </button>
                ` : ''}

                ${isLonche ? `
                    <div style="margin-bottom:15px; background:#fff3e0; padding:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #ffe0b2;">
                        <span style="font-weight:bold;">🧀 EXTRA QUESO (+$${v['queso'] || 10})</span>
                        <input type="checkbox" id="lonche-q" style="width:30px; height:30px;">
                    </div>
                ` : ''}

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; max-height:350px; overflow-y:auto; padding:5px;" class="scrollable-y">
                    ${db.carnes.filter(c => c.disponible).map(c => {
                        const extra = parseFloat(v[c.id]) || 0;
                        const finalPrice = prod.precio + extra;
                        return `
                            <button class="btn-secondary" style="padding:15px; font-weight:bold; height:70px; display:flex; flex-direction:column; justify-content:center;" 
                                    onclick="router._addItemToOrder(${JSON.stringify(prod).replace(/"/g, '&quot;')}, '${c.id}', ${c.premium})">
                                <span>${c.nombre.toUpperCase()}</span>
                                <small style="color:var(--primary);">$${finalPrice}</small>
                            </button>
                        `;
                    }).join('')}
                </div>
                
                <button class="btn-secondary" style="width:100%; margin-top:20px; border:none; color:#888;" onclick="this.closest('.modal-full').remove()">CANCELAR</button>
            </div>
        `;
        document.body.appendChild(m);
    },

    showMultipleMeatSelector(prod) {
        const m = document.createElement('div'); m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:25000;";
        
        const isGrande = prod.nombre.toLowerCase().includes('grande');
        const limit = isGrande ? 4 : 3; 
        this._selectedOrdenMeats = [];
        
        m.innerHTML = `
            <div style="background:white; padding:25px; border-radius:20px; width:95%; max-width:480px; text-align:center;">
                <h2 style="margin-bottom:5px;">${prod.nombre.toUpperCase()}</h2>
                <p style="color:#666; margin-bottom:15px;">Selecciona hasta ${limit} carnes (PROHIBIDO LENGUA)</p>
                <div id="selected-list" style="background:#f5f5f5; padding:15px; border-radius:12px; min-height:50px; margin-bottom:15px; font-weight:bold; color:var(--primary); display:flex; flex-wrap:wrap; gap:5px; justify-content:center; align-items:center;">Ninguna seleccionada</div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; max-height:300px; overflow-y:auto; padding:5px;" class="scrollable-y">
                    ${db.carnes.filter(c => c.disponible && c.id !== 'lengua').map(c => `
                        <button class="btn-secondary meat-opt" data-id="${c.id}" data-premium="${c.premium}" style="padding:12px 5px; font-size:0.75rem; font-weight:bold; height:60px;" 
                                onclick="router._toggleMeatSelection(this, '${c.nombre}', ${limit})">
                            ${c.nombre.toUpperCase()}
                            ${c.premium ? '<br><small style="color:var(--primary);">+EXTRA</small>' : ''}
                        </button>
                    `).join('')}
                </div>

                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button class="btn-primary" style="flex:1.5; padding:18px; font-weight:900;" onclick="router._addOrdenToOrder(${JSON.stringify(prod).replace(/"/g, '&quot;')})">AGREGAR AL PLATO</button>
                    <button class="btn-secondary" style="flex:1; padding:18px; background:#f4f4f4; color:#666; border:none;" onclick="this.closest('.modal-full').remove()">CANCELAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    _selectedOrdenMeats: [],
    _toggleMeatSelection(btn, nombre, limit) {
        const id = btn.dataset.id;
        const idx = this._selectedOrdenMeats.findIndex(m => m.id === id);
        
        if (idx !== -1) {
            this._selectedOrdenMeats.splice(idx, 1);
            btn.classList.remove('active');
            btn.style.background = "white"; btn.style.color = "black";
        } else {
            if (this._selectedOrdenMeats.length >= limit) {
                app.showNotification(`⚠️ Máximo ${limit} carnes`);
                return;
            }
            this._selectedOrdenMeats.push({ id, nombre, premium: btn.dataset.premium === 'true' });
            btn.classList.add('active');
            btn.style.background = "var(--primary)"; btn.style.color = "white";
        }
        
        const list = document.getElementById('selected-list');
        list.innerText = this._selectedOrdenMeats.length > 0 ? this._selectedOrdenMeats.map(m => m.nombre).join(' + ') : 'Ninguna seleccionada';
    },

    _addOrdenToOrder(prod) {
        if (this._selectedOrdenMeats.length === 0) return app.showNotification("⚠️ Elige al menos una carne");
        
        const hasPremium = this._selectedOrdenMeats.some(m => m.premium);
        const nameMeats = this._selectedOrdenMeats.map(m => m.nombre.substring(0,3).toUpperCase()).join('/');
        
        this._addItemToOrder(prod, nameMeats, hasPremium);
        this._selectedOrdenMeats = [];
    },

    _addItemToOrder(prod, carneId = null, isPremium = false) {
        const plato = this.ordenActual.platos[this.currentPlatoIdx];
        const conQueso = document.getElementById('lonche-q')?.checked || false;
        const item = { ...prod, cantidad: 1, carneId, conQueso, isPremiumMeat: isPremium, variantes: prod.variantes };
        const existing = plato.items.find(i => i.id === prod.id && i.carneId === carneId && i.conQueso === conQueso);
        if (existing) existing.cantidad++; else plato.items.push(item);
        document.querySelectorAll('.modal-full').forEach(m => m.remove());
        this.refreshOrderList(); 
        app.showNotification(`+ ${prod.nombre}`);
    },

    renderOrderPanel() {
        const container = document.getElementById('order-side'); if (!container) return;
        const isUpdate = !!this.ordenActual.id;
        container.innerHTML = `
            <div style="background:var(--primary); color:white; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                <b>${this.orderType.toUpperCase()} ${this.currentMesa ? '#'+this.currentMesa.numero : ''}</b>
                <button class="btn-accent" onclick="router.nuevoPlato()" style="padding:4px 10px; font-size:0.7rem;">+ PLATO</button>
            </div>
            <div style="padding:6px; background:#eee; display:flex; gap:4px;">
                <button class="btn-type ${this.orderType==='mesa'?'active':''}" onclick="router.setOrderType('mesa')" style="flex:1;">Mesa</button>
                <button class="btn-type ${this.orderType==='llevar'?'active':''}" onclick="router.setOrderType('llevar')" style="flex:1;">Llevar</button>
                <button class="btn-type ${this.orderType==='domicilio'?'active':''}" onclick="router.setOrderType('domicilio')" style="flex:1;">🛵 Dom</button>
            </div>
            <div id="platos-lista" class="scrollable-y" style="flex:1; background:#f5f5f5;"></div>
            <div class="order-footer">
                <div id="order-total" style="font-size:1.4rem; font-weight:bold; margin-bottom:10px;">Total: $0</div>
                <button class="btn-primary" style="width:100%; padding:15px;" onclick="router.enviarOrden()">${isUpdate?'GUARDAR CAMBIOS':'ENVIAR ORDEN'}</button>
            </div>
        `;
        this.refreshOrderList();
    },

    refreshOrderList() {
        const container = document.getElementById('platos-lista'); if (!container) return;
        container.innerHTML = this.ordenActual.platos.map((pl, idx) => `
            <div class="plato-card ${idx === this.currentPlatoIdx ? 'active' : ''}" onclick="router.selectPlato(${idx})">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:5px;"><b>PLATO ${idx + 1}</b><span style="color:red;" onclick="event.stopPropagation(); router.eliminarPlatoEspecifico(${idx})">🗑️</span></div>
                ${pl.items.map((it, i) => {
                    const code = it.abreviatura || it.nombre.substring(0,5).toUpperCase();
                    const meatCode = it.carneId ? it.carneId.toUpperCase() : '';
                    return `
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:4px 0; border-bottom:1px solid #eee;">
                            <span><b>${it.cantidad}x</b> ${code} <small style="color:var(--primary); font-weight:bold;">${meatCode}</small></span>
                            <span>$${(it.precio*it.cantidad).toFixed(2)} <span style="color:red;" onclick="event.stopPropagation(); router.eliminarItem(${i})">×</span></span>
                        </div>
                    `;
                }).join('')}
                <div class="plato-switches">
                    <button class="toggle-btn ${pl.sinCebolla?'active':''}" onclick="event.stopPropagation(); router.toggleSwitch(${idx}, 'sinCebolla')">S/ Ceb</button>
                    <button class="toggle-btn ${pl.sinCilantro?'active':''}" onclick="event.stopPropagation(); router.toggleSwitch(${idx}, 'sinCilantro')">S/ Cil</button>
                    <button class="toggle-btn ${pl.sinVerdura?'active':''}" onclick="event.stopPropagation(); router.toggleSwitch(${idx}, 'sinVerdura')">S/ Ver</button>
                </div>
                <input type="text" class="plato-nota" placeholder="Nota..." value="${pl.notas||''}" oninput="router.updatePlatoNota(${idx}, this.value)">
            </div>
        `).join('');
        this.updateTotal();
    },

    updateTotal() { const t = db.calcularTotal({ ...this.ordenActual, cliente: this.cliente }); document.getElementById('order-total').innerText = `Total: $${t.toFixed(2)}`; },
    selectPlato(idx) { this.currentPlatoIdx = idx; document.querySelectorAll('.plato-card').forEach((c, i) => c.classList.toggle('active', i === idx)); },
    updatePlatoNota(idx, val) { this.ordenActual.platos[idx].notas = val; },
    nuevoPlato() { 
        this.ordenActual.platos.push({ items: [], sinCebolla: false, sinCilantro: false, sinVerdura: false, notas: '' }); 
        this.currentPlatoIdx = this.ordenActual.platos.length-1; 
        this.renderOrderPanel(); 
        
        // Auto-scroll al final de la lista para que el nuevo plato sea visible
        setTimeout(() => {
            const list = document.getElementById('platos-lista');
            if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
        }, 100);
    },
    eliminarItem(idx) { this.ordenActual.platos[this.currentPlatoIdx].items.splice(idx, 1); this.refreshOrderList(); },
    eliminarPlatoEspecifico(idx) { if(this.ordenActual.platos.length > 1) { this.ordenActual.platos.splice(idx, 1); if(this.currentPlatoIdx >= this.ordenActual.platos.length) this.currentPlatoIdx = 0; this.renderOrderPanel(); } },
    toggleSwitch(idx, f) { this.ordenActual.platos[idx][f] = !this.ordenActual.platos[idx][f]; this.refreshOrderList(); },
    setOrderType(t) { this.orderType = t; this.renderOrderPanel(); },
    toggleMobileOrder() { document.getElementById('order-side').classList.toggle('mobile-active'); },

    async enviarOrden() {
        if (this._enviando) return;
        if (this.ordenActual.platos.every(p => p.items.length === 0)) return;
        
        this._enviando = true;
        try {
            const pedido = { id: this.ordenActual.id || Date.now(), tipo: this.orderType, mesaId: this.currentMesa?.id, mesaNumero: this.currentMesa?.numero, cliente: { ...this.cliente }, platos: JSON.parse(JSON.stringify(this.ordenActual.platos)), estado: 'pendiente' };
            await db.guardarPedido(pedido); await sync.enviarOrdenACaja(pedido);
            if (sync.role === 'caja') {
                await printer.sendToPrinter(printer.formatKitchenOrder(pedido), pedido, 'cocina', true);
                if (pedido.tipo !== 'mesa') await printer.sendToPrinter(printer.formatBill(pedido), pedido, 'cuenta', true);
            }
            app.showNotification("✅ ORDEN ENVIADA"); this.resetPOS(); this.navigate('pos');
        } catch (e) {
            console.error(e);
            app.showNotification("❌ Error al enviar orden");
        } finally {
            this._enviando = false;
        }
    },

    resetPOS() { this.ordenActual = { platos: [{ items: [], sinCebolla: false, sinCilantro: false, sinVerdura: false, notas: '' }] }; this.cliente = { nombre: '', tel: '', dir: '', zona: null }; this.currentMesa = null; this.currentPlatoIdx = 0; this.orderType = sync.role === 'caja' ? 'llevar' : 'mesa'; },

    renderMesas() {
        const content = document.getElementById('content');
        content.innerHTML = `<div style="padding:15px; height:100%; display:flex; flex-direction:column;"><div style="display:flex; justify-content:space-between; margin-bottom:15px;"><h2>📍 Mesas</h2><button class="btn-secondary" onclick="router.navigate('admin_croquis')">✏️ Editar Mapa</button></div><div id="mapa-mesas" style="flex:1; position:relative; background:white; border-radius:20px; overflow:auto;" class="scrollable-y"></div></div>`;
        const container = document.getElementById('mapa-mesas');
        db.mesas.forEach(mesa => {
            const ped = db.pedidosActivos.find(p => p.mesaId === mesa.id);
            const div = document.createElement('div');
            div.style = `position:absolute; left:${mesa.x}px; top:${mesa.y}px; width:${mesa.ancho}px; height:${mesa.alto}px; background:${ped?'var(--primary)':'white'}; color:${ped?'white':'black'}; border-radius:${mesa.forma==='redonda'?'50%':'12px'}; display:flex; flex-direction:column; justify-content:center; align-items:center; font-weight:bold; border:1px solid #ddd; box-shadow:var(--shadow); cursor:pointer;`;
            div.innerHTML = `<span>${mesa.numero}</span>${ped?`<small>$${db.calcularTotal(ped).toFixed(0)}</small>`:''}`;
            div.onclick = () => { this.currentMesa = mesa; this.orderType = 'mesa'; if(ped) this.ordenActual = JSON.parse(JSON.stringify(ped)); else this.resetPOS(); this.currentMesa = mesa; this.navigate('pos'); };
            container.appendChild(div);
        });
    },

    renderCaja() {
        const content = document.getElementById('content');
        if (!db.turnoActual) {
            content.innerHTML = `<div style="padding:60px; text-align:center;"><h2>Caja Cerrada</h2><input type="number" id="ini-c" placeholder="$ Fondo inicial" style="padding:15px; width:200px; text-align:center; font-size:1.5rem; border-radius:10px; border:1px solid #ddd;"><br><button class="btn-primary" style="margin-top:20px;" onclick="router.handleAbrirCaja(document.getElementById('ini-c').value)">ABRIR TURNO</button></div>`;
            return;
        }
        const t = db.turnoActual;
        const efectivo = (t.inicioCaja + (t.ventas_efectivo || 0) - t.gastos - (t.retiros || 0));
        content.innerHTML = `
            <div style="padding:20px; height:100%;" class="scrollable-y">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Control de Caja</h2><button class="btn-accent" onclick="router.askForPin('admin', () => router.showRetiroModal())">💸 RETIRO</button></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                    <div style="background:#fff9f0; padding:15px; border-radius:15px; border:1px solid #ffe0b2;">Dinero en Caja<br><b style="font-size:1.5rem;">$${efectivo.toFixed(2)}</b></div>
                    <div style="background:#f0f7ff; padding:15px; border-radius:15px; border:1px solid #d0e8ff;">Retiros<br><b style="font-size:1.5rem; color:red;">-$${(t.retiros||0).toFixed(2)}</b></div>
                </div>
                <h3 style="border-bottom:2px solid var(--primary);">Pendientes de Pago</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px;">
                    ${db.pedidosActivos.map(p => `<div class="admin-card"><b>${p.tipo==='mesa'?'Mesa '+p.mesaNumero:p.cliente.nombre||'Para llevar'}</b><br><span style="font-size:1.2rem; color:var(--primary); font-weight:bold;">$${db.calcularTotal(p).toFixed(2)}</span><div style="display:flex; gap:5px; margin-top:10px;"><button class="btn-secondary" onclick="printer.printBill(db.pedidosActivos.find(x=>x.id===${p.id}))">📄</button><button class="btn-primary" style="flex:1; background:#4CAF50;" onclick="router.showPaymentModal(${p.id})">COBRAR</button></div></div>`).join('')}
                    ${db.pedidosActivos.length === 0 ? '<p style="color:#999; text-align:center; padding:20px;">No hay pedidos pendientes</p>' : ''}
                </div>
                <button class="btn-primary" style="margin-top:40px; background:#333;" onclick="router.askForPin('admin', () => router.cerrarCajaModal())">CERRAR TURNO Y CORTE</button>
            </div>
        `;
    },

    async handleAbrirCaja(m) { 
        const monto = parseFloat(m) || 0; 
        this.askForPin('staff', async () => { 
            await db.abrirTurno(monto); 
            this.navigate('caja'); 
        }); 
    },
    showRetiroModal() { 
        const m = prompt("Monto a retirar:"); 
        if(m) { 
            db.registrarRetiro(parseFloat(m), "Retiro parcial").then(() => this.renderCaja()); 
        } 
    },
    showPaymentModal(id) {
        const p = db.pedidosActivos.find(x => x.id === id); const t = db.calcularTotal(p); const tc = db.calcularTotal(p, true);
        const m = document.createElement('div'); m.className = 'modal-full'; m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        m.innerHTML = `
            <div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:400px; text-align:center;">
                <h3 id="pay-total-display">Total: $${t.toFixed(2)}</h3>
                <div style="display:grid; gap:12px; margin-top:20px;">
                    <button class="btn-primary" style="background:#4CAF50;" onclick="router.handleCobro(${id}, 'efectivo')">Efectivo</button>
                    <button class="btn-primary" style="background:#2196F3;" onclick="router.handleCobro(${id}, 'transferencia')">Transferencia</button>
                    <button class="btn-primary" style="background:#9C27B0;" onclick="router.handleCobro(${id}, 'tarjeta')">Tarjeta ($${tc.toFixed(2)})</button>
                    <button class="btn-primary" style="background:#FF9800;" onclick="router.handleCobro(${id}, 'fiado')">Fiado / Deuda</button>
                    <hr>
                    <button class="btn-accent" style="width:100%;" onclick="router.aplicarDescuento(${id})">🎁 APLICAR DESCUENTO</button>
                    <button class="btn-secondary" style="background:#607D8B; color:white;" onclick='printer.printBill(${JSON.stringify(p).replace(/"/g, '&quot;')})'>🖨️ IMPRIMIR CUENTA</button>
                </div>
                <button class="btn-secondary" style="width:100%; margin-top:20px;" onclick="this.closest('.modal-full').remove()">Cancelar</button>
            </div>
        `;
        document.body.appendChild(m);
    },
    async aplicarDescuento(id) {
        const monto = prompt("Monto del descuento ($):");
        if (monto !== null) {
            const p = db.pedidosActivos.find(x => x.id === id);
            if (p) {
                p.descuento = parseFloat(monto) || 0;
                await db.guardarPedido(p);
                const t = db.calcularTotal(p);
                document.getElementById('pay-total-display').innerText = `Total: $${t.toFixed(2)}`;
                app.showNotification("🎁 Descuento aplicado");
            }
        }
    },
    async handleCobro(id, m) { 
        let fiarA = null;
        if (m === 'fiado') {
            fiarA = prompt("¿A quién se le fía?");
            if (!fiarA) return;
        }
        await db.cobrarPedido(id, m, fiarA); 
        document.querySelector('.modal-full').remove(); 
        this.renderCaja(); 
    },

    async cerrarCajaModal() {
        const m = document.createElement('div'); m.className = 'modal-full'; m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:20000; padding:20px;";
        m.innerHTML = `<div style="background:white; padding:30px; border-radius:20px; width:100%; max-width:400px; text-align:center;"><h2>Cerrar Turno</h2><label>Efectivo Físico en Caja:</label><input type="number" id="corte-monto" style="width:100%; padding:15px; font-size:1.5rem; text-align:center; margin:20px 0;"><button class="btn-primary" style="width:100%; padding:20px;" onclick="router.handleFinalizarCorte()">CERRAR CAJA DEFINITIVAMENTE</button><button class="btn-secondary" style="width:100%; margin-top:10px; border:none;" onclick="this.closest('.modal-full').remove()">VOLVER</button></div>`;
        document.body.appendChild(m);
    },
    async handleFinalizarCorte() { const monto = document.getElementById('corte-monto').value; if(monto) { await db.cerrarTurno(monto); document.querySelector('.modal-full').remove(); this.renderCaja(); app.showNotification("✅ Corte realizado"); } },

    renderCocina() {
        const content = document.getElementById('content');
        const pedidos = db.pedidosActivos.filter(p => p.estado === 'pendiente');
        content.innerHTML = `
            <div style="padding:15px; height:100%;" class="scrollable-y">
                <h2>Monitor de Cocina</h2>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
                    ${pedidos.map(p => `
                        <div class="admin-card" style="border-top:5px solid var(--primary);">
                            <b>${p.tipo==='mesa'?'MESA '+p.mesaNumero:p.tipo.toUpperCase() + ' #' + (p.id % 1000)}</b><br>
                            <small>Mesero: ${p.cliente?.mesero || 'Caja'}</small><br>
                            ${p.platos.map((pl, i) => {
                                const itemStr = pl.items.map(it => {
                                    const code = it.abreviatura || it.nombre.substring(0,5).toUpperCase();
                                    const meat = it.carneId ? '/' + it.carneId.toUpperCase() : '';
                                    return it.cantidad + ' ' + code + meat;
                                }).join(', ');
                                return `
                                    <div style="background:#f9f9f9; padding:8px; margin-top:5px;">
                                        <b>P${i+1}</b>: ${itemStr}
                                        <br><small style="color:red; font-weight:bold;">${pl.sinCebolla?'S/Ceb':''} ${pl.sinCilantro?'S/Cil':''} ${pl.sinVerdura?'S/Ver':''}</small>
                                        ${pl.notas ? `<br><i style="font-size:0.7rem; color:#666;">"${pl.notas}"</i>` : ''}
                                    </div>
                                `;
                            }).join('')}
                            <button class="btn-primary" style="width:100%; background:#4CAF50; margin-top:10px;" onclick="router.handleOrdenLista(${p.id})">DESPACHAR ✓</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        this.updateMonitorBadge();
    },

    updateMonitorBadge() {
        const count = db.pedidosActivos.filter(p => p.estado === 'pendiente').length;
        const badges = document.querySelectorAll('.monitor-badge');
        badges.forEach(b => {
            b.innerText = count;
            b.style.display = count > 0 ? 'flex' : 'none';
        });
    },
    async handleOrdenLista(id) { await db.updatePedidoEstado(id, 'listo'); this.renderCocina(); },

    async renderDashboard() {
        const content = document.getElementById('content'); const t = db.turnoActual;
        if (!t) { content.innerHTML = `<div style="padding:40px; text-align:center;"><h2>📊 Dashboard</h2><p>Abre caja para ver estadísticas</p></div>`; return; }
        const metrics = await db.getMetricasCarnes();
        content.innerHTML = `<div style="padding:20px; height:100%;" class="scrollable-y"><h2>Panel de Control</h2><div class="stat-grid"><div class="stat-item primary"><span class="lab">Ingresos</span><span class="val">$${t.ventas.toFixed(0)}</span></div><div class="stat-item accent"><span class="lab">Gastos</span><span class="val">$${t.gastos.toFixed(0)}</span></div><div class="stat-item success"><span class="lab">Utilidad</span><span class="val">$${(t.ventas-t.gastos).toFixed(0)}</span></div></div><div class="admin-card"><h4>🔥 Rendimiento de Carnes</h4><table style="width:100%; border-collapse:collapse;">${metrics.map(m => `<tr><td style="padding:10px;"><b>${m.carne}</b></td><td style="text-align:center;">${m.total_vendido}</td><td style="text-align:right; font-weight:bold;">$${m.total_dinero.toFixed(0)}</td></tr>`).join('')}</table></div></div>`;
    },

    async renderInformes(periodo = 'hoy') {
        const content = document.getElementById('content');
        const report = await db.getReporteGeneral(periodo);
        
        content.innerHTML = `
            <div style="padding:20px; height:100%;" class="scrollable-y">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2>📈 Informes y Ventas</h2>
                    <select onchange="router.renderInformes(this.value)" style="padding:10px; border-radius:10px;">
                        <option value="hoy" ${periodo==='hoy'?'selected':''}>Hoy</option>
                        <option value="todo" ${periodo==='todo'?'selected':''}>Historial Total</option>
                    </select>
                </div>
                
                <div class="stat-grid" style="margin-bottom:20px;">
                    <div class="stat-item primary">
                        <span class="lab">Ventas Totales</span>
                        <span class="val">$${report.ventas.toFixed(2)}</span>
                    </div>
                    <div class="stat-item accent">
                        <span class="lab">Gastos</span>
                        <span class="val">$${report.totalGastos.toFixed(2)}</span>
                    </div>
                    <div class="stat-item warning">
                        <span class="lab">Descuentos</span>
                        <span class="val">-$${report.totalDescuentos.toFixed(2)}</span>
                    </div>
                    <div class="stat-item success">
                        <span class="lab">Utilidad Neta</span>
                        <span class="val">$${(report.ventas - report.totalGastos).toFixed(2)}</span>
                    </div>
                </div>

                ${report.deudas.length > 0 ? `
                <h3 style="color:var(--accent);">⚠️ Cuentas por Cobrar (Deudas)</h3>
                <div style="display:grid; gap:10px; margin-bottom:20px;">
                    ${report.deudas.map(d => `
                        <div class="admin-card" style="border-left:5px solid var(--accent); display:flex; justify-content:space-between; align-items:center;">
                            <div><b>${d.fiar_a || 'Sin nombre'}</b><br><small>Pedido #${d.id} - ${d.fecha}</small></div>
                            <b style="color:var(--accent); font-size:1.2rem;">$${d.total.toFixed(2)}</b>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <h3>Listado de Ventas</h3>
                <div style="display:grid; gap:10px;">
                    ${report.lista.map(p => `
                        <div class="admin-card" style="display:flex; justify-content:space-between; align-items:center; ${p.estado==='deuda'?'opacity:0.7;':''}">
                            <div>
                                <b>#${p.id} - ${p.tipo.toUpperCase()}</b> ${p.estado==='deuda'?'<span class="badge-deuda">DEUDA</span>':''}<br>
                                <small>${p.fecha} ${p.metodo_pago.toUpperCase()}</small>
                            </div>
                            <div style="text-align:right;">
                                <b style="font-size:1.1rem; color:var(--primary);">$${p.total.toFixed(2)}</b><br>
                                ${p.descuento > 0 ? `<small style="color:red;">Desc: -$${p.descuento}</small><br>` : ''}
                                <button class="btn-secondary" style="padding:2px 8px; font-size:0.7rem;" onclick='router.showPedidoDetalle(${JSON.stringify(p).replace(/'/g, "&apos;")})'>DETALLES</button>
                            </div>
                        </div>
                    `).join('')}
                    ${report.lista.length === 0 ? '<p style="text-align:center; color:#999; padding:20px;">No hay ventas registradas</p>' : ''}
                </div>
            </div>
        `;
    },

    showPedidoDetalle(p) {
        const m = document.createElement('div'); m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000; padding:20px;";
        m.innerHTML = `
            <div style="background:white; padding:25px; border-radius:20px; width:100%; max-width:400px; max-height:90vh; overflow-y:auto;" class="scrollable-y">
                <h3>Detalle Pedido #${p.id}</h3>
                <hr>
                <div style="margin:15px 0; font-size:0.9rem;">
                    <b>Tipo:</b> ${p.tipo.toUpperCase()}<br>
                    ${p.mesaNumero ? `<b>Mesa:</b> ${p.mesaNumero}<br>` : ''}
                    <b>Cliente:</b> ${p.cliente?.nombre || 'General'}<br>
                    <b>Fecha:</b> ${p.fecha}<br>
                    <b>Estado:</b> ${p.estado.toUpperCase()}<br>
                    ${p.fiar_a ? `<b>Deuda de:</b> ${p.fiar_a}<br>` : ''}
                    <b>Metodo Pago:</b> ${p.metodo_pago.toUpperCase()}
                </div>
                <div style="background:#f9f9f9; padding:10px; border-radius:10px; margin-bottom:15px;">
                    ${p.platos.map((pl, idx) => `
                        <div style="margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                            <b>Plato ${idx+1}</b>: ${pl.items.map(it => it.cantidad + 'x ' + it.nombre).join(', ')}
                            ${pl.notas ? `<br><small style="color:#666;">Nota: ${pl.notas}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div style="text-align:right; font-size:1.2rem; font-weight:bold; margin-bottom:20px;">
                    ${p.descuento > 0 ? `<small style="color:red; font-size:0.8rem;">Descuento: -$${p.descuento}</small><br>` : ''}
                    TOTAL: $${p.total.toFixed(2)}
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary" style="flex:1;" onclick="printer.printBill(${JSON.stringify(p).replace(/"/g, '&quot;')})">RE-IMPRIMIR</button>
                    <button class="btn-secondary" style="flex:1;" onclick="this.closest('.modal-full').remove()">CERRAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    async renderLogs() {
        const content = document.getElementById('content');
        if (!db.dbConn) { content.innerHTML = `<div style="padding:20px;">Auditoría no disponible en modo web</div>`; return; }
        const res = await db.dbConn.query("SELECT * FROM logs_auditoria ORDER BY id DESC LIMIT 100");
        const logs = res.values || [];
        content.innerHTML = `<div style="padding:20px; height:100%;" class="scrollable-y"><h2>Auditoría</h2><table style="width:100%; font-size:0.8rem;">${logs.map(l => `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px;">${l.fecha}<br>${l.hora}</td><td><b>${l.usuario}</b></td><td>${l.accion}</td><td>${l.detalles}</td></tr>`).join('')}</table></div>`;
    },

    renderAdminCarnes() {
        const content = document.getElementById('content');
        content.innerHTML = `<div style="padding:20px; height:100%;" class="scrollable-y"><div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>Inventario de Carnes</h2><button class="btn-accent" onclick="router.showCarneModal()">+ NUEVA</button></div><div class="inventory-grid">${db.carnes.map(c => `<div class="meat-status-card ${c.disponible?'active':'sold-out'}"><div class="status-badge" onclick="router.handleToggleCarne('${c.id}')">${c.disponible?'SI HAY':'NO HAY'}</div><div style="font-size:2rem; cursor:pointer;" onclick="router.showCarneModal(${JSON.stringify(c).replace(/"/g, '&quot;')})">${c.premium?'⭐':'🥩'}</div><b>${c.nombre}</b><br><button onclick="router.handleDeleteCarne('${c.id}')" style="color:red; background:none; border:none; font-size:0.6rem;">Eliminar</button></div>`).join('')}</div></div>`;
    },
    showCarneModal(c = null) {
        const m = document.createElement('div'); m.className = 'modal-full'; m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        m.innerHTML = `<div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:350px;"><h3>${c?'Editar':'Nueva'} Carne</h3><label>Nombre:</label><input type="text" id="cn-n" value="${c?c.nombre:''}" style="width:100%; padding:10px; margin-bottom:10px;"><label>ID (minúsculas):</label><input type="text" id="cn-id" value="${c?c.id:''}" ${c?'readonly':''} style="width:100%; padding:10px; margin-bottom:10px;"><label><input type="checkbox" id="cn-p" ${c?.premium?'checked':''}> Carne PREMIUM (+$)</label><br><br><button class="btn-primary" onclick="router.handleSaveCarne('${c?c.id:''}')">GUARDAR</button><button class="btn-secondary" onclick="this.closest('.modal-full').remove()">X</button></div>`;
        document.body.appendChild(m);
    },
    async handleSaveCarne(old) { const n = document.getElementById('cn-n').value; const id = document.getElementById('cn-id').value.toLowerCase(); const p = document.getElementById('cn-p').checked; if(n && id) { if(old) await db.updateCarne({id:old, nombre:n, premium:p}); else await db.addCarne({id, nombre:n, premium:p}); this.renderAdminCarnes(); document.querySelector('.modal-full').remove(); } },
    async handleDeleteCarne(id) { if(confirm("¿Eliminar?")) { await db.deleteCarne(id); this.renderAdminCarnes(); } },
    async handleToggleCarne(id) { await db.toggleCarne(id); this.renderAdminCarnes(); },

    renderHRM() {
        const content = document.getElementById('content');
        content.innerHTML = `<div style="padding:20px; height:100%;" class="scrollable-y"><div style="display:flex; justify-content:space-between; margin-bottom:20px;"><h2>Personal</h2><button class="btn-accent" onclick="router.showHRMCard()">+ NUEVO</button></div><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:15px;">${db.empleados.map(e => `<div class="admin-card" style="text-align:center;"><div style="font-size:2rem;" onclick="router.showHRMCard(${JSON.stringify(e).replace(/"/g, '&quot;')})">👤</div><b>${e.nombre}</b><br><small>${e.puesto}</small><div style="margin-top:10px;"><button class="btn-primary" style="font-size:0.7rem; background:#4CAF50;" onclick="router.handleAsistencia(${e.id}, ${e.pago_dia})">OK</button></div></div>`).join('')}</div></div>`;
    },
    showHRMCard(e = null) {
        const m = document.createElement('div'); m.className = 'modal-full'; m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        m.innerHTML = `<div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:350px;"><h3>Personal</h3><label>Nombre:</label><input type="text" id="hr-n" value="${e?e.nombre:''}" style="width:100%; padding:10px;"><br><label>PIN (4 digitos):</label><input type="password" id="hr-pin" value="${e?e.pin:''}" maxlength="4" style="width:100%; padding:10px;"><br><br><button class="btn-primary" onclick="router.handleSaveHRM(${e?e.id:'null'})">GUARDAR</button><button class="btn-secondary" onclick="this.closest('.modal-full').remove()">X</button></div>`;
        document.body.appendChild(m);
    },
    async handleSaveHRM(id) { const n = document.getElementById('hr-n').value; const pin = document.getElementById('hr-pin').value; if(n && pin) { if(id) await db.updateEmpleado(id, n, 'staff', 0, pin); else await db.addEmpleado(n, 'staff', 0, pin); this.renderHRM(); document.querySelector('.modal-full').remove(); } },

    renderCatalogo() {
        const content = document.getElementById('content');
        content.innerHTML = `<div class="pos-main-wrapper" style="height:100%;"><div style="width:200px; background:#f9f9f9; padding:10px; border-right:1px solid #ddd;"><b>Categorías</b><button class="btn-accent" onclick="router.showCategoryModal()" style="width:100%; margin-top:10px;">+</button><div id="cat-l" style="margin-top:10px;"></div></div><div style="flex:1; background:white; padding:20px; overflow-y:auto;"><h3>Productos</h3><button class="btn-primary" onclick="router.showProductCard()">+ NUEVO PRODUCTO</button><div id="prod-l" style="margin-top:20px;"></div></div></div>`;
        const cl = document.getElementById('cat-l'); cl.innerHTML = db.categorias.map(c => `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="router.refreshAdminCatalog('${c}')">${c}</div>`).join('');
        this.refreshAdminCatalog(db.categorias[0]);
    },
    refreshAdminCatalog(cat) {
        const pl = document.getElementById('prod-l'); if(!pl) return;
        const prods = db.productos.filter(p => p.categoria === cat);
        pl.innerHTML = `
            <div class="inventory-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">
                ${prods.map(p => `
                    <div class="admin-card product-item-card" style="padding:15px; display:flex; flex-direction:column; justify-content:space-between; ${p.agotado ? 'opacity:0.5;' : ''}">
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div style="font-size:0.7rem; color:#888;">#${p.id}</div>
                            <div style="position:relative;">
                                <span class="dropdown-trigger" style="cursor:pointer; font-size:1.2rem; padding:0 5px;" onclick="router.toggleProductDropdown(this)">⋮</span>
                                <div class="dropdown-content" style="display:none; position:absolute; right:0; top:20px; background:white; box-shadow:var(--shadow); border-radius:8px; z-index:100; min-width:120px;">
                                    <div style="padding:12px; cursor:pointer; border-bottom:1px solid #eee;" onclick="router.showProductCard(${JSON.stringify(p).replace(/"/g, '&quot;')})">✏️ Editar</div>
                                    <div style="padding:12px; cursor:pointer; color:red;" onclick="router.handleDeleteProduct(${p.id}, '${cat}')">🗑️ Eliminar</div>
                                </div>
                            </div>
                        </div>
                        <div style="text-align:center; margin:15px 0;">
                            <div style="font-size:1rem; font-weight:bold; height:40px; overflow:hidden;">${p.nombre.toUpperCase()}</div>
                            <div style="color:var(--primary); font-weight:900; font-size:1.4rem; margin:10px 0;">$${p.precio}</div>
                            ${p.precioSencillo > 0 ? `<div style="font-size:0.7rem; color:#666;">Sencilla: $${p.precioSencillo}</div>` : ''}
                        </div>
                        <button class="btn-secondary" style="width:100%; font-size:0.75rem; padding:10px; border-radius:10px;" onclick="router.handleToggleAgotado(${p.id}, '${cat}')">
                            ${p.agotado ? '✅ REACTIVAR' : '🚫 AGOTAR'}
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    },
    async handleToggleAgotado(id, cat) {
        await db.toggleAgotado(id);
        this.refreshAdminCatalog(cat);
    },
    showProductCard(p = null) {
        const m = document.createElement('div'); m.className = 'modal-full'; 
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        const v = p?.variantes || {};
        const isTaco = p?.categoria === 'Tacos';
        const isOrden = p?.categoria === 'Ordenes';
        
        m.innerHTML = `
            <div style="background:white; padding:25px; border-radius:25px; width:95%; max-width:450px; max-height:95vh; overflow-y:auto;" class="scrollable-y">
                <h2 style="margin-bottom:20px; text-align:center;">${p?'EDITAR':'NUEVO'} PRODUCTO</h2>
                
                <div style="display:grid; gap:15px; text-align:left; margin-bottom:20px;">
                    <div>
                        <label style="font-size:0.7rem; font-weight:bold; color:#888;">NOMBRE:</label>
                        <input type="text" id="ed-n" value="${p?p.nombre:''}" style="width:100%; padding:15px; border-radius:12px; border:1px solid #ddd;">
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div>
                            <label style="font-size:0.7rem; font-weight:bold; color:#888;">PRECIO BASE:</label>
                            <input type="number" id="ed-p" value="${p?p.precio:''}" style="width:100%; padding:15px; border-radius:12px; border:1px solid #ddd;">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:bold; color:#888;">P. SENCILLO:</label>
                            <input type="number" id="ed-ps" value="${p?p.precioSencillo||0:0}" style="width:100%; padding:15px; border-radius:12px; border:1px solid #ddd;" ${(isTaco || isOrden)?'disabled':''}>
                        </div>
                    </div>

                    ${!isTaco ? `
                    <div>
                        <label style="font-size:0.7rem; font-weight:bold; color:#888;">CATEGORÍA:</label>
                        <select id="ed-c" style="width:100%; padding:15px; border-radius:12px; border:1px solid #ddd; background:white;" onchange="router._refreshEditorVariants(this.value)">
                            ${db.categorias.map(c => `<option value="${c}" ${p?.categoria===c?'selected':''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    ` : `<input type="hidden" id="ed-c" value="Tacos">`}

                    <label style="display:flex; align-items:center; gap:12px; font-weight:bold; color:var(--primary); cursor:pointer; padding:10px 0;">
                        <input type="checkbox" id="ed-sk" ${p?.requiereCarne?'checked':''} ${isTaco?'disabled':''} 
                               style="width:22px; height:22px;"
                               onchange="document.getElementById('ed-variants-area').style.display = this.checked ? 'block' : 'none'"> 
                        REQUERIR SELECCIÓN DE CARNE
                    </label>
                </div>

                <div id="ed-variants-area" style="display:${p?.requiereCarne?'block':'none'}; background:#f8f9fa; padding:20px; border-radius:18px; margin-bottom:20px; border:1px solid #eee;">
                    <div id="ed-vars-dynamic">
                        ${isOrden ? `
                            <label style="font-size:0.7rem; font-weight:bold; color:#888;">COSTO EXTRA SI LLEVA PREMIUM (+ $):</label>
                            <input type="number" id="ed-var-premium-orden" value="${v['extra_premium'] || 30}" style="width:100%; padding:15px; border-radius:12px; border:1px solid #ddd; margin-top:5px;">
                        ` : `
                            <h4 style="margin:0 0 15px; font-size:0.8rem; letter-spacing:1px; color:#555; border-bottom:1px solid #ddd; padding-bottom:8px;">COSTOS EXTRA POR CARNE PREMIUM</h4>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                ${db.carnes.filter(c => c.premium).map(c => `
                                    <div>
                                        <label style="font-size:0.6rem; font-weight:bold; display:block; margin-bottom:4px;">${c.nombre}:</label>
                                        <input type="number" class="ed-var-meat" data-id="${c.id}" value="${v[c.id] || 0}" placeholder="+ 0" style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd;">
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                    ${p?.nombre.toLowerCase().includes('lonche') || p?.categoria === 'Especialidades' ? `
                    <div id="ed-queso-area" style="margin-top:20px; border-top:2px dashed #ddd; padding-top:15px;">
                        <label style="font-size:0.65rem; font-weight:bold; display:block; margin-bottom:4px;"> 🧀 EXTRA QUESO (+$):</label>
                        <input type="number" id="ed-var-queso" value="${v['queso'] || 0}" style="width:100%; padding:12px; border-radius:10px; border:1px solid #ddd;">
                    </div>` : '<input type="hidden" id="ed-var-queso" value="0">'}
                </div>

                <div style="display:flex; gap:12px;">
                    <button class="btn-primary" style="flex:1.5; padding:18px; font-weight:900;" onclick="router.handleSaveProduct(${p?p.id:'null'})">GUARDAR</button>
                    <button class="btn-secondary" style="flex:1; padding:18px; background:#f4f4f4; color:#666; border:none;" onclick="this.closest('.modal-full').remove()">CANCELAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    _refreshEditorVariants(cat) {
        const area = document.getElementById('ed-vars-dynamic');
        const quesoArea = document.getElementById('ed-queso-area');
        if (cat === 'Ordenes') {
            area.innerHTML = `
                <label style="font-size:0.7rem; font-weight:bold; color:#888;">COSTO EXTRA SI LLEVA PREMIUM (+ $):</label>
                <input type="number" id="ed-var-premium-orden" value="30" style="width:100%; padding:15px; border-radius:12px; border:1px solid #ddd; margin-top:5px;">
            `;
            if (quesoArea) quesoArea.style.display = 'none';
        } else {
            area.innerHTML = `
                <h4 style="margin:0 0 15px; font-size:0.8rem; letter-spacing:1px; color:#555; border-bottom:1px solid #ddd; padding-bottom:8px;">COSTOS EXTRA POR CARNE PREMIUM</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    ${db.carnes.filter(c => c.premium).map(c => `
                        <div>
                            <label style="font-size:0.6rem; font-weight:bold; display:block; margin-bottom:4px;">${c.nombre}:</label>
                            <input type="number" class="ed-var-meat" data-id="${c.id}" value="0" placeholder="+ 0" style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd;">
                        </div>
                    `).join('')}
                </div>
            `;
            if (quesoArea) quesoArea.style.display = 'block';
        }
    },

    async handleSaveProduct(id) { 
        const current = id ? db.productos.find(x => x.id === id) : null;
        const variantes = {};
        document.querySelectorAll('.ed-var-meat').forEach(input => {
            variantes[input.dataset.id] = parseFloat(input.value) || 0;
        });
        const quesoEl = document.getElementById('ed-var-queso');
        variantes['queso'] = quesoEl ? parseFloat(quesoEl.value) || 0 : 0;
        
        const ordenPremEl = document.getElementById('ed-var-premium-orden');
        if (ordenPremEl) variantes['extra_premium'] = parseFloat(ordenPremEl.value) || 0;

        const pr = { 
            id, 
            nombre: document.getElementById('ed-n').value, 
            precio: parseFloat(document.getElementById('ed-p').value), 
            precioSencillo: parseFloat(document.getElementById('ed-ps')?.value || 0) || 0,
            categoria: document.getElementById('ed-c').value, 
            requiereCarne: document.getElementById('ed-sk').checked,
            variantes: variantes,
            agotado: current ? current.agotado : false,
            stock: current ? current.stock : 0
        }; 
        if(id) await db.updateProducto(pr); else await db.addProducto(pr); 
        this.renderCatalogo(); 
        document.querySelectorAll('.modal-full').forEach(m => m.remove());
    },
    showCategoryModal() {
        const n = prompt("Nombre de la categoría:");
        if (n) { db.addCategoria(n).then(() => this.renderCatalogo()); }
    },

    renderGastos() {
        const content = document.getElementById('content');
        content.innerHTML = `<div style="padding:20px; height:100%;" class="scrollable-y"><h2>Gastos</h2><div class="admin-card"><h4>Nuevo Gasto</h4><input type="text" id="g-desc" placeholder="Concepto" style="width:100%; padding:10px; margin-bottom:10px;"><input type="number" id="g-monto" placeholder="Monto" style="width:100%; padding:10px; margin-bottom:10px;"><div style="display:flex; gap:10px;"><button class="btn-primary" onclick="router.handleGuardarGasto('pagado')">PAGAR AHORA</button><button class="btn-secondary" onclick="router.handleGuardarGasto('pendiente')">DEUDA</button></div></div><div id="gastos-l" style="margin-top:20px;">${db.gastos.map(g => `<div class="admin-card" style="margin-bottom:10px; display:flex; justify-content:space-between;"><span><b>${g.descripcion}</b><br><small>${g.fecha} ${g.estado.toUpperCase()}</small></span><b>$${g.monto}</b></div>`).reverse().join('')}</div></div>`;
    },
    async handleGuardarGasto(s) { 
        const d = document.getElementById('g-desc').value; 
        const m = parseFloat(document.getElementById('g-monto').value); 
        if(d && !isNaN(m)) { 
            await db.addGasto({ descripcion: d, monto: m, estado: s }); 
            this.renderGastos(); 
        } else {
            app.showNotification("⚠️ Complete los campos");
        }
    },

    renderConfig() {
        const content = document.getElementById('content');
        content.innerHTML = `<div style="padding:20px; height:100%;" class="scrollable-y"><h2>Configuración</h2><div class="admin-card"><label>Nombre Taquería:</label><input type="text" id="cf-n" value="${db.config.nombreTaqueria}" style="width:100%; padding:10px; margin-bottom:10px;"><label>Extra Taco Premium ($):</label><input type="number" id="cf-et" value="${db.config.extraTacoPremium}" style="width:100%; padding:10px; margin-bottom:10px;"><label>Extra Especialidad Premium ($):</label><input type="number" id="cf-ep" value="${db.config.extraEspecialidadPremium}" style="width:100%; padding:10px; margin-bottom:10px;"><label>Comisión Tarjeta %:</label><input type="number" id="cf-c" value="${db.config.comisionTarjeta}" style="width:100%; padding:10px; margin-bottom:10px;"><button class="btn-primary" style="width:100%;" onclick="router.guardarConfig()">GUARDAR CONFIGURACIÓN</button><br><br><button class="btn-secondary" onclick="router.handleRepairDB()">🛠️ REPARAR BASE DE DATOS</button></div></div>`;
    },
    async guardarConfig() { 
        db.config.nombreTaqueria = document.getElementById('cf-n').value; 
        db.config.extraTacoPremium = parseFloat(document.getElementById('cf-et').value);
        db.config.extraEspecialidadPremium = parseFloat(document.getElementById('cf-ep').value);
        db.config.comisionTarjeta = parseFloat(document.getElementById('cf-c').value); 
        await db.save(); 
        app.showNotification("Guardado ✓"); 
    },
    async handleRepairDB() { if(confirm("¿Reparar?")) { await db.repairConnection(); this.navigate('pos'); } },

    // --- EDITOR CROQUIS ---
    renderEditorCroquis() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:15px; height:100%; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h2>Constructor de Mesas</h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-accent" onclick="router.handleAddMesa('cuadrada')">+ CUADRADA</button>
                        <button class="btn-accent" onclick="router.handleAddMesa('redonda')">+ REDONDA</button>
                        <button class="btn-primary" onclick="router.navigate('mesas')">FINALIZAR</button>
                    </div>
                </div>
                <p style="font-size:0.7rem; color:#666;">Arrastra las mesas para acomodarlas. Haz click en el número para eliminar.</p>
                <div id="canvas-mesas" style="flex:1; background:#f0f0f0; border:2px dashed #ccc; position:relative; overflow:hidden; border-radius:15px;"></div>
            </div>
        `;
        db.mesas.forEach(mesa => this.renderMesaEditor(mesa, document.getElementById('canvas-mesas')));
    },
    renderMesaEditor(mesa, canvas) {
        const div = document.createElement('div');
        div.className = 'mesa-diseno';
        div.style = `position:absolute; left:${mesa.x}px; top:${mesa.y}px; width:${mesa.ancho}px; height:${mesa.alto}px; background:white; border:2px solid var(--primary); border-radius:${mesa.forma==='redonda'?'50%':'12px'}; display:flex; justify-content:center; align-items:center; cursor:move; box-shadow:var(--shadow); user-select:none;`;
        div.innerHTML = `<span style="font-weight:bold; font-size:1.2rem;">#${mesa.numero}</span>`;

        let startX, startY, initialX, initialY;
        const onStart = (e) => {
            if (e.target.tagName === 'SPAN' && confirm(`¿Eliminar mesa ${mesa.numero}?`)) {
                db.eliminarMesa(mesa.id).then(() => this.renderEditorCroquis());
                return;
            }
            startX = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX);
            startY = (e.type.includes('touch') ? e.touches[0].clientY : e.clientY);
            initialX = mesa.x; initialY = mesa.y;
            const moveHandler = (me) => onMove(me);
            const endHandler = () => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', endHandler);
                window.removeEventListener('touchmove', moveHandler);
                window.removeEventListener('touchend', endHandler);
                db.updateMesa(mesa.id, {x: mesa.x, y: mesa.y});
            };
            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', endHandler);
            window.addEventListener('touchmove', moveHandler);
            window.addEventListener('touchend', endHandler);
        };
        const onMove = (e) => {
            const x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX);
            const y = (e.type.includes('touch') ? e.touches[0].clientY : e.clientY);
            mesa.x = Math.max(0, initialX + (x - startX));
            mesa.y = Math.max(0, initialY + (y - startY));
            div.style.left = mesa.x + 'px'; div.style.top = mesa.y + 'px';
        };
        div.addEventListener('mousedown', onStart);
        div.addEventListener('touchstart', onStart);
        canvas.appendChild(div);
    },
    async handleAddMesa(f) { await db.addMesa({ forma: f }); this.renderEditorCroquis(); },

    renderDispositivos() { 
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:20px;">
                <h2>📱 Dispositivos y Red</h2>
                <div class="admin-card">
                    <p><b>ID de este equipo:</b><br><span style="font-family:monospace; font-size:1.2rem;">${db.config.deviceId}</span></p>
                    <p><b>Rol Actual:</b> ${sync.role.toUpperCase()}</p>
                    <p><b>Estado:</b> <span id="sync-status-detail">${sync.serverIP ? 'Conectado a ' + sync.serverIP : 'Modo Servidor (Caja)'}</span></p>
                </div>
                ${sync.role === 'mesero' ? `<button class="btn-primary" onclick="sync.showDiscovery()">🔄 BUSCAR CAJA NUEVAMENTE</button>` : ''}
            </div>
        `;
    },
    async handleToggleCarne(id) { await db.toggleCarne(id); this.renderAdminCarnes(); },

    async handleDeleteProduct(id, cat) {
        if (confirm("¿Estás seguro de eliminar este producto definitivamente?")) {
            await db.deleteProducto(id);
            this.refreshAdminCatalog(cat);
            app.showNotification("🗑️ Producto eliminado");
        }
    },

    toggleProductDropdown(el) {
        const isOpen = el.nextElementSibling.style.display === 'block';
        // Cerrar todos los demás primero
        document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
        // Abrir el actual si estaba cerrado
        if (!isOpen) el.nextElementSibling.style.display = 'block';
    }
    };

// Listener global para cerrar dropdowns al hacer click fuera
document.addEventListener('click', (e) => {
    if (!e.target.matches('.dropdown-trigger')) {
        document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
    }
});
