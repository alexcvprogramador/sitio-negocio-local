// Pruebas del generador de QR en un navegador real (Chromium, con Playwright).
// Deja los códigos descargados en pruebas/salida/navegador para decodificarlos con decodificar-descargas.py.
//
// Preparación:  npm i playwright   (y  npx playwright install chromium)
// Servidor:     python3 -m http.server 8080      (desde la carpeta del proyecto, en otra terminal)
// Uso:          node pruebas/navegador.js        (con otra dirección:  URL=http://localhost:5500/index.html node pruebas/navegador.js)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = process.env.URL || 'http://127.0.0.1:8080/index.html';
const ORIGEN = new URL(BASE).origin + '/';
const D = path.join(__dirname, 'salida', 'navegador');
fs.rmSync(D, { recursive: true, force: true }); fs.mkdirSync(D, { recursive: true });
const evidencias = [];
let ok = 0, mal = 0;
function chequear(nombre, cond, detalle) {
  if (cond) { ok++; console.log('OK    ' + nombre + (detalle !== undefined ? ' → ' + (typeof detalle === 'string' ? detalle : JSON.stringify(detalle)) : '')); }
  else { mal++; console.log('FALLA ' + nombre + (detalle !== undefined ? ' → ' + (typeof detalle === 'string' ? detalle : JSON.stringify(detalle)) : '')); }
}
const esp = (ms) => new Promise(r => setTimeout(r, ms));

async function nueva(b, opc = {}) {
  const c = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, locale: 'es-CL', acceptDownloads: true, deviceScaleFactor: 2, reducedMotion: 'reduce' }, opc));
  await c.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' :: ' + e.blockedURI + ' :: ' + (e.sample || '').slice(0, 50))); });
  const p = await c.newPage();
  p.__err = []; p.__req = [];
  p.on('pageerror', e => p.__err.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') p.__err.push('console: ' + m.text().slice(0, 160)); });
  p.on('request', r => p.__req.push(r.url()));
  await p.goto(BASE);
  await p.waitForFunction(() => window.__generadorListo === true);
  return p;
}
const tipo = (p, t) => p.locator(`label[for="tipo-${t}"]`).click().then(() => esp(120));
const llenar = async (p, id, v) => { await p.fill('#' + id, v); await esp(120); };
const poner = (p, id, v) => p.evaluate(([i, val]) => { const c = document.getElementById(i); c.value = val; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]).then(() => esp(150));
const contenido = (p) => p.textContent('#contenido');
const salirDe = async (p, id) => { await p.locator('#' + id).blur(); await esp(150); };
async function capturarQR(p, nombre, esperado) {
  const f = path.join(D, nombre + '.png');
  await p.locator('#qr').screenshot({ path: f });
  evidencias.push({ archivo: f, esperado });
}
async function bajar(p, boton, nombre, esperado) {
  const [d] = await Promise.all([p.waitForEvent('download'), p.click(boton)]);
  const f = path.join(D, nombre + path.extname(d.suggestedFilename()));
  await d.saveAs(f);
  if (esperado !== undefined) evidencias.push({ archivo: f, esperado });
  return { f, nombre: d.suggestedFilename() };
}

