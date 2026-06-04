/**
 * router.js - Gestión de Navegación y Vistas Dinámicas
 */
const router = {
    currentCategory: 'Tacos',
    sidebarActive: false,
    orderType: 'llevar', // Predeterminado para cajera
    currentMesa: null,
    cliente: { nombre: '', tel: '', dir: '', zona: null },
    ordenActual: { platos: [{ items: [], sinCebolla: false, sinCilantro: false, notas: '' }] },
    currentPlatoIdx: 0,

    currentUser: null,

    navigate(view) {
        this.closeSidebar();
        const content = document.getElementById('content');
        content.innerHTML = '';
        content.dataset.view = view;
        
        // Si no hay usuario logueado y no es la pantalla de login, forzar login
        if (!this.currentUser && view !== 'login') {
            this.renderLogin();
            return;
        }

        // Restricción: Solo admin puede ver Dashboard e Informes
        const adminViews = ['admin_dashboard', 'admin_informes', 'admin_hrm', 'config'];
        if (adminViews.includes(view) && this.currentUser.puesto !== 'admin') {
            app.showNotification("🚫 Acceso restringido solo para Administrador");
            this.navigate('pos');
            return;
        }

        // Permitir a cajero entrar a gastos
        if (view === 'admin_gastos' && !['admin', 'cajero'].includes(this.currentUser.puesto)) {
             app.showNotification("🚫 Acceso restringido");
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

    _isAuthorized: false,
    _pinCallback: null,
    _pinBuffer: '',

    askForPin(level, callback) {
        this._pinCallback = callback;
        this._pinBuffer = '';
        
        const m = document.createElement('div');
        m.className = 'modal-full';
        m.id = 'pin-modal';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:flex; justify-content:center; align-items:center; z-index:30000;";
        m.innerHTML = `
            <div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:320px; text-align:center;">
                <div style="font-size:3rem; margin-bottom:10px;">🔒</div>
                <h3 style="margin-bottom:20px;">PIN DE SEGURIDAD</h3>
                <input type="password" id="pin-input" readonly style="width:100%; padding:15px; font-size:2rem; text-align:center; border:2px solid #ddd; border-radius:10px; margin-bottom:20px; letter-spacing:10px;">
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;" id="numpad">
                    ${[1,2,3,4,5,6,7,8,9,'C',0].map(n => `
                        <button class="btn-secondary" style="padding:15px; font-size:1.2rem; font-weight:bold; border-radius:10px;" onclick="router._handlePinKey('${n}', '${level}')">${n}</button>
                    `).join('')}
                    <button class="btn-secondary" style="padding:15px; font-size:0.8rem; font-weight:bold; border-radius:10px; color:red;" onclick="document.getElementById('pin-modal').remove()">CANCELAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    _handlePinKey(key, level) {
        const input = document.getElementById('pin-input');
        if (key === 'C') {
            this._pinBuffer = '';
        } else {
            if (this._pinBuffer.length < 4) this._pinBuffer += key;
            
            // Auto-validación al 4to dígito
            if (this._pinBuffer.length === 4) {
                if (db.verificarPin(this._pinBuffer, level)) {
                    setTimeout(() => {
                        const modal = document.getElementById('pin-modal');
                        if (modal) modal.remove();
                        if (this._pinCallback) this._pinCallback();
                        this._pinCallback = null;
                    }, 200);
                } else {
                    app.showNotification("❌ PIN INCORRECTO");
                    this._pinBuffer = '';
                }
            }
        }
        if (input) input.value = this._pinBuffer.replace(/./g, '*');
    },

    // --- LOGIN ---
    renderLogin() {
        const content = document.getElementById('content');
        
        content.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="user-avatar">👤</div>
                    <h2 style="margin-bottom:5px;">Acceso Personal</h2>
                    <p style="font-size:0.8rem; color:#666; margin-bottom:25px;">Ingresa tus credenciales</p>
                    
                    <div style="text-align:left;">
                        <label style="font-size:0.8rem; font-weight:bold; color:#444;">USUARIO:</label>
                        <input type="text" id="login-user" placeholder="Nombre de usuario" 
                               style="width:100%; padding:15px; border:2px solid #eee; border-radius:12px; margin-bottom:15px; font-size:1rem; outline:none; transition:border-color 0.3s;">
                        
                        <label style="font-size:0.8rem; font-weight:bold; color:#444;">PIN:</label>
                        <input type="password" id="login-pin-direct" placeholder="••••" maxlength="6"
                               style="width:100%; padding:15px; border:2px solid #eee; border-radius:12px; margin-bottom:20px; font-size:1.5rem; text-align:center; letter-spacing:5px; outline:none;">
                        
                        <button class="btn-primary" style="width:100%; padding:15px; font-size:1.1rem; border-radius:12px;" onclick="router.handleLoginDirect()">INGRESAR</button>
                    </div>

                    <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eee;">
                        <button class="btn-secondary" style="width:100%; border:none; font-size:0.85rem; color:var(--primary); font-weight:bold;" 
                                onclick="app.renderActivation()">⚙️ ACTIVAR ADMINISTRADOR</button>
                    </div>
                </div>
            </div>
        `;
        
        // Enfocar usuario al cargar
        setTimeout(() => {
            const el = document.getElementById('login-user');
            if (el) el.focus();
        }, 300);
    },

    async handleLoginDirect() {
        const userStr = document.getElementById('login-user').value.trim();
        const pinStr = document.getElementById('login-pin-direct').value;

        if (!userStr || !pinStr) {
            app.showNotification("⚠️ Completa todos los campos");
            return;
        }

        // Acceso Maestro para el Dueño (si no hay usuarios o para mantenimiento)
        if (userStr.toLowerCase() === 'admin' && pinStr === db.config.pin) {
            this.currentUser = { id: 0, nombre: 'Dueño Maestro', puesto: 'admin', activo: 1 };
            app.showNotification("Bienvenido, Administrador");
            this.navigate('pos');
            return;
        }

        const user = db.empleados.find(e => e.nombre.toLowerCase() === userStr.toLowerCase() && e.pin === pinStr);
        
        if (user) {
            this.currentUser = user;
            app.showNotification(`Bienvenido, ${user.nombre}`);
            this.navigate('pos');
        } else {
            app.showNotification("❌ Usuario o PIN incorrecto");
            const card = document.querySelector('.login-card');
            if (card) {
                card.style.animation = 'shake 0.4s';
                setTimeout(() => card.style.animation = '', 400);
            }
        }
    },

    renderPOS() {
        if (!db.turnoActual && sync.role === 'caja') {
            this.navigate('caja');
            app.showNotification("⚠️ Debe abrir caja antes de vender");
            return;
        }

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="user-header">
                <span>👤 ${this.currentUser ? this.currentUser.nombre : 'Invitado'} (${this.currentUser ? this.currentUser.puesto.toUpperCase() : ''})</span>
                <span id="pos-mesa-info">${this.currentMesa ? 'MESA #' + this.currentMesa.numero : this.orderType.toUpperCase()}</span>
            </div>
            
            <div class="category-carousel" id="category-carousel"></div>
            
            <div class="pos-container" id="pos-container">
                <div class="catalog-side">
                    <div class="products-grid scrollable-y" id="products-grid"></div>
                    
                    <div class="quick-actions-bar" id="quick-actions">
                        <button class="btn-quick" id="qa-ceb" onclick="router.toggleQuickSwitch('sinCebolla')">S/ CEBOLLA</button>
                        <button class="btn-quick" id="qa-cil" onclick="router.toggleQuickSwitch('sinCilantro')">S/ CILANTRO</button>
                        <button class="btn-quick" id="qa-ver" onclick="router.toggleQuickSwitch('sinVerdura')">S/ VERDURA</button>
                    </div>
                </div>
                
                <div class="order-side" id="order-side"></div>
            </div>

            <div class="floating-actions">
                <div class="btn-float add-plato" onclick="router.nuevoPlato()">🍽️+</div>
                <div class="btn-float cart" onclick="router.toggleMobileOrder()" id="cart-float-btn">🛒</div>
            </div>
        `;
        
        this.renderCategories();
        this.renderProducts();
        this.renderOrderPanel();
        this.updateQuickActionsUI();
    },

    renderCategories() {
        const container = document.getElementById('category-carousel');
        if (!container) return;
        container.innerHTML = db.categorias.map(cat => `
            <div class="category-card ${this.currentCategory === cat ? 'active' : ''}" 
                 onclick="router.selectCategory('${cat}')">
                <div style="font-size:1.2rem; margin-bottom:5px;">${cat === 'Tacos' ? '🌮' : (cat === 'Bebidas' ? '🥤' : '✨')}</div>
                ${cat.toUpperCase()}
            </div>
        `).join('');
    },

    selectCategory(cat) {
        this.currentCategory = cat;
        this.renderCategories();
        this.renderProducts();
    },

    toggleQuickSwitch(field) {
        const plato = this.ordenActual.platos[this.currentPlatoIdx];
        plato[field] = !plato[field];
        this.updateQuickActionsUI();
        this.refreshOrderList();
    },

    updateQuickActionsUI() {
        const plato = this.ordenActual.platos[this.currentPlatoIdx];
        if (!plato) return;
        document.getElementById('qa-ceb').classList.toggle('active', plato.sinCebolla);
        document.getElementById('qa-cil').classList.toggle('active', plato.sinCilantro);
        document.getElementById('qa-ver').classList.toggle('active', plato.sinVerdura);
    },

    _lastClickTime: 0,
    _lastProdId: null,

    addToOrder(prod) {
        const now = Date.now();
        const isDoubleClick = (now - this._lastClickTime < 300) && (this._lastProdId === prod.id);
        
        this._lastClickTime = now;
        this._lastProdId = prod.id;

        if (prod.requiereCarne) {
            this.showMeatSelector(prod);
        } else {
            this._addItemToOrder(prod);
        }
    },

    // --- POS (Punto de Venta) ---

    renderOrderPanel() {
        const container = document.getElementById('order-side');
        if (!container) return;
        const isUpdate = !!this.ordenActual.id;
        
        container.innerHTML = `
            <div style="padding:8px; background:#eee; display:flex; gap:4px; flex-shrink:0;">
                <button class="btn-type ${this.orderType==='mesa'?'active':''}" onclick="router.setOrderType('mesa')" style="padding:6px; font-size:0.75rem;">Mesa</button>
                <button class="btn-type ${this.orderType==='llevar'?'active':''}" onclick="router.setOrderType('llevar')" style="padding:6px; font-size:0.75rem;">Llevar</button>
                <button class="btn-type ${this.orderType==='domicilio'?'active':''}" onclick="router.setOrderType('domicilio')" style="padding:6px; font-size:0.75rem;">🛵 Dom</button>
            </div>
            <div id="cliente-data" style="padding:10px; background:white; border-bottom:1px solid #ddd; ${this.orderType!=='domicilio'?'display:none':''}">
                <input type="text" id="cli-nom" placeholder="Dirección / Referencia" style="width:100%; margin-bottom:5px; padding:10px; border-radius:8px; border:1px solid #ccc;" value="${this.cliente.nombre}" onchange="router.cliente.nombre=this.value">
                <input type="text" id="cli-tel" placeholder="Teléfono" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc;" value="${this.cliente.tel}" onchange="router.cliente.tel=this.value">
            </div>
            <div style="padding:10px; background:var(--primary); color:white; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem;">${this.orderType.toUpperCase()} ${this.currentMesa ? '#'+this.currentMesa.numero : ''}</span>
                <button class="btn-accent" onclick="router.nuevoPlato()" style="padding:4px 10px;">+ Plato</button>
            </div>
            <div id="platos-lista" class="scrollable-y" style="flex:1;"></div>
            <div style="padding:15px; border-top:1px solid #ddd; background:#f9f9f9;">
                <div id="order-total" style="font-size:1.4rem; font-weight:bold; text-align:right; margin-bottom:10px;">Total: $0</div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary" style="flex:2; padding:12px;" onclick="router.enviarOrden()">${isUpdate?'EXTRAS':'ENVIAR'}</button>
                    ${isUpdate ? `<button class="btn-secondary" style="flex:1; color:var(--accent); border-color:var(--accent);" onclick="router.pedirCuentaMesa()">📄</button>` : ''}
                </div>
            </div>
            <div id="pos-mobile-toggle" onclick="router.toggleMobileOrder()">🛒</div>
        `;
        this.refreshOrderList();
    },

    _lastClickTime: 0,
    _lastProdId: null,

    addToOrder(prod) {
        const now = Date.now();
        const isDoubleClick = (now - this._lastClickTime < 350) && (this._lastProdId === prod.id);
        
        this._lastClickTime = now;
        this._lastProdId = prod.id;

        if (isDoubleClick) {
            // Ya se agregó uno por el primer click, agregamos el segundo rápido
            this._addItemToOrder(prod, this._lastCarneId || null, this._lastIsPremium || false);
            return;
        }

        if (prod.requiereCarne) {
            this.showMeatSelector(prod);
        } else {
            this._addItemToOrder(prod);
        }
    },

    _addItemToOrder(prod, carneId = null, isPremium = false) {
        this._lastCarneId = carneId; // Guardar para doble toque
        this._lastIsPremium = isPremium;
        const plato = this.ordenActual.platos[this.currentPlatoIdx];
        const conQueso = document.getElementById('lonche-q')?.checked || this._loncheQueso || false;
        
        const item = { ...prod, id: prod.id, cantidad: 1, notas: '', carneId, conQueso, isPremiumMeat: isPremium };
        
        const existing = plato.items.find(i => i.id === prod.id && i.carneId === carneId && i.conQueso === conQueso);
        if (existing) {
            existing.cantidad++;
        } else {
            plato.items.push(item);
        }

        const modal = document.getElementById('meat-modal');
        if (modal) modal.remove();

        this.refreshOrderList();
        this.updateQuickActionsUI(); // Refrescar botones S/Ceb etc.
        app.showNotification(`+ ${prod.nombre} ${carneId ? '('+carneId+')' : ''}`);
    },

    eliminarPlatoActual() {
        if (this.ordenActual.platos.length > 1) {
            this.ordenActual.platos.splice(this.currentPlatoIdx, 1);
            this.currentPlatoIdx = Math.max(0, this.currentPlatoIdx - 1);
            this.renderOrderPanel();
        } else {
            this.ordenActual.platos[0].items = [];
            this.ordenActual.platos[0].sinCebolla = false;
            this.ordenActual.platos[0].sinCilantro = false;
            this.ordenActual.platos[0].sinVerdura = false;
            this.refreshOrderList();
        }
    },

    eliminarItem(idxItem) {
        const item = this.ordenActual.platos[this.currentPlatoIdx].items[idxItem];
        const action = async () => {
            this.ordenActual.platos[this.currentPlatoIdx].items.splice(idxItem, 1);
            if (this.ordenActual.id) {
                await db.addLog('ELIMINACIÓN ITEM', `Pedido: ${this.ordenActual.id}, Item: ${item.nombre}, Cant: ${item.cantidad}`);
            }
            this.refreshOrderList();
        };

        if (this.ordenActual.id) {
            this.askForPin('admin', action);
        } else {
            action();
        }
    },

    refreshOrderList() {
        const container = document.getElementById('platos-lista');
        if (!container) return;
        container.innerHTML = this.ordenActual.platos.map((pl, idx) => `
            <div class="plato-card ${idx === this.currentPlatoIdx ? 'active' : ''}" onclick="router.selectPlato(${idx})">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:8px;">
                    <b>PLATO ${idx + 1}</b>
                    <span style="color:red; font-size:1.1rem; cursor:pointer;" onclick="event.stopPropagation(); router.eliminarPlatoEspecifico(${idx})">🗑️</span>
                </div>
                
                ${pl.items.map((it, i) => `
                    <div style="display:flex; justify-content:space-between; font-size:0.9rem; padding:6px 0; border-bottom:1px solid #eee;">
                        <span><b>${it.cantidad}x</b> ${it.nombre} <small style="color:#777;">${it.carneId ? it.carneId.toUpperCase() : ''} ${it.conQueso ? '+Q' : ''}</small></span>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <span>$${(it.precio * it.cantidad).toFixed(2)}</span>
                            <span style="color:red; font-size:1.2rem; cursor:pointer;" onclick="event.stopPropagation(); router.eliminarItem(${i})">×</span>
                        </div>
                    </div>
                `).join('')}

                <div class="plato-switches">
                    <button class="toggle-btn ${pl.sinCebolla ? 'active' : ''}" onclick="event.stopPropagation(); router.toggleSwitch(${idx}, 'sinCebolla')">S/ Ceb</button>
                    <button class="toggle-btn ${pl.sinCilantro ? 'active' : ''}" onclick="event.stopPropagation(); router.toggleSwitch(${idx}, 'sinCilantro')">S/ Cil</button>
                    <button class="toggle-btn ${pl.sinVerdura ? 'active' : ''}" onclick="event.stopPropagation(); router.toggleSwitch(${idx}, 'sinVerdura')">S/ Ver</button>
                </div>

                <input type="text" class="plato-nota" placeholder="Nota (ej: Bien dorado, sin salsa...)" 
                       value="${pl.notas || ''}" 
                       onclick="event.stopPropagation()"
                       oninput="router.updatePlatoNota(${idx}, this.value)">
            </div>
        `).join('');
        this.updateTotal();
    },

    selectPlato(idx) { 
        this.currentPlatoIdx = idx; 
        // Solo refrescamos la lista para mostrar el estado activo, no todo el panel
        const cards = document.querySelectorAll('.plato-card');
        cards.forEach((c, i) => c.classList.toggle('active', i === idx));
    },

    updatePlatoNota(idx, val) {
        this.ordenActual.platos[idx].notas = val;
    },

    eliminarPlatoEspecifico(idx) {
        const action = async () => {
            if (this.ordenActual.platos.length > 1) {
                this.ordenActual.platos.splice(idx, 1);
                this.currentPlatoIdx = Math.max(0, this.currentPlatoIdx - 1);
                if (this.ordenActual.id) {
                    await db.addLog('ELIMINACIÓN PLATO', `Pedido: ${this.ordenActual.id}, Index: ${idx}`);
                }
                this.renderOrderPanel();
            } else {
                this.ordenActual.platos[0].items = [];
                this.ordenActual.platos[0].sinCebolla = false;
                this.ordenActual.platos[0].sinCilantro = false;
                this.ordenActual.platos[0].sinVerdura = false;
                this.ordenActual.platos[0].notas = '';
                this.refreshOrderList();
            }
        };

        if (this.ordenActual.id) {
            this.askForPin('admin', action);
        } else {
            action();
        }
    },

    nuevoPlato() { 
        this.ordenActual.platos.push({ items: [], sinCebolla: false, sinCilantro: false, sinVerdura: false, notas: '' }); 
        this.currentPlatoIdx = this.ordenActual.platos.length - 1; 
        this.renderOrderPanel(); 
    },

    toggleSwitch(idx, field) { 
        this.ordenActual.platos[idx][field] = !this.ordenActual.platos[idx][field]; 
        this.refreshOrderList(); 
    },
    setOrderType(type) { 
        this.orderType = type; 
        if(type==='mesa' && !this.currentMesa) { this.navigate('mesas'); return; } 
        this.renderOrderPanel(); 
    },
    toggleMobileOrder() { 
        const side = document.getElementById('order-side'); 
        side.classList.toggle('mobile-active'); 
        document.getElementById('pos-mobile-toggle').innerText = side.classList.contains('mobile-active') ? '❌' : '🛒'; 
    },

    updateTotal() {
        // Enviar orden ficticia a db.calcularTotal para obtener precio real con reglas de negocio
        const total = db.calcularTotal({ ...this.ordenActual, cliente: this.cliente });
        const el = document.getElementById('order-total');
        if (el) el.innerText = `Total: $${total.toFixed(2)}`;
    },

    async enviarOrden() {
        if (this.ordenActual.platos.every(p => p.items.length === 0)) { app.showNotification("Vacío"); return; }
        
        const isUpdate = !!this.ordenActual.id;
        const pedidoAnterior = isUpdate ? db.pedidosActivos.find(p => p.id === this.ordenActual.id) : null;
        
        const pedido = {
            id: this.ordenActual.id || Date.now(),
            tipo: this.orderType,
            mesaId: this.currentMesa ? this.currentMesa.id : null,
            mesaNumero: this.currentMesa ? this.currentMesa.numero : null,
            cliente: { ...this.cliente },
            platos: JSON.parse(JSON.stringify(this.ordenActual.platos)),
            estado: 'pendiente'
        };

        // Identificar qué hay de nuevo para la comanda de cocina
        let comandaNuevos = JSON.parse(JSON.stringify(pedido));
        if (isUpdate && pedidoAnterior) {
            // Filtrar ítems que ya estaban para no re-imprimir lo que ya se está cocinando
            // Esta es una simplificación: marcamos platos/items nuevos. 
            // En un sistema real más complejo, compararíamos cantidades.
            comandaNuevos.esExtra = true;
        }
        
        await db.guardarPedido(pedido);
        await sync.enviarOrdenACaja(pedido);
        
        // Impresión de Comanda (Cocina)
        if (sync.role === 'caja') {
            const debeImprimir = !isUpdate || (isUpdate && db.config.imprimirExtras);
            if (debeImprimir) {
                await printer.printOrder(comandaNuevos);
            }
            if (pedido.tipo !== 'mesa') {
                await printer.printBill(pedido);
            }
        } else {
            // El mesero envía a la caja, y la caja (como servidor) debería imprimir.
            // Si el mesero tiene conexión directa a impresora, se podría hacer aquí.
        }

        app.showNotification(isUpdate ? "Extras agregados" : "Orden enviada");
        this.resetPOS();
        this.navigate('pos');
    },

    resetPOS() {
        this.ordenActual = { platos: [{ items: [], sinCebolla: false, sinCilantro: false, sinVerdura: false, notas: '' }] };
        this.cliente = { nombre: '', tel: '', dir: '', zona: null };
        this.currentMesa = null;
        this.currentPlatoIdx = 0;
        this.orderType = sync.role === 'caja' ? 'llevar' : 'mesa';
    },

    renderMesas() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:15px; height:100%; display:flex; flex-direction:column; background:#eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h2 style="color:var(--primary); margin:0;">📍 Mesas Disponibles</h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-secondary" style="font-size:0.8rem; padding:8px 15px;" onclick="router.navigate('admin_croquis')">✏️ Mapa</button>
                    </div>
                </div>
                <div style="flex:1; position:relative; background:white; border-radius:20px; overflow:auto; box-shadow: inset 0 2px 10px rgba(0,0,0,0.05);" id="mapa-mesas" class="scrollable-y"></div>
                <div style="padding:15px; display:flex; gap:20px; justify-content:center; font-size:0.8rem; font-weight:bold;">
                    <span style="display:flex; align-items:center; gap:5px;"><div style="width:12px; height:12px; background:white; border:1px solid #ddd; border-radius:3px;"></div> Libre</span>
                    <span style="display:flex; align-items:center; gap:5px;"><div style="width:12px; height:12px; background:var(--primary); border-radius:3px;"></div> Ocupada</span>
                    <span style="display:flex; align-items:center; gap:5px;"><div style="width:12px; height:12px; background:var(--accent); border-radius:3px;"></div> Cuenta Pedida</span>
                </div>
            </div>
        `;
        const container = document.getElementById('mapa-mesas');
        db.mesas.forEach(mesa => {
            const pedido = db.pedidosActivos.find(p => p.mesaId === mesa.id);
            let color = 'white'; let textColor = 'black'; let border = '1px solid #ddd';
            
            if (pedido) { 
                color = pedido.estado === 'cuenta_pedida' ? 'var(--accent)' : 'var(--primary)'; 
                textColor = 'white'; 
                border = 'none';
            }

            const div = document.createElement('div');
            div.style = `position:absolute; left:${mesa.x}px; top:${mesa.y}px; width:${mesa.ancho}px; height:${mesa.alto}px; background:${color}; color:${textColor}; border-radius:${mesa.forma==='redonda'?'50%':'12px'}; display:flex; flex-direction:column; justify-content:center; align-items:center; font-weight:bold; box-shadow:var(--shadow); cursor:pointer; border:${border}; transition: transform 0.2s;`;
            
            div.innerHTML = `
                <span style="font-size:1.2rem;">${mesa.numero}</span>
                ${pedido ? `<span style="font-size:0.6rem; margin-top:2px;">$${db.calcularTotal(pedido).toFixed(0)}</span>` : ''}
            `;

            div.onclick = () => {
                this.currentMesa = mesa; 
                this.orderType = 'mesa';
                if (pedido) { 
                    this.ordenActual = JSON.parse(JSON.stringify(pedido)); 
                    this.currentPlatoIdx = this.ordenActual.platos.length - 1; 
                } else { 
                    this.ordenActual = { platos: [{ items: [], sinCebolla: false, sinCilantro: false, sinVerdura: false, notas: '' }] }; 
                    this.currentPlatoIdx = 0; 
                }
                this.navigate('pos');
            };
            container.appendChild(div);
        });
    },

    // Mejoras en el panel de pedido para Meseros
    pedirCuentaMesa() {
        if (!this.ordenActual.id) return;
        if (confirm("¿Solicitar cuenta para esta mesa?")) {
            this.ordenActual.estado = 'cuenta_pedida';
            this.enviarOrden(); // Re-enviar para actualizar estado
        }
    },

    // --- CAJA ---
    renderCaja() {
        const content = document.getElementById('content');
        if (!db.turnoActual) {
            content.innerHTML = `<div style="padding:40px; text-align:center;"><h2>Caja Cerrada</h2><input type="number" id="ini-c" placeholder="$ Efectivo inicial" style="padding:12px; border-radius:10px; margin-bottom:10px; width:200px; text-align:center;"><br><button class="btn-primary" onclick="router.handleAbrirCaja(document.getElementById('ini-c').value)">ABRIR CAJA</button></div>`;
            return;
        }
        
        const mesas = db.pedidosActivos.filter(p => p.tipo === 'mesa');
        const otros = db.pedidosActivos.filter(p => p.tipo !== 'mesa');
        const t = db.turnoActual;
        const efectivoActual = (t.inicioCaja + t.ventas - t.gastos - (t.retiros || 0));
        const mostrarAlerta = efectivoActual >= 2000;

        content.innerHTML = `
            <div style="padding:15px; height:100%; display:flex; flex-direction:column;" class="scrollable-y">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h2 style="color:var(--primary); margin:0;">Caja</h2>
                    <button class="btn-accent" style="padding:8px 15px;" onclick="router.askForPin('admin', () => router.showRetiroModal())">💸 RETIRO SEGURIDAD</button>
                </div>

                ${mostrarAlerta ? `
                    <div style="background:#ff5252; color:white; padding:15px; border-radius:10px; margin-bottom:15px; font-weight:bold; text-align:center; animation: pulse 2s infinite;">
                        ⚠️ EXCESO DE EFECTIVO ($${efectivoActual.toFixed(2)})<br>
                        REALICE RETIRO PARCIAL
                    </div>
                ` : ''}

                ${this.currentUser.puesto === 'admin' ? `
                <div style="background:#fff9f0; padding:12px; border-radius:10px; margin-bottom:15px; border:1px solid #ffe0b2; display:flex; justify-content:space-between;">
                    <div>En Caja: <b>$${efectivoActual.toFixed(2)}</b></div>
                    <div style="color:#e65100;">Retiros: <b>-$${(t.retiros || 0).toFixed(2)}</b></div>
                </div>
                ` : ''}
                
                <h3 style="font-size:1rem; border-bottom:2px solid var(--primary); padding-bottom:5px;">🏠 EN MESAS</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px; margin-bottom:20px;">
                    ${mesas.map(p => this.renderPedidoCajaCard(p)).join('')}
                </div>

                <h3 style="font-size:1rem; border-bottom:2px solid var(--accent); padding-bottom:5px;">🛵 LLEVAR / DOMICILIO</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px;">
                    ${otros.map(p => this.renderPedidoCajaCard(p)).join('')}
                </div>
                
                <button class="btn-primary" style="margin-top:30px; background:#333;" onclick="router.askForPin('admin', () => router.cerrarCajaModal())">REALIZAR CORTE FINAL</button>
            </div>
        `;
    },

    async renderLogs() {
        const content = document.getElementById('content');
        const res = await db.query("SELECT * FROM logs_auditoria ORDER BY id DESC LIMIT 200");
        const logs = res.values || [];

        content.innerHTML = `
            <div style="padding:20px; height:100%;" class="scrollable-y">
                <h2 style="color:var(--primary); margin-bottom:20px; font-weight:900;">Auditoría de Sistema</h2>
                
                <div class="admin-card" style="padding:0; overflow:hidden;">
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                            <thead style="background:#f8f9fa; border-bottom:2px solid #eee;">
                                <tr>
                                    <th style="padding:15px; text-align:left; color:#888;">FECHA/HORA</th>
                                    <th style="padding:15px; text-align:left; color:#888;">USUARIO</th>
                                    <th style="padding:15px; text-align:left; color:#888;">ACCIÓN</th>
                                    <th style="padding:15px; text-align:right; color:#888;">DETALLES</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.map(l => `
                                    <tr style="border-bottom:1px solid #f0f0f0;">
                                        <td style="padding:15px; color:#666; line-height:1.2;">${l.fecha}<br><small>${l.hora}</small></td>
                                        <td style="padding:15px;"><b>${l.usuario}</b></td>
                                        <td style="padding:15px;"><span style="background:#fff0f0; color:var(--primary); padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.7rem;">${l.accion}</span></td>
                                        <td style="padding:15px; text-align:right; max-width:200px; color:#555;">${l.detalles}</td>
                                    </tr>
                                `).join('')}
                                ${logs.length === 0 ? '<tr><td colspan="4" style="padding:40px; text-align:center; color:#999;">Sin registros aún</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderPedidoCajaCard(p) {
        return `
            <div style="background:white; padding:15px; border-radius:var(--radius); box-shadow:var(--shadow); border-left:6px solid ${p.estado==='cuenta_pedida'?'var(--accent)':'#ccc'};">
                <div style="font-weight:bold; font-size:0.85rem;">${p.tipo==='mesa'?'Mesa '+p.mesaNumero:p.cliente.nombre}</div>
                <div style="font-size:1.1rem; font-weight:bold; color:var(--primary);">$${db.calcularTotal(p).toFixed(2)}</div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn-secondary" style="flex:1;" onclick="printer.printBill(db.pedidosActivos.find(x=>x.id===${p.id}))">📄</button>
                    <button class="btn-primary" style="flex:2; background:#4CAF50;" onclick="router.showPaymentModal(${p.id})">COBRAR</button>
                </div>
            </div>
        `;
    },

    showRetiroModal() {
        const m = prompt("Monto a retirar (Billetes grandes):");
        if (m) {
            db.registrarRetiro(parseFloat(m), "Retiro de seguridad (Billetes 500)");
            app.showNotification("Retiro registrado");
            this.renderCaja();
        }
    },

    async handleAbrirCaja(m) { 
        if(m) { 
            this.askForPin('staff', async () => {
                await db.abrirTurno(m); 
                this.renderCaja(); 
            });
        } 
    },

    showPaymentModal(id) {
        const p = db.pedidosActivos.find(x => x.id === id);
        const t = db.calcularTotal(p);
        const tc = db.calcularTotal(p, true);
        const m = document.createElement('div');
        m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        m.innerHTML = `<div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:400px; text-align:center;"><h3>Total: $${t.toFixed(2)}</h3><div style="display:grid; gap:12px; margin-top:20px;"><button class="btn-primary" style="background:#4CAF50;" onclick="router.handleCobro(${id}, 'efectivo')">Efectivo</button><button class="btn-primary" style="background:#2196F3;" onclick="router.handleCobro(${id}, 'transferencia')">Transferencia</button><button class="btn-primary" style="background:#9C27B0;" onclick="router.handleCobro(${id}, 'tarjeta')">Tarjeta ($${tc.toFixed(2)})</button></div><button class="btn-secondary" style="width:100%; margin-top:20px; border:none;" onclick="this.parentElement.parentElement.remove()">Cancelar</button></div>`;
        document.body.appendChild(m);
    },

    async handleCobro(id, m) { await db.cobrarPedido(id, m); document.querySelector('.modal-full').remove(); this.renderCaja(); },
    
    async cerrarCajaModal() {
        const m = document.createElement('div');
        m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:20000; padding:20px;";
        m.innerHTML = `
            <div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:400px; text-align:center;">
                <h2 style="color:var(--primary);">Cerrar Turno</h2>
                <p style="margin-bottom:20px;">¿Estás seguro que deseas terminar el día?</p>
                
                <label style="display:block; text-align:left; font-weight:bold; margin-bottom:5px;">Efectivo Físico en Caja:</label>
                <input type="number" id="corte-monto" placeholder="$0.00" style="width:100%; padding:15px; border-radius:10px; border:1px solid #ddd; font-size:1.2rem; text-align:center; margin-bottom:30px;">
                
                <div id="slider-container" style="position:relative; width:100%; height:60px; background:#eee; border-radius:30px; overflow:hidden; border:1px solid #ddd;">
                    <div id="slider-text" style="position:absolute; width:100%; height:100%; display:flex; justify-content:center; align-items:center; color:#666; font-weight:bold; pointer-events:none;">DESLIZAR PARA CERRAR >>></div>
                    <div id="slider-handle" style="position:absolute; left:0; top:0; width:60px; height:60px; background:var(--primary); border-radius:50%; cursor:pointer; display:flex; justify-content:center; align-items:center; color:white; font-size:1.5rem; transition: left 0.1s;">➔</div>
                </div>
                
                <button class="btn-secondary" style="width:100%; margin-top:20px; border:none;" onclick="this.parentElement.parentElement.remove()">CANCELAR</button>
            </div>
        `;
        document.body.appendChild(m);

        // Lógica de Slider Simple (Simulada para touch/mouse)
        const handle = m.querySelector('#slider-handle');
        const container = m.querySelector('#slider-container');
        const text = m.querySelector('#slider-text');
        let isDragging = false;
        let startX = 0;

        const onStart = (e) => { isDragging = true; startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; handle.style.transition = 'none'; };
        const onMove = (e) => {
            if (!isDragging) return;
            const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            let diff = x - startX;
            const max = container.offsetWidth - handle.offsetWidth;
            if (diff < 0) diff = 0;
            if (diff > max) diff = max;
            handle.style.left = diff + 'px';
            text.style.opacity = 1 - (diff / max);
            if (diff >= max) finishCorte();
        };
        const onEnd = () => { if (!isDragging) return; isDragging = false; const max = container.offsetWidth - handle.offsetWidth; if (parseInt(handle.style.left) < max) { handle.style.transition = 'left 0.3s'; handle.style.left = '0px'; text.style.opacity = '1'; } };

        handle.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        handle.addEventListener('touchstart', onStart);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onEnd);

        const finishCorte = async () => {
            if (!isDragging) return;
            isDragging = false;
            const monto = document.getElementById('corte-monto').value;
            if (!monto) { alert("Ingresa el monto físico"); handle.style.left = '0px'; text.style.opacity = '1'; return; }
            
            await db.cerrarTurno(monto);
            const doc = await db.generarPDFCorte();
            if (doc) await db.sharePDF(doc, "Corte_Final.pdf");
            m.remove();
            if (confirm("Corte realizado. ¿Registrar pagos a empleados ahora?")) router.navigate('admin_hrm');
            else router.renderCaja();
        };
    },

    // --- HRM (Personal) ---
    renderHRM() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:20px; height:100%;" class="scrollable-y">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                    <h2 style="color:var(--primary); margin:0; font-weight:900;">Equipo de Trabajo</h2>
                    <button class="btn-accent" style="border-radius:12px; padding:10px 20px;" onclick="router.showHRMCard()">+ NUEVO</button>
                </div>
                
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:15px;">
                    ${db.empleados.map(e => `
                        <div class="admin-card" style="text-align:center; padding-top:30px;">
                            <div style="width:70px; height:70px; background:#f0f0f0; border-radius:50%; margin:0 auto 15px; display:flex; justify-content:center; align-items:center; font-size:2rem; border:3px solid #fff; box-shadow:0 5px 15px rgba(0,0,0,0.05);">👤</div>
                            <b style="font-size:1.1rem; display:block;">${e.nombre}</b>
                            <span style="display:inline-block; padding:4px 10px; background:#fff3e0; color:#e65100; border-radius:8px; font-size:0.65rem; font-weight:bold; margin-top:5px;">${e.puesto.toUpperCase()}</span>
                            
                            <div style="margin-top:20px; display:flex; flex-direction:column; gap:8px;">
                                <button class="btn-primary" style="background:#4CAF50; border:none; padding:10px; border-radius:10px; font-size:0.75rem; font-weight:bold;" onclick="router.handleAsistencia(${e.id}, ${e.pago_dia})">✅ ASISTENCIA</button>
                                <button class="btn-secondary" style="color:#666; border-color:#eee; padding:8px; border-radius:10px; font-size:0.75rem;" onclick="router.showAdelantoModal(${e.id})">💸 ADELANTO</button>
                            </div>
                        </div>
                    `).join('')}
                    ${db.empleados.length === 0 ? '<div style="grid-column: 1/-1; text-align:center; padding:50px; color:#999;">No hay empleados registrados.</div>' : ''}
                </div>
            </div>
        `;
    },

    showHRMCard() {
        const m = document.createElement('div'); m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        m.innerHTML = `
            <div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:400px;">
                <h3>Nuevo Empleado</h3>
                <label>Nombre Completo:</label>
                <input type="text" id="hr-n" placeholder="Ej: Juan Perez" style="width:100%; padding:12px; margin-bottom:15px; border-radius:10px; border:1px solid #ddd;">
                <label>Puesto:</label>
                <select id="hr-p" style="width:100%; padding:12px; margin-bottom:15px; border-radius:10px; border:1px solid #ddd;">
                    <option value="mesero">Mesero</option>
                    <option value="cajero">Cajero/a</option>
                    <option value="taquero">Taquero</option>
                    <option value="admin">Administrador/Dueño</option>
                    <option value="ocasional">Ocasional / Limpieza</option>
                </select>
                <label>Sueldo por Día:</label>
                <input type="number" id="hr-s" placeholder="$0.00" style="width:100%; padding:12px; margin-bottom:15px; border-radius:10px; border:1px solid #ddd;">
                <label>PIN Acceso (4 dígitos):</label>
                <input type="password" id="hr-pin" placeholder="0000" maxlength="4" style="width:100%; padding:12px; margin-bottom:15px; border-radius:10px; border:1px solid #ddd;">
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-primary" style="flex:1;" onclick="router.handleSaveHRM()">GUARDAR</button>
                    <button class="btn-secondary" style="flex:1;" onclick="document.querySelector('.modal-full').remove()">CANCELAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    async handleSaveHRM() {
        const n = document.getElementById('hr-n').value;
        const p = document.getElementById('hr-p').value;
        const s = parseFloat(document.getElementById('hr-s').value);
        const pin = document.getElementById('hr-pin').value;
        if(n && s && pin) { await db.addEmpleado(n, p, s, pin); document.querySelector('.modal-full').remove(); this.renderHRM(); }
        else { alert("Todos los campos son obligatorios, incluyendo el PIN."); }
    },

    async handleAsistencia(id, sueldo) { if(confirm("¿Registrar asistencia y pagar sueldo hoy?")) { const ok = await db.registrarAsistencia(id, sueldo); if(ok) app.showNotification("Asistencia registrada ✓"); else app.showNotification("Ya se registró hoy"); } },
    showAdelantoModal(id) { const m = prompt("Monto del adelanto:"); if(m) { db.addAdelanto(id, parseFloat(m)); app.showNotification("Adelanto registrado"); } },

    // --- EDITOR CROQUIS ---
    renderEditorCroquis() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:15px; height:100%; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h2 style="color:var(--primary); margin:0;">Constructor de Mesas</h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-accent" onclick="router.handleAddMesa('cuadrada')">□ +</button>
                        <button class="btn-accent" onclick="router.handleAddMesa('redonda')">○ +</button>
                    </div>
                </div>
                <div id="canvas-mesas" style="flex:1; background:#f0f0f0; border:2px dashed #ccc; border-radius:15px; position:relative; overflow:hidden;">
                </div>
                <div style="padding:10px; font-size:0.8rem; color:#666; text-align:center;">
                    Toque una mesa para cambiar forma. Arrastre para mover.
                </div>
            </div>
        `;
        this.initCanvasEditor();
    },

    initCanvasEditor() {
        const canvas = document.getElementById('canvas-mesas');
        db.mesas.forEach(mesa => this.renderMesaEditor(mesa, canvas));
    },

    renderMesaEditor(mesa, canvas) {
        const div = document.createElement('div');
        div.id = `mesa-edit-${mesa.id}`;
        div.style = `position:absolute; left:${mesa.x}px; top:${mesa.y}px; width:${mesa.ancho}px; height:${mesa.alto}px; background:white; border:2px solid var(--primary); border-radius:${mesa.forma==='redonda'?'50%':'8px'}; display:flex; flex-direction:column; justify-content:center; align-items:center; font-weight:bold; cursor:move; user-select:none; box-shadow:var(--shadow); transition: transform 0.1s;`;
        div.innerHTML = `<span>#${mesa.numero}</span><span style="font-size:0.6rem; color:red;" onclick="event.stopPropagation(); router.handleDeleteMesa(${mesa.id})">ELIMINAR</span>`;
        
        // Cambio de forma al dar click
        div.onclick = (e) => {
            if (this._isDraggingMesa) return;
            mesa.forma = mesa.forma === 'cuadrada' ? 'redonda' : (mesa.forma === 'redonda' ? 'rectangular' : 'cuadrada');
            mesa.ancho = mesa.forma === 'rectangular' ? 120 : 70;
            div.style.borderRadius = mesa.forma === 'redonda' ? '50%' : '8px';
            div.style.width = mesa.ancho + 'px';
            db.updateMesa(mesa.id, { forma: mesa.forma, ancho: mesa.ancho });
        };

        // Lógica de Arrastre
        let startX, startY, initialX, initialY;
        const onStart = (e) => {
            this._isDraggingMesa = false;
            startX = (e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
            startY = (e.type === 'touchstart' ? e.touches[0].clientY : e.clientY);
            initialX = mesa.x; initialY = mesa.y;
            div.style.transform = 'scale(1.1)';
            div.style.zIndex = '1000';
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
        };
        const onMove = (e) => {
            e.preventDefault();
            this._isDraggingMesa = true;
            const x = (e.type === 'touchmove' ? e.touches[0].clientX : e.clientX);
            const y = (e.type === 'touchmove' ? e.touches[0].clientY : e.clientY);
            mesa.x = initialX + (x - startX);
            mesa.y = initialY + (y - startY);
            div.style.left = mesa.x + 'px';
            div.style.top = mesa.y + 'px';
        };
        const onEnd = () => {
            div.style.transform = 'scale(1)';
            div.style.zIndex = '1';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            db.updateMesa(mesa.id, { x: mesa.x, y: mesa.y });
        };

        div.addEventListener('mousedown', onStart);
        div.addEventListener('touchstart', onStart);
        canvas.appendChild(div);
    },

    async handleAddMesa(forma) { const n = await db.addMesa({ forma }); this.renderEditorCroquis(); },
    async handleDeleteMesa(id) { if(confirm("¿Eliminar mesa?")) { await db.eliminarMesa(id); this.renderEditorCroquis(); } },

    renderCocina() {
        const content = document.getElementById('content');
        const pedidos = db.pedidosActivos.filter(p => p.estado === 'pendiente');
        content.innerHTML = `
            <div style="padding:15px; height:100%;" class="scrollable-y">
                <h2 style="color:var(--primary); margin-bottom:15px;">Monitor</h2>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
                    ${pedidos.map(p => `
                        <div style="background:white; border-radius:var(--radius); padding:12px; border-top:5px solid var(--primary); box-shadow:var(--shadow);">
                            <b>${p.tipo==='mesa'?'MESA '+p.mesaNumero:p.tipo.toUpperCase()}</b>
                            ${p.platos.map((pl, i) => `<div style="background:#f9f9f9; padding:8px; border-radius:8px; margin-top:5px;"><b>P${i+1}</b>: ${pl.items.map(it => it.cantidad+' '+it.nombre).join(', ')}</div>`).join('')}
                            <button class="btn-primary" style="width:100%; background:#4CAF50; margin-top:10px;" onclick="router.handleOrdenLista(${p.id})">LISTO ✓</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    async handleOrdenLista(id) { await db.updatePedidoEstado(id, 'listo'); this.renderCocina(); },

    // --- INFORMES ---
    async renderInformes(p = 'hoy') {
        const content = document.getElementById('content');
        const r = await db.getReporteGeneral(p);
        content.innerHTML = `
            <div style="padding:15px; height:100%;" class="scrollable-y">
                <h2 style="color:var(--primary);">Informes</h2>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin:15px 0;">
                    <div style="background:white; padding:15px; border-radius:12px; text-align:center; box-shadow:var(--shadow);">Ventas<br><b>$${r.ventas.toFixed(2)}</b></div>
                    <div style="background:white; padding:15px; border-radius:12px; text-align:center; box-shadow:var(--shadow);">Gastos<br><b>$${r.totalGastos.toFixed(2)}</b></div>
                    <div style="background:white; padding:15px; border-radius:12px; text-align:center; box-shadow:var(--shadow);">Neto<br><b>$${(r.ventas - r.totalGastos).toFixed(2)}</b></div>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button class="btn-secondary ${p==='hoy'?'active':''}" onclick="router.renderInformes('hoy')">Hoy</button>
                    <button class="btn-secondary ${p==='semana'?'active':''}" onclick="router.renderInformes('semana')">Semana</button>
                    <button class="btn-secondary ${p==='mes'?'active':''}" onclick="router.renderInformes('mes')">Mes</button>
                </div>
                <div style="background:white; border-radius:15px; padding:10px; box-shadow:var(--shadow);">
                    <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                        <thead style="background:#f5f5f5;">
                            <tr><th style="padding:10px; text-align:left;">ID</th><th>HORA</th><th>TIPO</th><th style="text-align:right;">TOTAL</th></tr>
                        </thead>
                        <tbody>
                            ${r.lista.map(v => `
                                <tr onclick="router.showTicketDetail(${v.id})" style="border-bottom:1px solid #eee; cursor:pointer;">
                                    <td style="padding:12px 10px;">#${v.id}</td>
                                    <td>${new Date(v.fecha_creacion).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td>${v.tipo.toUpperCase()}</td>
                                    <td style="text-align:right;"><b>$${v.total.toFixed(2)}</b></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async showTicketDetail(id) {
        // Buscar el pedido (podría estar en activos o históricos)
        let p = db.pedidosActivos.find(x => x.id === id);
        if (!p) {
            const res = await db.getPedidosPorEstado('pagado');
            p = res.find(x => x.id === id);
        }
        if (!p) return;

        const m = document.createElement('div');
        m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000; padding:20px;";
        m.innerHTML = `
            <div style="background:white; padding:25px; border-radius:15px; width:95%; max-width:400px; max-height:80vh; overflow-y:auto;">
                <h3 style="text-align:center; border-bottom:2px solid var(--primary); padding-bottom:10px; margin-bottom:15px;">TICKET #${p.id}</h3>
                <div style="font-size:0.9rem; margin-bottom:15px;">
                    <div>Fecha: ${p.fecha}</div>
                    <div>Tipo: ${p.tipo.toUpperCase()}</div>
                    ${p.cliente?.nombre ? `<div>Cliente: ${p.cliente.nombre}</div>` : ''}
                    <div>Pago: ${p.metodo_pago ? p.metodo_pago.toUpperCase() : 'N/A'}</div>
                </div>
                <div style="border-top:1px dashed #ccc; padding-top:10px;">
                    ${p.platos.map((pl, i) => `
                        <div style="margin-bottom:10px;">
                            <div style="font-weight:bold; font-size:0.7rem; color:#666;">PLATO ${i+1} ${pl.sinCebolla?'S/CEB':''} ${pl.sinCilantro?'S/CIL':''} ${pl.sinVerdura?'S/VER':''}</div>
                            ${pl.items.map(it => `
                                <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
                                    <span>${it.cantidad}x ${it.nombre} ${it.carneId?'('+it.carneId+')':''}</span>
                                    <span>$${(it.precio * it.cantidad).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                <div style="border-top:2px solid #333; margin-top:10px; padding-top:10px; font-size:1.2rem; font-weight:bold; text-align:right;">
                    TOTAL: $${p.total.toFixed(2)}
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-primary" style="flex:1;" onclick="printer.printBill(db.pedidosActivos.find(x=>x.id===${p.id}) || ${JSON.stringify(p).replace(/"/g, '&quot;')})">REIMPRIMIR</button>
                    <button class="btn-secondary" style="flex:1;" onclick="document.querySelector('.modal-full').remove()">CERRAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    // --- GASTOS / DEUDAS ---
    renderGastos() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:20px; height:100%;" class="scrollable-y">
                <h2 style="color:var(--primary); margin-bottom:20px; font-weight:900;">Gastos y Egresos</h2>
                
                <div class="admin-card" style="margin-bottom:25px; border-left:5px solid var(--accent);">
                    <h4 style="margin:0 0 15px 0;">Registrar Salida de Dinero</h4>
                    <input type="text" id="g-desc" placeholder="Concepto (Ej: Pago Coca, Tortilla)" style="width:100%; padding:12px; margin-bottom:10px; border-radius:10px; border:1px solid #ddd;">
                    <input type="number" id="g-monto" placeholder="Monto $0.00" style="width:100%; padding:12px; margin-bottom:15px; border-radius:10px; border:1px solid #ddd; font-size:1.1rem; font-weight:bold;">
                    <div style="display:flex; gap:10px;">
                        <button class="btn-primary" style="flex:1; border-radius:10px;" onclick="router.handleGuardarGasto('pagado')">💸 PAGAR AHORA</button>
                        <button class="btn-secondary" style="flex:1; border-color:#999; color:#666; border-radius:10px;" onclick="router.handleGuardarGasto('pendiente')">📝 ANOTAR DEUDA</button>
                    </div>
                </div>

                <div class="admin-card">
                    <h4 style="margin:0 0 15px 0;">Movimientos Recientes</h4>
                    <div style="display:grid; gap:10px;">
                        ${db.gastos.map(g => `
                            <div style="padding:15px; background:#f9f9f9; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <b style="font-size:0.9rem;">${g.descripcion}</b> ${g.estado==='pendiente'?'<span style="color:#e65100; font-size:0.6rem; background:#fff3e0; padding:2px 5px; border-radius:4px; margin-left:5px;">DEUDA</span>':''}
                                    <div style="font-size:0.7rem; color:#999; margin-top:3px;">${g.fecha} • ${g.hora}</div>
                                </div>
                                <div style="text-align:right;">
                                    <b style="color:${g.estado==='pendiente'?'#ff9800':'#d32f2f'}; font-size:1.1rem;">${g.estado==='pendiente'?'':'-'}$${g.monto.toFixed(0)}</b>
                                    ${g.estado==='pendiente'?`<br><button style="font-size:0.65rem; background:#4CAF50; color:white; border:none; padding:5px 10px; border-radius:6px; margin-top:5px; font-weight:bold;" onclick="router.handlePagarDeuda(${g.id})">PAGAR</button>`:''}
                                </div>
                            </div>
                        `).reverse().join('')}
                    </div>
                </div>
            </div>
        `;
    },
    async handleGuardarGasto(s) { const d = document.getElementById('g-desc').value; const m = parseFloat(document.getElementById('g-monto').value); if(d && m) { await db.addGasto({ descripcion: d, monto: m, estado: s }); this.renderGastos(); } },
    async handlePagarDeuda(id) { if(confirm("¿Pagar ahora?")) { await db.pagarGastoPendiente(id); this.renderGastos(); } },

    // --- CATÁLOGO ---
    renderCatalogo() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="pos-container" style="height:100%;">
                <div class="category-side" style="width:250px; background:#f9f9f9; border-right:1px solid #ddd; display:flex; flex-direction:column;">
                    <div style="padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:white; flex-shrink:0;">
                        <b style="color:var(--primary); font-size:0.9rem;">CATEGORÍAS</b>
                        <button class="btn-accent" style="padding:4px 10px; font-size:1.2rem; line-height:1;" onclick="router.showCategoryModal()">+</button>
                    </div>
                    <div id="cat-list-admin" class="scrollable-y" style="flex:1; padding:10px;"></div>
                </div>
                <div class="catalog-side" style="flex:1; background:white; display:flex; flex-direction:column;">
                    <div style="padding:15px; background:#f5f5f5; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                        <h2 id="current-cat-name" style="margin:0; font-size:1.1rem; color:var(--primary);">Todos los Productos</h2>
                        <button class="btn-primary" style="padding:8px 15px; font-size:0.8rem;" onclick="router.showProductCard()">+ PRODUCTO</button>
                    </div>
                    <div id="prod-list-admin" class="products-grid scrollable-y" style="flex:1; padding:15px;"></div>
                </div>
            </div>
        `;
        this._selectedAdminCat = null;
        this.refreshAdminCatalog();
    },

    refreshAdminCatalog() {
        const catList = document.getElementById('cat-list-admin');
        const prodList = document.getElementById('prod-list-admin');
        if (!catList || !prodList) return;

        // Render Categorías
        catList.innerHTML = `
            <div class="sidebar-item ${!this._selectedAdminCat ? 'active' : ''}" onclick="router._selectedAdminCat=null; router.refreshAdminCatalog()">
                <span>📁</span>
                <span>Ver Todos</span>
            </div>
        ` + db.categorias.map(c => `
            <div class="sidebar-item ${this._selectedAdminCat === c ? 'active' : ''}" onclick="router._selectedAdminCat='${c}'; router.refreshAdminCatalog()">
                <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.9rem;">${c}</span>
                <div style="display:flex; gap:5px; margin-left: 10px;">
                    <span onclick="event.stopPropagation(); router.showCategoryModal('${c}')" style="color:var(--accent); padding: 5px; font-size:1.1rem;">⋮</span>
                </div>
            </div>
        `).join('');

        // Render Productos
        const prods = this._selectedAdminCat ? db.productos.filter(p => p.categoria === this._selectedAdminCat) : db.productos;
        document.getElementById('current-cat-name').innerText = this._selectedAdminCat || 'Todos los Productos';
        
        prodList.innerHTML = prods.map(p => `
            <div class="admin-card" style="padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-left:4px solid var(--primary);">
                <div style="flex:1;">
                    <b style="font-size:1rem; display:block; color:#333;">${p.nombre}</b>
                    <span style="color:var(--primary); font-weight:bold; font-size:1.1rem;">$${p.precio}</span>
                    ${p.requiereCarne ? '<span style="font-size:0.6rem; background:#eee; padding:2px 5px; border-radius:4px; margin-left:8px; color:#666;">REQUIERE CARNE</span>' : ''}
                </div>
                <div style="font-size:1.5rem; color:#999; padding:10px; cursor:pointer;" onclick="router.showProductActions(${JSON.stringify(p).replace(/"/g, '&quot;')})">⋮</div>
            </div>
        `).join('');
    },

    showProductActions(p) {
        const m = document.createElement('div');
        m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:flex-end; z-index:25000;";
        m.innerHTML = `
            <div style="background:white; width:100%; border-top-left-radius:25px; border-top-right-radius:25px; padding:20px; animation: slideUp 0.3s ease-out;">
                <h3 style="margin-top:0; text-align:center; color:#666;">${p.nombre}</h3>
                <button class="btn-primary" style="width:100%; margin-bottom:12px; padding:15px; border-radius:15px; background:var(--accent);" onclick="document.querySelector('.modal-full').remove(); router.showProductCard(${JSON.stringify(p).replace(/"/g, '&quot;')})">✏️ EDITAR PRODUCTO</button>
                <button class="btn-secondary" style="width:100%; margin-bottom:20px; padding:15px; border-radius:15px; color:red; border-color:#ffcdd2;" onclick="router.handleDeleteProduct(${p.id})">🗑️ ELIMINAR PRODUCTO</button>
                <button class="btn-secondary" style="width:100%; border:none; padding:15px;" onclick="document.querySelector('.modal-full').remove()">CANCELAR</button>
            </div>
        `;
        document.body.appendChild(m);
    },

    showCategoryModal(oldName = null) {
        const m = document.createElement('div'); m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        m.innerHTML = `
            <div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:350px; text-align:left;">
                <h3>${oldName ? 'Editar' : 'Nueva'} Categoría</h3>
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Nombre:</label>
                <input type="text" id="cat-n" value="${oldName || ''}" placeholder="Ej: Entradas" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; margin-bottom:20px; font-size:1.1rem;">
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary" style="flex:2;" onclick="router.handleSaveCategory('${oldName || ''}')">GUARDAR</button>
                    <button class="btn-secondary" style="flex:1;" onclick="document.querySelector('.modal-full').remove()">X</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
        document.getElementById('cat-n').focus();
    },

    async handleSaveCategory(old) {
        const n = document.getElementById('cat-n').value;
        if (!n) return;
        if (old) await db.updateCategoria(old, n);
        else await db.addCategoria(n);
        document.querySelector('.modal-full').remove();
        this.renderCatalogo();
    },

    async handleDeleteCategory(name) {
        try {
            if (confirm(`¿Eliminar categoría "${name}"? No debe tener productos.`)) {
                await db.deleteCategoria(name);
                this.renderCatalogo();
            }
        } catch(e) { app.showNotification("❌ Error: " + e.message); }
    },

    showProductCard(p = null) {
        const m = document.createElement('div'); m.className = 'modal-full'; m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; justify-content:center; align-items:center; z-index:20000;";
        m.innerHTML = `<div style="background:white; padding:30px; border-radius:20px; width:90%; max-width:400px; text-align:left;"><h3>${p?'Editar':'Nuevo'} Producto</h3><label>Nombre:</label><input type="text" id="ed-n" value="${p?p.nombre:''}" style="width:100%; padding:10px; margin-bottom:15px; border-radius:8px; border:1px solid #ddd;"><label>Precio:</label><input type="number" id="ed-p" value="${p?p.precio:''}" style="width:100%; padding:10px; margin-bottom:15px; border-radius:8px; border:1px solid #ddd;"><label>Categoría:</label><select id="ed-c" style="width:100%; padding:10px; margin-bottom:15px; border-radius:8px; border:1px solid #ddd;">${db.categorias.map(c => `<option value="${c}" ${p&&p.categoria===c?'selected':(this._selectedAdminCat===c?'selected':'')}>${c}</option>`).join('')}</select><label style="display:flex; align-items:center; gap:10px;"><input type="checkbox" id="ed-sk" ${p&&p.requiereCarne?'checked':''}> Especial (Carnes)</label><div style="display:flex; gap:10px; margin-top:25px;"><button class="btn-primary" style="flex:1;" onclick="router.handleSaveProduct(${p?p.id:'null'})">GUARDAR</button>${p?`<button class="btn-secondary" style="background:#ff4444; color:white; border:none;" onclick="router.handleDeleteProduct(${p.id})">ELIMINAR</button>`:''}</div><button class="btn-secondary" style="width:100%; margin-top:10px; border:none;" onclick="document.querySelector('.modal-full').remove()">Cerrar</button></div>`;
        document.body.appendChild(m);
    },

    async handleSaveProduct(id) { 
        const pr = { 
            id, 
            nombre: document.getElementById('ed-n').value, 
            precio: parseFloat(document.getElementById('ed-p').value), 
            categoria: document.getElementById('ed-c').value, 
            requiereCarne: document.getElementById('ed-sk').checked 
        }; 
        if(id) await db.updateProducto(pr); else await db.addProducto(pr); 
        document.querySelector('.modal-full').remove(); 
        this.renderCatalogo(); 
    },
    async handleDeleteProduct(id) { if(confirm("¿Eliminar?")) { await db.deleteProducto(id); document.querySelector('.modal-full').remove(); this.renderCatalogo(); } },

    async renderDashboard() {
        const content = document.getElementById('content');
        const t = db.turnoActual;
        if (!t) {
            content.innerHTML = `<div style="padding:40px; text-align:center;"><h2>📊 Dashboard</h2><p>Abre caja para ver estadísticas</p></div>`;
            return;
        }

        const metrics = await db.getMetricasCarnes();
        const neto = (t.ventas - t.gastos);

        content.innerHTML = `
            <div style="padding:20px; height:100%;" class="scrollable-y">
                <h2 style="color:var(--primary); margin-bottom:20px; font-weight:900;">Panel de Control</h2>
                
                <div class="stat-grid">
                    <div class="stat-item primary">
                        <span class="lab">Ingresos Brutos</span>
                        <span class="val">$${t.ventas.toFixed(0)}</span>
                    </div>
                    <div class="stat-item accent">
                        <span class="lab">Gastos / Pagos</span>
                        <span class="val">$${t.gastos.toFixed(0)}</span>
                    </div>
                    <div class="stat-item success">
                        <span class="lab">Utilidad Neta</span>
                        <span class="val">$${neto.toFixed(0)}</span>
                    </div>
                </div>

                <div class="admin-card" style="margin-bottom:20px;">
                    <h4 style="margin:0 0 15px 0;">Ventas por Categoría</h4>
                    <div style="display:flex; height:12px; border-radius:6px; overflow:hidden; background:#eee; margin-bottom:15px;">
                        <div style="width:60%; background:var(--primary);"></div>
                        <div style="width:25%; background:var(--accent);"></div>
                        <div style="width:15%; background:#4CAF50;"></div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.8rem; color:#666;">
                        <span><i style="color:var(--primary);">●</i> Tacos (60%)</span>
                        <span><i style="color:var(--accent);">●</i> Especiales (25%)</span>
                        <span><i style="color:#4CAF50;">●</i> Bebidas (15%)</span>
                    </div>
                </div>

                <div class="admin-card">
                    <h4 style="margin:0 0 15px 0;">🔥 Rendimiento de Carnes</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                        ${metrics.map(m => `
                            <tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:12px 0;"><b>${m.carne}</b></td>
                                <td style="text-align:center;">${m.total_vendido} <small>u</small></td>
                                <td style="text-align:right; color:var(--primary); font-weight:bold;">$${m.total_dinero.toFixed(0)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        `;
    },

    // --- ADMIN CARNES ---
    renderAdminCarnes() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:20px; height:100%;" class="scrollable-y">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="color:var(--primary); margin:0; font-weight:900;">Inventario de Carnes</h2>
                </div>
                
                <div class="inventory-grid">
                    ${db.carnes.map(c => `
                        <div class="meat-status-card ${c.disponible ? 'active' : 'sold-out'}" 
                             onclick="router.handleToggleCarne('${c.id}')">
                            <div class="status-badge">${c.disponible ? '✓ HAY' : '✕ NO HAY'}</div>
                            <div style="font-size:2.2rem; margin-bottom:10px;">${c.premium ? '⭐' : '🥩'}</div>
                            <b style="font-size:0.9rem; text-transform:uppercase;">${c.nombre}</b>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top:30px; padding:15px; background:#e3f2fd; border-radius:15px; color:#0d47a1; font-size:0.8rem;">
                    💡 Toca una tarjeta para cambiar el estado. Las carnes marcadas como <b>NO HAY</b> desaparecerán del menú de los meseros instantáneamente.
                </div>
            </div>
        `;
    },
    async handleToggleCarne(id) {
        await db.toggleCarne(id);
        app.showNotification("Estado de carne actualizado");
        this.renderAdminCarnes();
    },

    renderConfig() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div style="padding:15px; height:100%;" class="scrollable-y">
                <h2 style="color:var(--primary); margin-bottom:15px;">Configuración</h2>
                <div style="background:white; padding:20px; border-radius:var(--radius); display:grid; gap:10px;">
                    <label>Nombre Taquería:</label>
                    <input type="text" id="cf-n" value="${db.config.nombreTaqueria}">
                    <label>Teléfono:</label>
                    <input type="text" id="cf-t" value="${db.config.telefono}">
                    <label>Comisión Tarjeta %:</label>
                    <input type="number" id="cf-c" value="${db.config.comisionTarjeta}">
                    <label>Tamaño Ticket:</label>
                    <select id="cf-tw">
                        <option value="58mm" ${db.config.ticketWidth==='58mm'?'selected':''}>58mm</option>
                        <option value="80mm" ${db.config.ticketWidth==='80mm'?'selected':''}>80mm</option>
                    </select>
                    
                    <h3 style="margin-top:20px; border-bottom:1px solid #eee; padding-bottom:5px;">Datos para Transferencia</h3>
                    <label>Banco:</label>
                    <input type="text" id="cf-bn" value="${db.config.bancoNombre || ''}" placeholder="Ej: BBVA">
                    <label>CLABE Interbancaria:</label>
                    <input type="text" id="cf-bc" value="${db.config.bancoClabe || ''}" placeholder="0123456789...">
                    <label>Beneficiario:</label>
                    <input type="text" id="cf-bb" value="${db.config.bancoBeneficiario || ''}" placeholder="Nombre completo">
                    
                    <h3 style="margin-top:20px; border-bottom:1px solid #eee; padding-bottom:5px;">Seguridad (PINs)</h3>
                    <label>PIN Administrador (4-6 dígitos):</label>
                    <input type="password" id="cf-pa" value="${db.config.pin}" placeholder="1234">
                    <label>PIN Staff (Caja/Mesero):</label>
                    <input type="password" id="cf-ps" value="${db.config.pinStaff || '0000'}" placeholder="0000">
                    
                    <h3 style="margin-top:20px; border-bottom:1px solid #eee; padding-bottom:5px;">Precios Premium (Extras)</h3>
                    <label>Extra Taco Caro ($):</label>
                    <input type="number" id="cf-etc" value="${db.config.extraTacoPremium || 6}" placeholder="Ej: 6">
                    <label>Extra Orden Premium ($):</label>
                    <input type="number" id="cf-eop" value="${db.config.extraOrdenPremium || 30}" placeholder="Ej: 30">

                    <h3 style="margin-top:20px; border-bottom:1px solid #eee; padding-bottom:5px;">Opciones de Impresión</h3>
                    <label style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" id="cf-ie" ${db.config.imprimirExtras ? 'checked' : ''}> Imprimir Comandas de Extras (Ahorro Papel)
                    </label>
                    <label>MAC Impresora Bluetooth (Android):</label>
                    <input type="text" id="cf-bt" value="${db.config.bluetoothMAC || ''}" placeholder="00:11:22:33:44:55">
                    
                    <button class="btn-primary" style="margin-top:20px;" onclick="router.guardarConfig()">GUARDAR</button>
                </div>
            </div>
        `;
    },
    async guardarConfig() { 
        db.config.nombreTaqueria = document.getElementById('cf-n').value; 
        db.config.telefono = document.getElementById('cf-t').value; 
        db.config.comisionTarjeta = parseFloat(document.getElementById('cf-c').value); 
        db.config.ticketWidth = document.getElementById('cf-tw').value; 
        db.config.bancoNombre = document.getElementById('cf-bn').value;
        db.config.bancoClabe = document.getElementById('cf-bc').value;
        db.config.bancoBeneficiario = document.getElementById('cf-bb').value;
        db.config.pin = document.getElementById('cf-pa').value;
        db.config.pinStaff = document.getElementById('cf-ps').value;
        db.config.extraTacoPremium = parseFloat(document.getElementById('cf-etc').value) || 0;
        db.config.extraOrdenPremium = parseFloat(document.getElementById('cf-eop').value) || 0;
        db.config.imprimirExtras = document.getElementById('cf-ie').checked;
        db.config.bluetoothMAC = document.getElementById('cf-bt').value;
        await db.save(); 
        app.showNotification("Configuración Guardada");
        this.navigate('pos'); 
    }
};
