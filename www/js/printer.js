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
        const mesero = localStorage.getItem('tpos_device_name') || 'TERMINAL';
        const chars = this.getCharsPerLine();
        
        let t = this.INIT + this.CENTER;
        t += this.BOLD_ON + this.SIZE_LARGE;
        t += (pedido.tipo === 'mesa' ? "MESA " + pedido.mesaNumero : pedido.tipo.toUpperCase()) + "\n";
        t += this.SIZE_NORMAL + mesero + "\n" + this.BOLD_OFF;
        t += this.drawLine();
        t += this.LEFT;

        pedido.platos.forEach((plato, i) => {
            if (i > 0) t += this.drawLine();
            
            t += this.BOLD_ON + "PLATO " + (i + 1) + "\n" + this.BOLD_OFF;
            if (plato.sinCebolla || plato.sinCilantro) {
                t += "NOTAS: " + (plato.sinCebolla ? "S/ CEB " : "") + (plato.sinCilantro ? "S/ CIL" : "") + "\n";
            }
            
            plato.items.forEach(it => {
                t += this.BOLD_ON + it.cantidad + " " + it.nombre.toUpperCase() + this.BOLD_OFF + "\n";
                if(it.notas) t += "  > " + it.notas + "\n";
            });
        });

        t += this.drawLine();
        t += "\n\n\n\n" + this.GS + "V" + "\u0041" + "\u0000"; // Corte de papel
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
        // En un entorno real, aquí se usaría un plugin Bluetooth o Red.
        // Simulamos el envío para asegurar que la lógica de creación del ticket es correcta.
        console.log("--- ENVIANDO A IMPRESORA (" + db.config.ticketWidth + ") ---");
        console.log(rawData);
        
        if (window.Capacitor?.Plugins?.Http) {
            // Ejemplo de envío por red si la IP está configurada
            const ip = db.config.impresoraIP;
            if (ip && ip !== '192.168.1.100') {
                console.log("Intentando enviar a IP: " + ip);
                // Aquí iría la lógica TCP/UDP real del plugin de impresión
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
