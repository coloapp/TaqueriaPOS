#!/usr/bin/env node
/**
 * Context Loader para TaqueriaPOS
 * Ejecuta este script al inicio de una sesión para que Gemini lea el estado actual.
 */
const fs = require('fs');
const path = require('path');

const memoryPath = 'C:\\Users\\sadas\\.gemini\\tmp\\taqueriapos\\memory\\MEMORY.md';
const detallesPath = 'C:\\Users\\sadas\\.gemini\\tmp\\taqueriapos\\memory\\detalles.md';

console.log("--- CARGANDO CONTEXTO DEL PROYECTO ---");

try {
    const memory = fs.readFileSync(memoryPath, 'utf8');
    const detalles = fs.readFileSync(detallesPath, 'utf8');
    
    console.log("\n### RESUMEN DE MEMORIA ###\n");
    console.log(memory);
    console.log("\n### DETALLES TÉCNICOS ###\n");
    console.log(detalles);
    
    console.log("\n--- CONTEXTO CARGADO ---");
} catch (err) {
    console.error("Error al cargar la memoria:", err.message);
}
