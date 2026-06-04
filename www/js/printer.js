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

    async sendToPrinter(rawData) {
        console.log("--- ENVIANDO A IMPRESORA (" + db.config.ticketWidth + ") ---");
        console.log(rawData);
        
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                // Usamos un patrón genérico para plugins de Bluetooth Serial
                // Si tienes un plugin específico instalado (ej: bluetooth-serial), se llamaría aquí.
                const btMac = db.config.bluetoothMAC;
                if (!btMac) {
                    app.showNotification("⚠️ Configura la MAC de la impresora Bluetooth");
                    return;
                }

                // Simulación de envío nativo vía Bluetooth (Requiere plugin instalado)
                // if (window.bluetoothSerial) {
                //    window.bluetoothSerial.connect(btMac, () => {
                //        window.bluetoothSerial.write(rawData, () => {
                //            window.bluetoothSerial.disconnect();
                //        });
                //    });
                // }
                
                app.showNotification("Imprimiendo via Bluetooth...");
            } catch (e) {
                console.error("Error Bluetooth:", e);
                app.showNotification("❌ Error al conectar con impresora");
            }
        }
    },

    async printOrder(pedido) {
        const data = this.formatKitchenOrder(pedido);
        await this.sendToPrinter(data);
        app.showNotification("Ticket de COCINA enviado");
    },

    async printBill(pedido, conComision = false) {
        const data = this.formatBill(pedido, conComision);
        await this.sendToPrinter(data);
        app.showNotification("Ticket de CUENTA enviado");
    }
};
