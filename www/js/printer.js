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
        const chars = this.getCharsPerLine();
        const esExtra = pedido.esExtra || false;
        
        let t = this.INIT + this.CENTER;
        t += this.BOLD_ON + this.SIZE_LARGE;
        t += (esExtra ? "!!! EXTRAS !!!\n" : "");
        t += (pedido.tipo === 'mesa' ? "MESA " + pedido.mesaNumero : pedido.tipo.toUpperCase()) + "\n";
        t += this.SIZE_NORMAL + "MESERO: " + mesero.toUpperCase() + "\n" + this.BOLD_OFF;
        t += "FECHA: " + new Date().toLocaleTimeString() + "\n";
        t += "================================\n"; // Raya de inicio (el papelito)
        t += this.LEFT;

        pedido.platos.forEach((plato, i) => {
            if (plato.items.length === 0) return;
            
            t += this.BOLD_ON + "PLATO " + (i + 1) + "\n" + this.BOLD_OFF;
            
            plato.items.forEach(it => {
                // Si es un pedido de extras, podríamos marcar los nuevos. 
                // Por ahora imprimimos el plato completo con el formato de raya.
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

            t += "--------------------------------\n"; // Raya divisoria horizontal entre platos
        });

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
