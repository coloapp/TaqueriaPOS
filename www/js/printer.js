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

    async sendToPrinter(rawData, pedido = null, type = 'ticket', silent = false) {
        console.log("--- ENVIANDO A IMPRESORA (" + db.config.ticketWidth + ") ---");
        
        // Si estamos en Chrome/Navegador o no hay MAC, ofrecer ticket virtual
        if (!window.Capacitor || !window.Capacitor.isNativePlatform() || !db.config.bluetoothMAC) {
            if (pedido && !silent) {
                this.showVirtualTicket(pedido, type);
            } else if (!pedido && !silent) {
                app.showNotification("⚠️ Impresora no configurada.");
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
            format: [58, 160]
        });

        let y = 10;
        const x = 29; 
        const margin = 5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(db.config.nombreTaqueria.toUpperCase(), x, y, { align: 'center' });
        
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.setFontSize(7);
        doc.text(db.config.direccion || '', x, y, { align: 'center' });
        y += 4;
        doc.text("Tel: " + (db.config.telefono || ''), x, y, { align: 'center' });
        y += 5;
        doc.setLineWidth(0.1);
        doc.line(margin, y, 53, y);
        y += 5;

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(type === 'cocina' ? "COMANDA COCINA" : "CUENTA CLIENTE", x, y, { align: 'center' });
        y += 5;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text((pedido.tipo === 'mesa' ? "MESA #" + pedido.mesaNumero : "PEDIDO: " + pedido.tipo.toUpperCase()), margin, y);
        y += 4;
        doc.text("FECHA: " + new Date().toLocaleString(), margin, y);
        y += 5;
        doc.line(margin, y, 53, y);
        y += 5;

        pedido.platos.forEach((pl, i) => {
            if (pl.items.length === 0) return;
            
            pl.items.forEach(it => {
                doc.setFont(undefined, 'bold');
                doc.text(`${it.cantidad}x ${it.nombre.toUpperCase()}`, margin, y);
                if (type !== 'cocina') {
                    doc.setFont(undefined, 'normal');
                    doc.text(`$${(it.cantidad * it.precio).toFixed(2)}`, 53, y, { align: 'right' });
                }
                y += 4;
                if (it.carneId) {
                    doc.setFontSize(7);
                    doc.setFont(undefined, 'italic');
                    doc.text(`  (${it.carneId.toUpperCase()})`, margin, y);
                    y += 4;
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');
                }
            });
            
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
            y += 1;
        });

        if (type !== 'cocina') {
            y += 2;
            doc.line(margin, y, 53, y);
            y += 6;
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text("TOTAL: $" + db.calcularTotal(pedido).toFixed(2), 53, y, { align: 'right' });
            doc.setFont(undefined, 'normal');
        }

        y += 10;
        doc.setFontSize(8);
        doc.text("¡GRACIAS POR SU PREFERENCIA!", x, y, { align: 'center' });

        const pdfDataUri = doc.output('datauristring');
        const pdfBase64 = pdfDataUri.split(',')[1];
        const fileName = `Ticket_${pedido.id}_${type}.pdf`;

        const m = document.createElement('div');
        m.className = 'modal-full';
        m.onclick = (e) => { if(e.target === m) m.remove(); };
        m.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:50000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px;";
        m.innerHTML = `
            <div class="modal-content-card" style="background:white; width:100%; max-width:420px; border-radius:25px; overflow:hidden; display:flex; flex-direction:column; box-shadow: 0 15px 50px rgba(0,0,0,0.5);">
                <div style="padding:15px 20px; background:var(--primary); color:white; display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:1rem;">Vista Previa Ticket</b>
                    <span onclick="this.closest('.modal-full').remove()" style="cursor:pointer; font-size:2rem; line-height:1;">&times;</span>
                </div>
                
                <div style="flex:1; background:#f0f0f0; padding:10px; display:flex; justify-content:center; overflow-y:auto; max-height:60vh;">
                    <iframe src="${pdfDataUri}#toolbar=0&navpanes=0" style="width:100%; height:450px; border:none; background:white; box-shadow: 0 2px 10px rgba(0,0,0,0.2);"></iframe>
                </div>

                <div style="padding:20px; display:grid; gap:12px; background:white; border-top:1px solid #eee;">
                    <button class="btn-primary" style="background:#25D366; border:none; padding:16px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:10px; border-radius:15px;" 
                            onclick="printer.shareNative('${pdfBase64}', '${fileName}', '${pedido.cliente?.tel || ''}', '${db.calcularTotal(pedido)}')">
                        <span style="font-size:1.4rem;">📱</span> ENVIAR POR WHATSAPP
                    </button>
                    
                    <button class="btn-secondary" style="padding:15px; border-radius:15px; font-weight:bold; border-color:#ddd;" 
                            onclick="printer.downloadNative('${pdfBase64}', '${fileName}')">
                        <span>📥</span> GUARDAR EN TELÉFONO
                    </button>
                </div>

                <div style="padding:12px; background:#f9f9f9; text-align:center; font-size:0.75rem; color:#888;">
                    Toca fuera para cerrar
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    async shareNative(base64, name, tel, total) {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { Share, Filesystem, Directory } = Capacitor.Plugins;
                if (!Filesystem || !Share) throw new Error("Plugins no disponibles");

                const result = await Filesystem.writeFile({
                    path: name,
                    data: base64,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: 'Ticket Taquería',
                    text: `Envío de ticket por $${total}`,
                    url: result.uri
                });
            } catch (e) {
                console.error("Error sharing:", e);
                this.shareWhatsApp(tel, total);
            }
        } else {
            this.shareWhatsApp(tel, total);
        }
    },

    async downloadNative(base64, name) {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { Filesystem, Directory } = Capacitor.Plugins;
                if (!Filesystem) throw new Error("Plugin Filesystem no disponible");

                await Filesystem.writeFile({
                    path: 'Download/' + name, // Intentar en carpeta Download
                    data: base64,
                    directory: Directory.ExternalStorage || Directory.Documents
                });
                app.showNotification("✅ Ticket guardado en descargas");
            } catch (e) {
                console.error("Save error:", e);
                // Segundo intento en Documents si falla ExternalStorage
                try {
                    const { Filesystem, Directory } = Capacitor.Plugins;
                    await Filesystem.writeFile({
                        path: name,
                        data: base64,
                        directory: Directory.Documents
                    });
                    app.showNotification("✅ Ticket guardado en Documentos");
                } catch(e2) {
                    app.showNotification("❌ Error al guardar: " + e.message);
                }
            }
        } else {
            const link = document.createElement('a');
            link.href = 'data:application/pdf;base64,' + base64;
            link.download = name;
            link.click();
        }
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
