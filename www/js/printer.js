/**
 * printer.js - Formateador ESC/POS para impresoras térmicas
 */
const printer = {
    // Comandos ESC/POS estándar
    ESC: '\u001B',
    GS: '\u001D',
    INIT: '\u001B@',
    CENTER: '\u001Ba1',
    LEFT: '\u001Ba0',
    RIGHT: '\u001Ba2',
    BOLD_ON: '\u001BE1',
    BOLD_OFF: '\u001BE0',
    SIZE_LARGE: '\u001D!1', 
    SIZE_NORMAL: '\u001D!0',

    getCharsPerLine(type = 'caja') {
        const width = (type === 'cocina' && db.config.usarImpresoraCocina) ? db.config.ticketWidth_Cocina : db.config.ticketWidth;
        return width === '80mm' ? 42 : 32;
    },

    drawLine(type = 'caja') {
        return "-".repeat(this.getCharsPerLine(type)) + "\n";
    },

    formatKitchenOrder(pedido) {
        const mesero = router.currentUser ? router.currentUser.nombre : 'TERMINAL';
        const esExtra = pedido.esExtra || false;
        const chars = this.getCharsPerLine('cocina');
        
        let t = this.INIT + this.CENTER;
        t += this.BOLD_ON + this.SIZE_LARGE;
        
        // Encabezado según tipo de orden
        if (pedido.tipo === 'mesa') {
            t += "MESA #" + pedido.mesaNumero + "\n";
            t += "(" + mesero.toUpperCase() + ")\n";
        } else if (pedido.tipo === 'llevar') {
            t += "LLEVAR #" + pedido.id.toString().slice(-4) + "\n";
        } else if (pedido.tipo === 'domicilio') {
            t += "DOMICILIO #" + pedido.id.toString().slice(-4) + "\n";
        }
        
        if (esExtra) t += "!!! EXTRAS !!!\n";
        
        t += this.SIZE_NORMAL + this.BOLD_OFF;
        t += "FECHA: " + new Date().toLocaleTimeString() + "\n";
        
        if (pedido.tipo === 'domicilio' && pedido.cliente) {
            t += this.BOLD_ON + "-".repeat(chars) + "\n";
            t += "CLIENTE: " + (pedido.cliente.nombre || 'N/A') + "\n";
            t += "DIR: " + (pedido.cliente.dir || 'N/A') + "\n";
            t += "TEL: " + (pedido.cliente.tel || 'N/A') + "\n";
            t += "-".repeat(chars) + "\n" + this.BOLD_OFF;
        } else {
            t += "=".repeat(chars) + "\n";
        }
        
        t += this.LEFT;

        pedido.platos.forEach((plato, i) => {
            if (plato.items.length === 0) return;
            
            t += this.BOLD_ON + "PLATO " + (i + 1) + "\n" + this.BOLD_OFF;
            
            plato.items.forEach(it => {
                t += this.SIZE_LARGE + it.cantidad + "x " + it.nombre.toUpperCase();
                if (it.carneId) t += " (" + it.carneId.toUpperCase() + ")";
                t += this.SIZE_NORMAL + "\n";
                if(it.conQueso) t += "  + CON QUESO\n";
            });

            let notasV = [];
            if (plato.sinCebolla) notasV.push("S/ CEBOLLA");
            if (plato.sinCilantro) notasV.push("S/ CILANTRO");
            if (plato.sinVerdura) notasV.push("S/ VERDURA");
            
            if (notasV.length > 0 || plato.notas) {
                t += this.BOLD_ON;
                if (notasV.length > 0) t += ">> " + notasV.join(' ') + "\n";
                if (plato.notas) t += "NOTA: " + plato.notas.toUpperCase() + "\n";
                t += this.BOLD_OFF;
            }

            t += "-".repeat(chars) + "\n";
        });

        t += "\n\n\n\n" + this.GS + "V" + "\u0041" + "\u0000"; 
        return t;
    },

    formatBill(pedido, conComision = false) {
        const chars = this.getCharsPerLine('caja');
        const finalTotal = db.calcularTotal(pedido, conComision);
        
        let t = this.INIT + this.CENTER;
        t += this.BOLD_ON + db.config.nombreTaqueria.toUpperCase() + "\n" + this.BOLD_OFF;
        t += db.config.direccion + "\n";
        t += "Tel: " + db.config.telefono + "\n";
        t += this.drawLine('caja');
        
        if (pedido.tipo === 'mesa') {
            t += this.BOLD_ON + "VENTA MESA #" + pedido.mesaNumero + "\n" + this.BOLD_OFF;
        } else {
            t += this.BOLD_ON + "VENTA " + pedido.tipo.toUpperCase() + " #" + pedido.id.toString().slice(-4) + "\n" + this.BOLD_OFF;
        }

        t += "ID: " + pedido.id + "\n";
        t += "FECHA: " + new Date().toLocaleString() + "\n";

        if (pedido.tipo === 'domicilio' && pedido.cliente) {
            t += this.drawLine('caja');
            t += "CLIENTE: " + (pedido.cliente.nombre || 'N/A') + "\n";
            t += "DIR: " + (pedido.cliente.dir || 'N/A') + "\n";
            t += "TEL: " + (pedido.cliente.tel || 'N/A') + "\n";
        }

        t += this.drawLine('caja');
        t += this.LEFT;
        
        pedido.platos.forEach(pl => {
            pl.items.forEach(it => {
                let pUnitario = it.precio;
                const v = it.variantes || {};
                
                if (it.requiereCarne && it.carneId) {
                    pUnitario += (parseFloat(v[it.carneId]) || 0);
                } else if (it.requiereCarne && !it.carneId && it.precioSencillo > 0) {
                    pUnitario = it.precioSencillo;
                }
                
                if (it.conQueso) {
                    pUnitario += (parseFloat(v['queso']) || 0);
                }

                const totalItem = it.cantidad * pUnitario;
                let desc = it.nombre.toUpperCase();
                if (it.carneId) desc += " " + it.carneId.toUpperCase();
                if (it.conQueso) desc += " +Q";
                
                const namePart = desc.substring(0, chars - 12);
                t += it.cantidad + " " + namePart.padEnd(chars - 12) + " $" + totalItem.toFixed(2).padStart(7) + "\n";
            });
        });
        
        t += this.drawLine('caja');
        t += this.RIGHT + this.BOLD_ON + "TOTAL: $" + finalTotal.toFixed(2) + this.BOLD_OFF + "\n";
        
        if (db.config.bancoClabe) {
            t += "\n" + this.CENTER + "--- PAGO TRANSFERENCIA ---\n";
            t += db.config.bancoNombre + "\n";
            t += "CLABE: " + db.config.bancoClabe + "\n";
            t += db.config.bancoBeneficiario + "\n";
        }

        t += "\n" + this.CENTER + "¡GRACIAS POR SU COMPRA!\n";
        t += "\n\n\n\n" + this.GS + "V" + "\u0041" + "\u0000"; 
        return t;
    },

    async sendToPrinter(rawData, pedido = null, type = 'ticket', silent = false) {
        // type puede ser 'cuenta' o 'cocina'
        const isCocina = (type === 'cocina' && db.config.usarImpresoraCocina);
        const ticketWidth = isCocina ? db.config.ticketWidth_Cocina : db.config.ticketWidth;
        
        console.log(`--- ENVIANDO A IMPRESORA ${type.toUpperCase()} (${ticketWidth}) ---`);
        
        let targetMAC = db.config.bluetoothMAC; 
        if (isCocina && db.config.bluetoothMAC_Cocina) {
            targetMAC = db.config.bluetoothMAC_Cocina;
        }

        // Simulación o Ticket Virtual si no hay entorno nativo
        if (!window.Capacitor || !window.Capacitor.isNativePlatform() || !targetMAC) {
            if (pedido && !silent) {
                this.showDualPreview(pedido);
            } else if (!pedido && !silent) {
                app.showNotification("⚠️ Impresora no configurada.");
            }
            return;
        }

        try {
            // Lógica real Bluetooth aquí (omitida para brevedad en simulación)
        } catch (e) {
            console.error("Error Impresión:", e);
            if (pedido && !silent) this.showDualPreview(pedido);
        }
    },

    async showDualPreview(pedido) {
        const { jsPDF } = window.jspdf;
        
        const generateOnePDF = (isCocina) => {
            const doc = new jsPDF({ unit: 'mm', format: [58, 200] }); // Formato largo para scroll
            let y = 10; const x = 29; const margin = 5;
            
            doc.setFont("helvetica", "bold"); doc.setFontSize(11);
            doc.text(db.config.nombreTaqueria.toUpperCase(), x, y, { align: 'center' });
            y += 5;
            doc.setFontSize(7); doc.setFont("helvetica", "normal");
            doc.text(db.config.direccion || '', x, y, { align: 'center' });
            y += 4;
            doc.text("Tel: " + (db.config.telefono || ''), x, y, { align: 'center' });
            y += 5; doc.setLineWidth(0.1); doc.line(margin, y, 53, y); y += 5;

            doc.setFontSize(9); doc.setFont(undefined, 'bold');
            doc.text(isCocina ? "COMANDA COCINA" : "CUENTA CLIENTE", x, y, { align: 'center' });
            y += 5; doc.setFontSize(8); doc.setFont(undefined, 'normal');
            doc.text((pedido.tipo === 'mesa' ? "MESA #" + pedido.mesaNumero : "PEDIDO: " + pedido.tipo.toUpperCase()), margin, y);
            y += 4;
            doc.text("FECHA: " + new Date().toLocaleString(), margin, y);
            
            // EXTRACCIÓN DE DATOS DE CLIENTE PARA DOMICILIO
            if (!isCocina && pedido.tipo === 'domicilio' && pedido.cliente) {
                y += 4; doc.setFont(undefined, 'bold');
                doc.text("CLIENTE: " + (pedido.cliente.nombre || 'N/A').toUpperCase(), margin, y);
                y += 4; doc.text("TEL: " + (pedido.cliente.tel || 'N/A'), margin, y);
                y += 4; doc.setFont(undefined, 'normal'); doc.setFontSize(7);
                const dirLines = doc.splitTextToSize("DIR: " + (pedido.cliente.dir || 'N/A').toUpperCase(), 48);
                doc.text(dirLines, margin, y);
                y += (dirLines.length * 4);
                doc.setFontSize(8);
            }

            y += 5; doc.line(margin, y, 53, y); y += 5;

            pedido.platos.forEach((pl, i) => {
                if (pl.items.length === 0) return;
                pl.items.forEach(it => {
                    doc.setFont(undefined, 'bold');
                    doc.text(`${it.cantidad}x ${it.nombre.toUpperCase()}`, margin, y);
                    if (!isCocina) doc.setFont(undefined, 'normal'), doc.text(`$${(it.cantidad * it.precio).toFixed(2)}`, 53, y, { align: 'right' });
                    y += 4;
                    if (it.carneId) { doc.setFontSize(7); doc.setFont(undefined, 'italic'); doc.text(`  (${it.carneId.toUpperCase()})`, margin, y); y += 4; doc.setFontSize(8); doc.setFont(undefined, 'normal'); }
                });
                let extras = [];
                if (pl.sinCebolla) extras.push("S/CEB"); if (pl.sinCilantro) extras.push("S/CIL"); if (pl.sinVerdura) extras.push("S/VER");
                if (extras.length > 0) { doc.setFontSize(7); doc.text(">> " + extras.join(' '), margin, y); y += 4; }
                if (pl.notas) { doc.setFontSize(7); doc.text(`* ${pl.notas}`, margin, y); y += 4; }
                y += 2;
            });
            
            if (!isCocina) {
                doc.line(margin, y, 53, y); y += 6;
                doc.setFontSize(11); doc.setFont(undefined, 'bold');
                doc.text("TOTAL: $" + db.calcularTotal(pedido).toFixed(2), 53, y, { align: 'right' });
            }
            return doc.output('datauristring');
        };

        const pdfCocina = generateOnePDF(true);
        const pdfCuenta = generateOnePDF(false);

        const m = document.createElement('div');
        m.className = 'modal-full';
        m.id = 'dual-preview-modal';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:50000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px;";
        
        m.innerHTML = `
            <div class="modal-content-card" style="background:white; width:95%; max-width:480px; height:90vh; border-radius:25px; overflow:hidden; display:flex; flex-direction:column;">
                <div style="padding:15px; background:var(--primary); color:white; display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:0.9rem; letter-spacing:1px;">PREVISUALIZACIÓN</b>
                    <span onclick="document.getElementById('dual-preview-modal').remove()" style="cursor:pointer; font-size:2rem; line-height:1;">&times;</span>
                </div>
                
                <div style="display:flex; background:#eee; padding:5px; gap:5px;">
                    <button id="btn-show-cocina" class="btn-type active" style="flex:1; padding:12px; font-size:0.8rem;" onclick="printer._switchPreview('cocina')">COMANDERA</button>
                    <button id="btn-show-cuenta" class="btn-type" style="flex:1; padding:12px; font-size:0.8rem;" onclick="printer._switchPreview('cuenta')">CLIENTE</button>
                </div>

                <div style="flex:1; overflow-y:auto; background:#444; padding:15px; display:flex; justify-content:center;">
                    <iframe id="preview-frame-cocina" src="${pdfCocina}#toolbar=0" style="width:100%; height:1000px; border:none; background:white; border-radius:10px;"></iframe>
                    <iframe id="preview-frame-cuenta" src="${pdfCuenta}#toolbar=0" style="width:100%; height:1000px; border:none; background:white; border-radius:10px; display:none;"></iframe>
                </div>

                <div style="padding:15px; display:flex; gap:10px; background:white; border-top:1px solid #ddd;">
                    <button class="btn-secondary" style="flex:1; padding:12px; font-size:0.75rem; border-radius:12px;" onclick="printer.shareNative('${pdfCuenta.split(',')[1]}', 'ticket.pdf', '${pedido.cliente?.tel||''}', '${db.calcularTotal(pedido)}')">📱 WHATSAPP</button>
                    <button class="btn-secondary" style="flex:1; padding:12px; font-size:0.75rem; border-radius:12px;" onclick="printer.downloadNative('${pdfCuenta.split(',')[1]}', 'ticket.pdf')">📥 GUARDAR</button>
                    <button class="btn-primary" style="flex:1; padding:12px; font-size:0.75rem; border-radius:12px;" onclick="document.getElementById('dual-preview-modal').remove()">ENTENDIDO</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    _switchPreview(type) {
        document.getElementById('preview-frame-cocina').style.display = type === 'cocina' ? 'block' : 'none';
        document.getElementById('preview-frame-cuenta').style.display = type === 'cuenta' ? 'block' : 'none';
        document.getElementById('btn-show-cocina').classList.toggle('active', type === 'cocina');
        document.getElementById('btn-show-cuenta').classList.toggle('active', type === 'cuenta');
    },

    async shareNative(base64, name, tel, total) {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { Share, Filesystem, Directory } = Capacitor.Plugins;
                const tempPath = `temp_${Date.now()}.pdf`;
                await Filesystem.writeFile({ path: tempPath, data: base64, directory: Directory.Cache });
                const fileUri = await Filesystem.getUri({ path: tempPath, directory: Directory.Cache });
                await Share.share({ title: 'Ticket de Venta', text: `Ticket por $${total}`, url: fileUri.uri });
            } catch (e) {
                console.error("Share error:", e);
                this.shareWhatsApp(tel, total);
            }
        } else {
            this.shareWhatsApp(tel, total);
        }
    },

    shareWhatsApp(tel, total) {
        const msg = encodeURIComponent(`¡Hola! Gracias por tu compra. Tu total es de $${total}. ¡Buen provecho! 🌮`);
        let url = `https://wa.me/`;
        if (tel) {
            const cleanTel = tel.replace(/\D/g, '');
            url += (cleanTel.length === 10 ? '52' + cleanTel : cleanTel);
        }
        url += `?text=${msg}`;
        window.open(url, '_blank');
    },

    async downloadNative(base64, name) {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { Filesystem, Directory } = Capacitor.Plugins;
                await Filesystem.writeFile({ path: 'Download/' + name, data: base64, directory: Directory.ExternalStorage || Directory.Documents });
                app.showNotification("✅ Ticket guardado");
            } catch (e) {
                app.showNotification("❌ Error al guardar");
            }
        } else {
            const link = document.createElement('a');
            link.href = 'data:application/pdf;base64,' + base64;
            link.download = name;
            link.click();
        }
    },

    async printOrder(pedido, silent = false) {
        const data = this.formatKitchenOrder(pedido);
        await this.sendToPrinter(data, pedido, 'cocina', silent);
        if (!silent) app.showNotification("Ticket de COCINA generado");
    },

    async printBill(pedido, conComision = false, silent = false) {
        const data = this.formatBill(pedido, conComision);
        await this.sendToPrinter(data, pedido, 'cuenta', silent);
        if (!silent) app.showNotification("Ticket de CUENTA generado");
    }
};
