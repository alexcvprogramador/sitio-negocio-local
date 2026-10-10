// Genera códigos con qr.js y los guarda en pruebas/salida/ para compararlos con librerías de referencia.
// Uso (desde la carpeta del proyecto):   node pruebas/exportar-casos.js
// Después:                               python3 pruebas/verificar-con-librerias.py
const QR = require("../assets/js/qr.js");
const fs = require("fs");
const path = require("path");

const SALIDA = path.join(__dirname, "salida");
fs.mkdirSync(SALIDA, { recursive: true });

// Números pseudoaleatorios con semilla fija: el resultado es el mismo en cada ejecución.
let semilla = 12345;
const azar = () => (semilla = (semilla * 1664525 + 1013904223) >>> 0) / 4294967296;
const generar = (alfabeto, n) => {
  let s = "";
  for (let i = 0; i < n; i++) s += alfabeto[Math.floor(azar() * alfabeto.length)];
  return s;
};

const ABC_BYTES = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;/?&=-_#@!~()[]{}<>'\"+*%$";
const ABC_ALFANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const ABC_NUM = "0123456789";
const NIVELES = ["L", "M", "Q", "H"];
const matriz = (r) => r.modules.map((f) => f.map((b) => (b ? "1" : "0")).join(""));

// Longitud máxima que cabe exactamente en una versión (búsqueda binaria).
function maximo(alfabeto, ecc, version, modo) {
  let lo = 1, hi = 8000, max = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    try {
      QR.encode(generar(alfabeto, mid), { ecc, minVersion: version, maxVersion: version, modo, mascara: 0 });
      max = mid;
      lo = mid + 1;
    } catch (e) {
      hi = mid - 1;
    }
  }
  return max;
}

/* 1. Comparación bit a bit con una librería de referencia:
      versiones 1 a 40, 4 niveles, 3 modos, relleno parcial y completo, máscara fija. */
const comparacion = [];
for (let v = 1; v <= 40; v++) {
  for (const ecc of NIVELES) {
    for (const [modo, alfabeto] of [["bytes", ABC_BYTES], ["alfanumerico", ABC_ALFANUM], ["numerico", ABC_NUM]]) {
      const max = maximo(alfabeto, ecc, v, modo);
      if (!max) continue;
      const largos = modo === "bytes" ? [max, Math.max(1, max - 7), Math.max(1, Math.floor(max / 2))] : [max, Math.max(1, Math.floor(max * 0.7))];
      for (const largo of largos) {
        const texto = generar(alfabeto, largo);
        const mascara = Math.floor(azar() * 8);
        try {
          const r = QR.encode(texto, { ecc, minVersion: v, maxVersion: v, modo, mascara });
          comparacion.push({ texto, ecc, version: v, modo, mascara, matriz: matriz(r) });
        } catch (e) { /* no cabe: se omite */ }
      }
    }
  }
}
fs.writeFileSync(path.join(SALIDA, "casos-comparacion.json"), JSON.stringify(comparacion));

/* 2. Casos para leer con un lector real: textos de uso real y códigos llenos en cada versión. */
const textos = [
  "https://example.com", "https://wa.me/56912345678?text=Hola%2C%20quisiera%20hacer%20un%20pedido", "HOLA MUNDO", "0123456789",
  "WIFI:T:WPA;S:Casa Maqui;P:clave\\;segura;;",
  "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Carrillo;Alexander;;;\r\nFN:Alexander Carrillo\r\nTEL;TYPE=CELL:+56912345678\r\nEND:VCARD",
  "Pastelería «Casa Maqui» — Chillán, ñandú, año 2026 ¿Qué tal? ¡Hola!", "mailto:hola@ejemplo.cl?subject=Consulta&body=Hola", "tel:+56912345678",
  "Día 😀 emoji 🎂", "日本語のテキスト", "a", "1", "A", "ñ", " ", "http://localhost:8080/ruta?x=1&y=2#frag"
];
const lectura = [];
for (const ecc of NIVELES) {
  for (const texto of textos) {
    const r = QR.encode(texto, { ecc });
    lectura.push({ texto, ecc, version: r.version, modo: r.modo, matriz: matriz(r) });
  }
  for (let v = 1; v <= 40; v++) {
    const max = maximo(ABC_BYTES, ecc, v, "bytes");
    if (!max) continue;
    const texto = generar(ABC_BYTES, max);
    const r = QR.encode(texto, { ecc, minVersion: v, maxVersion: v });
    lectura.push({ texto, ecc, version: r.version, modo: r.modo, matriz: matriz(r) });
  }
}
fs.writeFileSync(path.join(SALIDA, "casos-lectura.json"), JSON.stringify(lectura));

console.log("Para comparar con la librería de referencia:", comparacion.length, "códigos");
console.log("Para leer con un lector real:", lectura.length, "códigos");