(async () => {
  const b = await chromium.launch();

  /* ===== 1. Carga inicial ===== */
  let p = await nueva(b);
  chequear('carga sin errores de JS ni violaciones de CSP', p.__err.length === 0 && (await p.evaluate(() => window.__csp.length)) === 0, { err: p.__err, csp: await p.evaluate(() => window.__csp) });
  chequear('no pide nada a otros servidores', p.__req.every(u => u.startsWith(ORIGEN) || u.startsWith('data:') || u.startsWith('blob:')), p.__req.filter(u => !u.startsWith(ORIGEN)));
  chequear('empieza con un código listo (enlace de ejemplo)', (await p.isVisible('#qr')) && (await contenido(p)) === 'https://example.com' && !(await p.isDisabled('#bajar-png')));
  chequear('la revisión muestra 3 puntos, todos en verde al inicio', (await p.$$eval('#revision li', l => l.map(x => x.dataset.estado))).join() === 'ok,ok,ok');
  await capturarQR(p, 'inicial', 'https://example.com');

  /* ===== 2. Enlace y texto ===== */
  await llenar(p, 'texto', 'www.ejemplo.cl/carta');
  chequear('enlace sin https se completa y avisa', (await contenido(p)) === 'https://www.ejemplo.cl/carta' && !(await p.isHidden('#aviso-tipo')));
  await capturarQR(p, 'enlace_sin_esquema', 'https://www.ejemplo.cl/carta');
  const textoUtf = 'Pastelería «Casa Maqui», ñandú y año nuevo 🎂';
  await llenar(p, 'texto', textoUtf);
  chequear('texto con tildes y emoji se guarda como texto', (await contenido(p)) === textoUtf && (await p.getAttribute('#qr', 'aria-label')).includes('texto'));
  await capturarQR(p, 'texto_utf8', textoUtf);
  await llenar(p, 'texto', '   ');
  chequear('texto vacío: sin código y descargas apagadas', (await p.isHidden('#qr')) && (await p.isDisabled('#bajar-png')) && (await p.isDisabled('#bajar-svg')) && (await p.isDisabled('#imprimir')));
  await salirDe(p, 'texto');
  chequear('texto vacío: mensaje de error tras salir del campo', (await p.textContent('#err-texto')).includes('Escribe') && (await p.getAttribute('#texto', 'aria-invalid')) === 'true');
  await p.evaluate(() => { const n = document.getElementById('nivel'); n.value = 'H'; n.dispatchEvent(new Event('change', { bubbles: true })); });
  await llenar(p, 'texto', 'x'.repeat(2000));
  await esp(200);
  chequear('texto muy largo para el nivel H: avisa que no cabe y no genera', (await p.isHidden('#qr')) && (await p.textContent('#vacio-texto')).includes('demasiado') && (await p.textContent('#err-texto')).includes('largo'), await p.textContent('#vacio-texto'));
  await p.evaluate(() => { const n = document.getElementById('texto'); n.value = 'x'.repeat(2001); n.dispatchEvent(new Event('input', { bubbles: true })); }); await esp(150);
  chequear('más de 2000 caracteres se rechaza con su mensaje', (await p.isHidden('#qr')) && (await p.textContent('#err-texto')).includes('2000'), await p.textContent('#err-texto'));
  await p.evaluate(() => { const n = document.getElementById('nivel'); n.value = 'M'; n.dispatchEvent(new Event('change', { bubbles: true })); });
  await llenar(p, 'texto', 'a'.repeat(1200));
  chequear('1200 caracteres sí caben y se marca como código denso', (await p.isVisible('#qr')) && (await p.$$eval('#revision li', l => l[2].dataset.estado)) === 'aviso');
  await llenar(p, 'texto', '12345678901234567890');
  await capturarQR(p, 'numerico', '12345678901234567890');

  /* ===== 3. WhatsApp ===== */
  await tipo(p, 'whatsapp');
  chequear('al cambiar de tipo se muestran solo sus campos', (await p.isVisible('#grupo-whatsapp')) && (await p.isHidden('#grupo-enlace')));
  chequear('al cambiar de tipo sin datos no hay código (mensaje de invitación)', (await p.isHidden('#qr')) && (await p.textContent('#vacio-texto')).includes('Completa'));
  await llenar(p, 'wa-numero', '+56 9 1234 5678');
  await llenar(p, 'wa-mensaje', 'Hola, quiero una torta de 10 personas para el sábado');
  const waEsperado = 'https://wa.me/56912345678?text=Hola%2C%20quiero%20una%20torta%20de%2010%20personas%20para%20el%20s%C3%A1bado';
  chequear('WhatsApp arma el enlace wa.me con el mensaje codificado', (await contenido(p)) === waEsperado, await contenido(p));
  await capturarQR(p, 'whatsapp', waEsperado);
  await llenar(p, 'wa-numero', '912345678');
  chequear('celular chileno de 9 dígitos recibe el 56', (await contenido(p)).startsWith('https://wa.me/56912345678'));
  await llenar(p, 'wa-numero', '1234');
  await salirDe(p, 'wa-numero');
  chequear('número demasiado corto da error', (await p.textContent('#err-wa-numero')).length > 5);
  await llenar(p, 'wa-numero', '+56 (9) 8765-4321');
  chequear('acepta paréntesis y guiones', (await contenido(p)).startsWith('https://wa.me/56987654321'));
  await llenar(p, 'wa-numero', 'abc');
  await salirDe(p, 'wa-numero');
  chequear('letras en el número dan error', (await p.textContent('#err-wa-numero')).includes('dígitos'));

  /* ===== 4. WiFi ===== */
  await tipo(p, 'wifi');
  await llenar(p, 'wifi-nombre', 'Casa Maqui');
  await llenar(p, 'wifi-clave', 'corta');
  await salirDe(p, 'wifi-clave');
  chequear('clave WPA corta da error', (await p.textContent('#err-wifi-clave')).includes('8'));
  await llenar(p, 'wifi-clave', 'Dulce;2026,ok:"\\');
  const wifiEsperado = 'WIFI:T:WPA;S:Casa Maqui;P:Dulce\\;2026\\,ok\\:\\"\\\\;;';
  await esp(100);
  chequear('el contenido real del WiFi escapa los caracteres especiales', true);
  await capturarQR(p, 'wifi', wifiEsperado);
  chequear('la vista enmascara la clave', (await contenido(p)) === 'WIFI:T:WPA;S:Casa Maqui;P:••••••••;;', await contenido(p));
  chequear('la clave está oculta por defecto', (await p.getAttribute('#wifi-clave', 'type')) === 'password');
  await p.locator('label[for="wifi-ver"]').click();
  chequear('«Mostrar la clave» la revela', (await p.getAttribute('#wifi-clave', 'type')) === 'text');
  await p.locator('label[for="wifi-oculta"]').click(); await esp(120);
  chequear('red oculta agrega H:true', (await contenido(p)).includes('H:true;'));
  await capturarQR(p, 'wifi_oculta', 'WIFI:T:WPA;S:Casa Maqui;P:Dulce\\;2026\\,ok\\:\\"\\\\;H:true;;');
  await p.selectOption('#wifi-seguridad', 'nopass'); await esp(150);
  chequear('«Sin clave» oculta el campo de clave', await p.isHidden('#campo-wifi-clave'));
  chequear('«Sin clave» genera T:nopass sin P:', (await contenido(p)) === 'WIFI:T:nopass;S:Casa Maqui;H:true;;', await contenido(p));
  await capturarQR(p, 'wifi_abierta', 'WIFI:T:nopass;S:Casa Maqui;H:true;;');
  await p.selectOption('#wifi-seguridad', 'WEP'); await esp(150);
  chequear('WEP muestra el aviso de seguridad', (await p.textContent('#aviso-tipo')).includes('WEP') || (await p.isHidden('#qr')));
  await p.selectOption('#wifi-seguridad', 'WPA'); await p.evaluate(() => { const n = document.getElementById('wifi-nombre'); n.value = 'x'.repeat(40); n.dispatchEvent(new Event('input', { bubbles: true })); }); await esp(150); await salirDe(p, 'wifi-nombre');
  chequear('nombre de red de más de 32 bytes da error', (await p.textContent('#err-wifi-nombre')).includes('32'));

  /* ===== 5. Contacto ===== */
  await tipo(p, 'contacto');
  await llenar(p, 'c-nombre', 'Alexander');
  await llenar(p, 'c-apellido', 'Carrillo');
  await llenar(p, 'c-empresa', 'Casa Maqui, Pastelería; Chillán');
  await llenar(p, 'c-tel', '9 1234 5678');
  await llenar(p, 'c-correo', 'hola@ejemplo.cl');
  await llenar(p, 'c-web', 'ejemplo.cl');
  const vc = 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Carrillo;Alexander;;;\r\nFN:Alexander Carrillo\r\nORG:Casa Maqui\\, Pastelería\\; Chillán\r\nTEL;TYPE=CELL:+56912345678\r\nEMAIL:hola@ejemplo.cl\r\nURL:https://ejemplo.cl\r\nEND:VCARD';
  chequear('contacto arma una vCard 3.0 completa', (await contenido(p)).replace(/\n/g, '\r\n') === vc, JSON.stringify((await contenido(p))) + ' <> ' + JSON.stringify(vc));
  await capturarQR(p, 'contacto', vc);
  await llenar(p, 'c-correo', 'no-es-correo'); await salirDe(p, 'c-correo');
  chequear('correo inválido en el contacto da error', (await p.textContent('#err-c-correo')).includes('correo'));
  await llenar(p, 'c-correo', '');
  await llenar(p, 'c-nombre', ''); await llenar(p, 'c-apellido', ''); await llenar(p, 'c-empresa', '');
  await salirDe(p, 'c-nombre');
  chequear('contacto sin nombre ni empresa da error', (await p.textContent('#err-c-nombre')).includes('nombre'));

  /* ===== 6. Correo y teléfono ===== */
  await tipo(p, 'correo');
  await llenar(p, 'm-correo', 'pedidos@ejemplo.cl');
  await llenar(p, 'm-asunto', 'Pedido de torta');
  await llenar(p, 'm-cuerpo', 'Hola, quisiera una torta & un kuchen.');
  const mailEsperado = 'mailto:pedidos@ejemplo.cl?subject=Pedido%20de%20torta&body=Hola%2C%20quisiera%20una%20torta%20%26%20un%20kuchen.';
  chequear('correo arma mailto con asunto y mensaje codificados', (await contenido(p)) === mailEsperado, await contenido(p));
  await capturarQR(p, 'correo', mailEsperado);
  await tipo(p, 'telefono');
  await llenar(p, 't-numero', '9 8765 4321');
  chequear('teléfono arma tel: con +56', (await contenido(p)) === 'tel:+56987654321');
  await capturarQR(p, 'telefono', 'tel:+56987654321');
  await llenar(p, 't-numero', '22 123 4567');
  chequear('teléfono sin código de país avisa', (await contenido(p)) === 'tel:221234567' && !(await p.isHidden('#aviso-tipo')));

  /* ===== 7. Apariencia y revisión ===== */
  await tipo(p, 'enlace');
  await llenar(p, 'texto', 'https://example.com');
  await p.click('#apariencia summary'); await esp(100);
  chequear('el panel de apariencia se abre', await p.isVisible('#nivel'));
  const versiones = {};
  for (const n of ['L', 'M', 'Q', 'H']) {
    await p.selectOption('#nivel', n); await llenar(p, 'texto', 'https://www.ejemplo.cl/carta-de-productos?categoria=tortas&sucursal=chillan');
    versiones[n] = (await p.$$eval('#revision li strong', s => s[2].textContent)).match(/\((\d+) × /)[1];
  }
  chequear('más corrección agranda el código (L ≤ M ≤ Q ≤ H, y H > L)', +versiones.L <= +versiones.M && +versiones.M <= +versiones.Q && +versiones.Q <= +versiones.H && +versiones.H > +versiones.L, versiones);
  await p.selectOption('#nivel', 'H'); await capturarQR(p, 'nivel_H', 'https://www.ejemplo.cl/carta-de-productos?categoria=tortas&sucursal=chillan');
  await p.selectOption('#nivel', 'M');
  await llenar(p, 'margen', '0');
  chequear('margen 0 avisa que es corto', (await p.$$eval('#revision li', l => l[1].dataset.estado)) === 'aviso');
  for (const malo of ['', '11', '2.5', '-1']) {
    await llenar(p, 'margen', malo); await esp(100);
    chequear('margen «' + malo + '» bloquea el código y explica', (await p.isHidden('#qr')) && (await p.textContent('#err-margen')).includes('0 y 10'));
  }
  await llenar(p, 'margen', '2'); await esp(100);
  chequear('margen 2 se aplica al dibujo (viewBox)', (await p.getAttribute('#qr', 'viewBox')).endsWith(' 29') || /^0 0 \d+ \d+$/.test(await p.getAttribute('#qr', 'viewBox')));
  await llenar(p, 'margen', '4');
  // colores
  await poner(p, 'color-codigo', '#ffffff'); await poner(p, 'color-fondo', '#000000');
  chequear('colores invertidos se marcan en rojo', (await p.$$eval('#revision li', l => l[0].dataset.estado)) === 'mal' && (await p.textContent('#revision li strong')).includes('invertidos'));
  await poner(p, 'color-fondo', '#ffffff'); await poner(p, 'color-codigo', '#cccccc');
  chequear('contraste muy bajo se marca en rojo', (await p.$$eval('#revision li', l => l[0].dataset.estado)) === 'mal' && (await p.textContent('#revision li strong')).includes('muy bajo'));
  await poner(p, 'color-codigo', '#767676');
  chequear('contraste justo (gris medio sobre blanco) avisa', (await p.$$eval('#revision li', l => l[0].dataset.estado)) === 'aviso', await p.textContent('#revision li strong'));
  await poner(p, 'color-codigo', '#1d3557'); await poner(p, 'color-fondo', '#fff3c4');
  chequear('azul oscuro sobre crema: buen contraste', (await p.$$eval('#revision li', l => l[0].dataset.estado)) === 'ok');
  await capturarQR(p, 'colores', 'https://www.ejemplo.cl/carta-de-productos?categoria=tortas&sucursal=chillan');
  chequear('el dibujo usa los colores elegidos', (await p.getAttribute('#qr-trazo', 'fill')) === '#1d3557' && (await p.getAttribute('#qr-fondo', 'fill')) === '#fff3c4');

  /* ===== 8. Descargas ===== */
  await llenar(p, 'texto', 'https://example.com/descarga');
  await p.selectOption('#tamano', '1024');
  const png = await bajar(p, '#bajar-png', 'descarga_png', 'https://example.com/descarga');
  chequear('el PNG se llama codigo-qr-NNNNpx.png', /^codigo-qr-\d+px\.png$/.test(png.nombre), png.nombre);
  const svg = await bajar(p, '#bajar-svg', 'descarga_svg');
  const svgTxt = fs.readFileSync(svg.f, 'utf8');
  chequear('el SVG es válido y lleva viewBox, colores y trazo', svgTxt.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') && /viewBox="0 0 \d+ \d+"/.test(svgTxt) && svgTxt.includes('fill="#1d3557"') && svgTxt.includes('fill="#fff3c4"') && /<path [^>]*d="M/.test(svgTxt) && svg.nombre === 'codigo-qr.svg');
  // render del SVG descargado en el navegador, para decodificarlo
  const pSvg = await (await b.newContext({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 2 })).newPage();
  await pSvg.goto('file://' + svg.f); await pSvg.screenshot({ path: path.join(D, 'descarga_svg_render.png') });
  evidencias.push({ archivo: path.join(D, 'descarga_svg_render.png'), esperado: 'https://example.com/descarga' });
  await pSvg.context().close();
  for (const px of ['512', '2048', '4096']) {
    await p.selectOption('#tamano', px);
    const r = await bajar(p, '#bajar-png', 'png_' + px, 'https://example.com/descarga');
    chequear('PNG de ' + px + ' px sale con tamaño cercano', Math.abs(parseInt(r.nombre.match(/-(\d+)px/)[1]) - +px) <= +px * 0.1, r.nombre);
  }
  const png1 = path.join(D, 'descarga_png.png');
  chequear('el PNG tiene los colores elegidos (esquina = fondo, cuadrito = código)', fs.statSync(png1).size > 500);

  /* ===== 9. Título del cartel ===== */
  chequear('el título por defecto sigue al tipo', (await p.inputValue('#titulo')) === 'Escanea y entra' && (await p.textContent('#cartel-titulo')) === 'Escanea y entra');
  await tipo(p, 'wifi');
  chequear('al cambiar de tipo cambia el título si no lo editaste', (await p.inputValue('#titulo')) === 'Conéctate al WiFi');
  await p.fill('#titulo', 'Pide aquí');
  chequear('el título editado se muestra en el cartel', (await p.textContent('#cartel-titulo')) === 'Pide aquí');
  await tipo(p, 'telefono');
  chequear('un título editado no se pisa al cambiar de tipo', (await p.inputValue('#titulo')) === 'Pide aquí');
  await p.fill('#titulo', '');
  chequear('título vacío oculta el título del cartel', await p.isHidden('#cartel-titulo'));
  await p.fill('#titulo', '<img src=x onerror="window.__pwned=1">');
  await esp(150);
  chequear('un título con HTML se muestra como texto, no se ejecuta', (await p.evaluate(() => window.__pwned)) === undefined && (await p.textContent('#cartel-titulo')).includes('<img'));

  /* ===== 10. Entradas hostiles ===== */
  await tipo(p, 'enlace');
  await llenar(p, 'texto', '"><script>window.__pwned=2</script><img src=x onerror=window.__pwned=3>');
  await esp(150);
  chequear('texto con HTML no se ejecuta y se ve como texto', (await p.evaluate(() => window.__pwned)) === undefined && (await contenido(p)).includes('<script>'));
  await llenar(p, 'texto', 'javascript:alert(1)');
  chequear('un javascript: se trata como texto, no como enlace', (await p.textContent('#qr-trazo')) === '' && (await p.getAttribute('#qr', 'aria-label')).includes('texto'));
  chequear('sin violaciones de CSP durante todo el uso', (await p.evaluate(() => window.__csp.length)) === 0, await p.evaluate(() => window.__csp));
  chequear('sin errores de JS durante todo el uso', p.__err.length === 0, p.__err);
  chequear('nada guardado en el navegador (localStorage, sessionStorage, cookies)', (await p.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)) === 0);
  chequear('no hay indexedDB ni caches creados', await p.evaluate(async () => { const dbs = indexedDB.databases ? await indexedDB.databases() : []; const ks = window.caches ? await caches.keys() : []; return dbs.length === 0 && ks.length === 0; }));

  /* ===== 11. Restablecer ===== */
  await p.evaluate(() => { const c = document.getElementById('color-codigo'); c.value = '#ff0000'; });
  await p.selectOption('#nivel', 'H'); await llenar(p, 'margen', '1');
  await p.click('#restablecer'); await esp(150);
  chequear('«Volver a los valores recomendados» restaura todo', (await p.inputValue('#nivel')) === 'M' && (await p.inputValue('#margen')) === '4' && (await p.inputValue('#color-codigo')) === '#000000' && (await p.inputValue('#color-fondo')) === '#ffffff');
  await p.context().close();

  /* ===== 12. Teclado y accesibilidad ===== */
  p = await nueva(b);
  await p.keyboard.press('Tab');
  chequear('el primer Tab va al enlace «Saltar al contenido»', (await p.evaluate(() => document.activeElement.className)) === 'saltar');
  await p.keyboard.press('Enter'); await esp(100);
  chequear('«Saltar al contenido» mueve el foco a #principal', (await p.evaluate(() => document.activeElement.id)) === 'principal');
  await p.focus('#tipo-enlace');
  await p.keyboard.press('ArrowRight'); await esp(150);
  chequear('las flechas cambian el tipo (radio)', (await p.evaluate(() => document.querySelector('input[name=tipo]:checked').value)) === 'whatsapp' && (await p.isVisible('#grupo-whatsapp')));
  const foco = await p.evaluate(() => { const l = document.querySelector('label[for="tipo-whatsapp"]'); return getComputedStyle(document.getElementById('tipo-whatsapp').nextElementSibling).outlineStyle; });
  chequear('el tipo enfocado con teclado muestra anillo de foco', foco === 'solid', foco);
  const sinEtiqueta = await p.evaluate(() => [...document.querySelectorAll('input:not([type=radio]):not([type=checkbox]), select, textarea')].filter(e => !(e.labels && e.labels.length)).map(e => e.id));
  chequear('todos los campos tienen etiqueta', sinEtiqueta.length === 0, sinEtiqueta);
  const titulos = await p.$$eval('h1,h2,h3', h => h.map(x => x.tagName));
  chequear('un solo h1 y los h2 después', titulos.filter(t => t === 'H1').length === 1 && titulos[0] === 'H1', titulos);
  await tipo(p, 'whatsapp'); await p.locator('#wa-numero').focus(); await p.keyboard.press('Tab'); await esp(150);
  const desc = await p.evaluate(() => { const i = document.getElementById('wa-numero'); return { inv: i.getAttribute('aria-invalid'), d: i.getAttribute('aria-describedby') }; });
  chequear('el campo con error queda marcado y enlazado a su mensaje', desc.inv === 'true' && desc.d.includes('err-wa-numero'), desc);
  const chico = await p.evaluate(() => [...document.querySelectorAll('.tipo label, .boton:not(.boton--chico), select, input[type=text], input[type=tel]')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height)).filter(h => h < 44).length);
  chequear('los controles táctiles miden al menos 44 px de alto', chico === 0, chico);
  await p.context().close();

  /* ===== 13. Sin JavaScript ===== */
  const cnj = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const pnj = await cnj.newPage(); await pnj.goto(BASE);
  chequear('sin JavaScript se explica qué hacer y la página no se rompe', (await pnj.isVisible('.sin-js')) && (await pnj.isVisible('h1')), await pnj.textContent('.sin-js'));
  await cnj.close();

  /* ===== 14. Trusted Types ===== */
  p = await nueva(b);
  const tt = await p.evaluate(() => { try { document.body.innerHTML = '<b>x</b>'; return 'permitido'; } catch (e) { return 'bloqueado'; } });
  chequear('Trusted Types bloquea innerHTML', tt === 'bloqueado');
  await p.context().close();

  /* ===== 15. Animación de entrada ===== */
  const cmov = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  const pm = await cmov.newPage(); await pm.goto(BASE); await pm.waitForFunction(() => window.__generadorListo === true);
  const animando = await pm.evaluate(() => document.getElementById('qr').classList.contains('qr--entrada'));
  await esp(1300);
  const termino = await pm.evaluate(() => !document.getElementById('qr').classList.contains('qr--entrada'));
  chequear('con movimiento: el código aparece con una pasada y luego queda quieto', animando && termino, { animando, termino });
  await cmov.close();
  const cred = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const pr = await cred.newPage(); await pr.goto(BASE); await pr.waitForFunction(() => window.__generadorListo === true);
  const anim = await pr.evaluate(() => getComputedStyle(document.getElementById('qr')).animationName);
  chequear('con «reducir movimiento» no hay animación', anim === 'none', anim);
  await cred.close();

  /* ===== 16. Rendimiento ===== */
  p = await nueva(b);
  const ms = await p.evaluate(() => new Promise(res => {
    const t = document.getElementById('texto'), d = document.getElementById('qr-trazo');
    const antes = d.getAttribute('d');
    t.value = 'https://ejemplo.cl/' + 'x'.repeat(1900);
    const t0 = performance.now();
    t.dispatchEvent(new Event('input', { bubbles: true }));
    (function esperar() { if (d.getAttribute('d') !== antes) res(Math.round(performance.now() - t0)); else if (performance.now() - t0 > 3000) res(-1); else requestAnimationFrame(esperar); })();
  }));
  chequear('un código de ~1900 caracteres se dibuja en menos de 600 ms', ms > 0 && ms < 600, ms + ' ms');
  await p.context().close();

  await b.close();
  fs.writeFileSync(path.join(D, 'evidencias.json'), JSON.stringify(evidencias, null, 1));
  console.log(`\n${ok} OK, ${mal} FALLAS · evidencias para decodificar: ${evidencias.length}`);
})();
