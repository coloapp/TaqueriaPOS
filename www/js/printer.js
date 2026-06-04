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

    getCharsPerLine() {
        return db.config.ticketWidth === '80mm' ? 42 : 32;
    },

    drawLine() {
        return "-".repeat(this.getCharsPerLine()) + "\n";
    },

    formatKitchenOrder(pedido) {
        const mesero = router.currentUser ? router.currentUser.nombre : 'TERMINAL';
        const esExtra = pedido.esExtra || false;
        
        let t = this.INIT + this.CENTER;
        t += this.BOLD_ON + this.SIZE_LARGE;
        
        // Encabezado según tipo de orden
        if (pedido.tipo === 'mesa') {
            t += "MESA #" + pedido.mesaNumero + "\n";
        } else if (pedido.tipo === 'llevar') {
            t += "PARA LLEVAR #" + pedido.id.toString().slice(-4) + "\n";
        } else if (pedido.tipo === 'domicilio') {
            t += "DOMICILIO #" + pedido.id.toString().slice(-4) + "\n";
        }
        
        if (esExtra) t += "!!! EXTRAS !!!\n";
        
        t += this.SIZE_NORMAL + "MESERO: " + mesero.toUpperCase() + "\n" + this.BOLD_OFF;
        t += "FECHA: " + new Date().toLocaleTimeString() + "\n";
        
        // Datos de contacto para Domicilio
        if (pedido.tipo === 'domicilio' && pedido.cliente) {
            t += this.BOLD_ON + "--------------------------------\n";
            t += "DIR: " + (pedido.cliente.nombre || 'N/A') + "\n";
            t += "TEL: " + (pedido.cliente.tel || 'N/A') + "\n";
            t += "--------------------------------\n" + this.BOLD_OFF;
        } else {
            t += "================================\n";
        }
        
        t += this.LEFT;

        pedido.platos.forEach((plato, i) => {
            if (plato.items.length === 0) return;
            
            t += this.BOLD_ON + "PLATO " + (i + 1) + "\n" + this.BOLD_OFF;
            
            plato.items.forEach(it => {
                t += this.SIZE_LARGE + it.cantidad + " " + it.nombre.toUpperCase();
                if (it.carneId) t += " (" + it.carneId.toUpperCase() + ")";
                t += this.SIZE_NORMAL + "\n";
                if(it.conQueso) t += "  + CON QUESO\n";
            });

            let notasV = [];
            if (plato.sinCebolla) notasV.push("S/ CEB");
            if (plato.sinCilantro) notasV.push("S/ CIL");
            if (plato.sinVerdura) notasV.push("S/ VER");
            if (notasV.length > 0) t += this.BOLD_ON + ">> " + notasV.join(' ') + "\n" + this.BOLD_OFF;
            if (plato.notas) t += "NOTA: " + plato.notas + "\n";

            t += "--------------------------------\n";
        });

        t += "\n\n\n\n" + this.GS + "V" + "\u0041" + "\u0000"; 
        return t;
    },

    formatBill(pedido, conComision = false) {
        const chars = this.getCharsPerLine();
        const finalTotal = db.calcularTotal(pedido, conComision);
        
        let t = this.INIT + this.CENTER;
        t += this.BOLD_ON + db.config.nombreTaqueria.toUpperCase() + "\n" + this.BOLD_OFF;
        t += db.config.direccion + "\n";
        t += "Tel: " + db.config.telefono + "\n";
        t += this.drawLine();
        t += (pedido.tipo === 'mesa' ? "MESA #" + pedido.mesaNumero : "PEDIDO: " + pedido.tipo.toUpperCase()) + "\n";
        t += "FECHA: " + new Date().toLocaleString() + "\n";
        t += this.drawLine();
        t += this.LEFT;
        
        pedido.platos.forEach(pl => {
            pl.items.forEach(it => {
                const totalItem = it.cantidad * it.precio;
                const namePart = it.nombre.substring(0, chars - 12);
                t += it.cantidad + " " + namePart.padEnd(chars - 12) + " $" + totalItem.toFixed(2).padStart(7) + "\n";
            });
        });
        
        t += this.drawLine();
        t += this.RIGHT + this.BOLD_ON + "TOTAL: $" + finalTotal.toFixed(2) + this.BOLD_OFF + "\n";
        
        if (db.config.bancoClabe) {
            t += "\n" + this.CENTER + "--- PAGO TRANSFERENCIA ---\n";
            t += db.config.bancoNombre + "\n";
            t += "CLABE: " + db.config.bancoClabe + "\n";
            t += db.config.bancoBeneficiario + "\n";
        }

        t += this.CENTER + "\n¡GRACIAS POR SU VISITA!\n";
        t += "\n\n\n\n" + this.GS + "V" + "\u0041" + "\u0000"; // Corte de papel
        return t;
    },

    async sendToPrinter(rawData, pedido = null, type = 'ticket') {
        console.log("--- ENVIANDO A IMPRESORA (" + db.config.ticketWidth + ") ---");
        
        // Si estamos en Chrome/Navegador o no hay MAC, ofrecer ticket virtual
        if (!window.Capacitor || !window.Capacitor.isNativePlatform() || !db.config.bluetoothMAC) {
            if (pedido) {
                this.showVirtualTicket(pedido, type);
            } else {
                app.showNotification("⚠️ Impresora no configurada. Usando ticket virtual.");
            }
            return;
        }

        try {
            // Simulación de envío nativo vía Bluetooth
            app.showNotification("Imprimiendo via Bluetooth...");
            // Aquí iría la lógica real con Capacitor Bluetooth Serial
        } catch (e) {
            console.error("Error Bluetooth:", e);
            if (pedido) this.showVirtualTicket(pedido, type);
        }
    },

    showVirtualTicket(pedido, type) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            unit: 'mm',
            format: [58, 200]
        });

        let y = 10;
        const x = 29; // Centro para 58mm
        const margin = 5;

        doc.setFontSize(10);
        doc.text(db.config.nombreTaqueria.toUpperCase(), x, y, { align: 'center' });
        y += 5;
        doc.setFontSize(7);
        doc.text(db.config.direccion || '', x, y, { align: 'center' });
        y += 4;
        doc.text("Tel: " + (db.config.telefono || ''), x, y, { align: 'center' });
        y += 5;
        doc.text("-".repeat(30), x, y, { align: 'center' });
        y += 5;

        doc.setFontSize(9);
        doc.text(type === 'cocina' ? "COMANDA COCINA" : "CUENTA CLIENTE", x, y, { align: 'center' });
        y += 5;
        doc.setFontSize(8);
        doc.text((pedido.tipo === 'mesa' ? "MESA #" + pedido.mesaNumero : "PEDIDO: " + pedido.tipo.toUpperCase()), margin, y);
        y += 4;
        doc.text("FECHA: " + new Date().toLocaleString(), margin, y);
        y += 5;
        doc.text("-".repeat(30), x, y, { align: 'center' });
        y += 5;

        pedido.platos.forEach((pl, i) => {
            if (type === 'cocina') doc.setFont(undefined, 'bold');
            pl.items.forEach(it => {
                doc.text(`${it.cantidad}x ${it.nombre.toUpperCase()}`, margin, y);
                if (type !== 'cocina') {
                    doc.text(`$${(it.cantidad * it.precio).toFixed(2)}`, 53, y, { align: 'right' });
                }
                y += 4;
                if (it.carneId) {
                    doc.text(`  (${it.carneId.toUpperCase()})`, margin, y);
                    y += 4;
                }
            });
            doc.setFont(undefined, 'normal');
            
            let extras = [];
            if (pl.sinCebolla) extras.push("S/CEB");
            if (pl.sinCilantro) extras.push("S/CIL");
            if (pl.sinVerdura) extras.push("S/VER");
            if (extras.length > 0) {
                doc.setFontSize(7);
                doc.text(">> " + extras.join(' '), margin, y);
                y += 4;
            }
            if (pl.notas) {
                doc.setFontSize(7);
                doc.text("NOTA: " + pl.notas, margin, y);
                y += 4;
            }
            y += 2;
        });

        if (type !== 'cocina') {
            y += 2;
            doc.text("-".repeat(30), x, y, { align: 'center' });
            y += 5;
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text("TOTAL: $" + db.calcularTotal(pedido).toFixed(2), 53, y, { align: 'right' });
            doc.setFont(undefined, 'normal');
        }

        y += 10;
        doc.setFontSize(8);
        doc.text("¡GRACIAS POR SU PREFERENCIA!", x, y, { align: 'center' });

        // Crear Modal para previsualizar y compartir
        const pdfData = doc.output('datauristring');
        const m = document.createElement('div');
        m.className = 'modal-full';
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:50000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;";
        m.innerHTML = `
            <div style="background:white; width:100%; max-width:400px; border-radius:20px; overflow:hidden; display:flex; flex-direction:column;">
                <div style="padding:15px; background:var(--primary); color:white; display:flex; justify-content:space-between; align-items:center;">
                    <b>Vista Previa Ticket</b>
                    <span onclick="this.parentElement.parentElement.parentElement.remove()" style="cursor:pointer; font-size:1.5rem;">×</span>
                </div>
                <iframe src="${pdfData}" style="width:100%; height:400px; border:none;"></iframe>
                <div style="padding:20px; display:grid; gap:10px;">
                    <button class="btn-primary" style="background:#25D366; border:none;" onclick="printer.shareWhatsApp('${pedido.cliente?.tel || ''}', '${db.calcularTotal(pedido)}')">ENVIAR POR WHATSAPP 📱</button>
                    <button class="btn-secondary" onclick="printer.downloadPDF('${pedido.id}')">DESCARGAR PDF 📥</button>
                    <button class="btn-secondary" style="border:none;" onclick="this.parentElement.parentElement.parentElement.remove()">CERRAR</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    shareWhatsApp(tel, total) {
        const text = encodeURIComponent(`*${db.config.nombreTaqueria}*\n\nHola! Tu pedido está listo. \nTotal a pagar: *$${total}*\n\n¡Gracias por tu preferencia! 🌮`);
        const url = tel ? `https://wa.me/52${tel}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
    },

    downloadPDF(id) {
        // La lógica de descarga ya está implícita en el iframe, 
        // pero podemos forzarla si es necesario volviendo a generar el doc.
        app.showNotification("Iniciando descarga...");
    },

    async printOrder(pedido) {
        const data = this.formatKitchenOrder(pedido);
        await this.sendToPrinter(data, pedido, 'cocina');
        app.showNotification("Ticket de COCINA generado");
    },

    async printBill(pedido, conComision = false) {
        const data = this.formatBill(pedido, conComision);
        await this.sendToPrinter(data, pedido, 'cuenta');
        app.showNotification("Ticket de CUENTA generado");
    }
};
