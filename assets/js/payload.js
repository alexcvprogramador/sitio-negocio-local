/*
  payload.js — arma el texto que va dentro del QR para cada tipo de código.

  Cada función recibe los valores del formulario (un objeto con los campos) y devuelve:
    { ok: true,  texto, vista, resumen, aviso }
    { ok: false, campo, error }

  texto   → lo que se codifica en el QR
  vista   → lo mismo, pero sin datos sensibles (la clave del WiFi sale como ••••)
  resumen → nombre corto del tipo de contenido ("Enlace", "WiFi"…)
  aviso   → algo que el usuario debería saber (opcional)

  Se carga como window.QRGen.Payload y en Node con require().
*/
(function (raiz) {
  "use strict";

  var MAX_TEXTO = 2000;

  function limpio(v) {
    return String(v == null ? "" : v).replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
  }
  function ok(texto, vista, resumen, aviso) {
    return { ok: true, texto: texto, vista: vista === null ? texto : vista, resumen: resumen, aviso: aviso || "" };
  }
  function mal(campo, error) {
    return { ok: false, campo: campo, error: error };
  }
  function bytesUtf8(s) {
    return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(s).length : unescape(encodeURIComponent(s)).length;
  }

  var RE_DOMINIO = /^(?:[\p{L}\p{N}-]+\.)+\p{L}{2,}(?::\d{1,5})?(?:[/?#]\S*)?$/u;
  var RE_CORREO = /^[^\s@,;:<>()[\]"\\]+@[^\s@,;:<>()[\]"\\]+\.[^\s@,;:<>()[\]"\\.]{2,}$/;

  /* ---------- Teléfonos ---------- */
  /* Devuelve { valor, conCodigo } o null si no parece un teléfono.
     Un celular chileno de 9 dígitos que empieza con 9 recibe el +56. */
  function normalizarTelefono(entrada) {
    var s = limpio(entrada).replace(/[\s().\-]/g, "");
    var mas = s.charAt(0) === "+";
    var d = s.replace(/^\+/, "");
    if (!/^\d{6,15}$/.test(d)) return null;
    if (!mas && /^00/.test(d)) { d = d.slice(2); mas = true; }
    if (!mas && /^9\d{8}$/.test(d)) return { valor: "+56" + d, digitos: "56" + d, conCodigo: true };
    if (mas) return { valor: "+" + d, digitos: d, conCodigo: true };
    return { valor: d, digitos: d, conCodigo: false };
  }

  /* ---------- Enlace o texto ---------- */
  function enlace(v) {
    var t = limpio(v.texto);
    if (!t) return mal("texto", "Escribe un enlace o un texto.");
    if (t.length > MAX_TEXTO) return mal("texto", "Es demasiado largo. Máximo " + MAX_TEXTO + " caracteres.");
    if (/^https?:\/\/\S+$/i.test(t)) return ok(t, null, "Enlace");
    if (RE_DOMINIO.test(t)) {
      return ok("https://" + t, null, "Enlace", "Se agregó «https://» al principio porque parece una dirección web.");
    }
    return ok(t, null, "Texto");
  }

  /* ---------- WhatsApp ---------- */
  function whatsapp(v) {
    var t = normalizarTelefono(v["wa-numero"]);
    var crudo = limpio(v["wa-numero"]);
    if (!crudo) return mal("wa-numero", "Escribe el número de WhatsApp.");
    if (!t) return mal("wa-numero", "El número solo puede tener dígitos, espacios, guiones y un + al principio.");
    var d = t.digitos;
    if (d.charAt(0) === "0") return mal("wa-numero", "El número no puede empezar con 0. Usa el código de país, por ejemplo +56 9 1234 5678.");
    if (d.length < 8 || d.length > 15) return mal("wa-numero", "Faltan o sobran dígitos. Escríbelo completo, con código de país.");
    var msg = limpio(v["wa-mensaje"]);
    if (msg.length > 500) return mal("wa-mensaje", "El mensaje es demasiado largo. Máximo 500 caracteres.");
    var url = "https://wa.me/" + d + (msg ? "?text=" + encodeURIComponent(msg) : "");
    var aviso = t.conCodigo ? "" : "Sin código de país: solo funcionará si quien escanea está en el mismo país.";
    return ok(url, null, "WhatsApp", aviso);
  }

  /* ---------- WiFi ---------- */
  function escaparWifi(s) { return s.replace(/([\\;,:"])/g, "\\$1"); }

  function wifi(v) {
    var nombre = String(v["wifi-nombre"] == null ? "" : v["wifi-nombre"]).replace(/[\u0000\r\n]/g, "");
    var clave = String(v["wifi-clave"] == null ? "" : v["wifi-clave"]).replace(/[\u0000\r\n]/g, "");
    var seg = v["wifi-seguridad"] || "WPA";
    if (["WPA", "WEP", "nopass"].indexOf(seg) < 0) return mal("wifi-seguridad", "Elige un tipo de seguridad.");
    if (!nombre) return mal("wifi-nombre", "Escribe el nombre de la red.");
    if (bytesUtf8(nombre) > 32) return mal("wifi-nombre", "El nombre de una red WiFi no puede pasar de 32 bytes (unos 32 caracteres sin tildes).");
    if (seg === "WPA") {
      if (clave.length < 8 || clave.length > 63) return mal("wifi-clave", "La clave WPA tiene entre 8 y 63 caracteres.");
    } else if (seg === "WEP") {
      if ([5, 10, 13, 26].indexOf(clave.length) < 0) return mal("wifi-clave", "La clave WEP tiene 5, 10, 13 o 26 caracteres.");
    }
    var oculta = !!v["wifi-oculta"];
    var base = "WIFI:T:" + seg + ";S:" + escaparWifi(nombre) + ";";
    var texto = base + (seg === "nopass" ? "" : "P:" + escaparWifi(clave) + ";") + (oculta ? "H:true;" : "") + ";";
    var vista = base + (seg === "nopass" ? "" : "P:••••••••;") + (oculta ? "H:true;" : "") + ";";
    var aviso = seg === "WEP" ? "WEP es un tipo de seguridad antiguo y fácil de romper. Si tu router lo permite, usa WPA2 o WPA3." : "";
    return ok(texto, vista, "WiFi", aviso);
  }

  /* ---------- Contacto (vCard 3.0) ---------- */
  function escaparVcard(s) {
    return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  function contacto(v) {
    var nombre = limpio(v["c-nombre"]), apellido = limpio(v["c-apellido"]);
    var empresa = limpio(v["c-empresa"]), cargo = limpio(v["c-cargo"]);
    var tel = limpio(v["c-tel"]), correo = limpio(v["c-correo"]), web = limpio(v["c-web"]);
    if (!nombre && !apellido && !empresa) return mal("c-nombre", "Escribe al menos un nombre o el de la empresa.");
    var lineas = ["BEGIN:VCARD", "VERSION:3.0"];
    lineas.push("N:" + escaparVcard(apellido) + ";" + escaparVcard(nombre) + ";;;");
    lineas.push("FN:" + escaparVcard((nombre + " " + apellido).trim() || empresa));
    if (empresa) lineas.push("ORG:" + escaparVcard(empresa));
    if (cargo) lineas.push("TITLE:" + escaparVcard(cargo));
    var aviso = "";
    if (tel) {
      var t = normalizarTelefono(tel);
      if (!t) return mal("c-tel", "El teléfono solo puede tener dígitos, espacios, guiones y un + al principio.");
      lineas.push("TEL;TYPE=CELL:" + t.valor);
      if (!t.conCodigo) aviso = "El teléfono no tiene código de país; al guardarlo en otro país no se podrá marcar.";
    }
    if (correo) {
      if (!RE_CORREO.test(correo)) return mal("c-correo", "Ese correo no parece válido. Revisa que tenga @ y un dominio.");
      lineas.push("EMAIL:" + correo);
    }
    if (web) {
      var url = /^https?:\/\//i.test(web) ? web : "https://" + web;
      if (/\s/.test(url) || !/^https?:\/\/[^/]+\.[^/]{2,}/.test(url)) return mal("c-web", "Esa dirección web no parece válida.");
      lineas.push("URL:" + url);
    }
    lineas.push("END:VCARD");
    return ok(lineas.join("\r\n"), null, "Contacto", aviso);
  }

  /* ---------- Correo ---------- */
  function correo(v) {
    var a = limpio(v["m-correo"]);
    if (!a) return mal("m-correo", "Escribe el correo.");
    if (!RE_CORREO.test(a)) return mal("m-correo", "Ese correo no parece válido. Revisa que tenga @ y un dominio.");
    var asunto = limpio(v["m-asunto"]), cuerpo = limpio(v["m-cuerpo"]);
    if (asunto.length > 200) return mal("m-asunto", "El asunto es demasiado largo. Máximo 200 caracteres.");
    if (cuerpo.length > 800) return mal("m-cuerpo", "El mensaje es demasiado largo. Máximo 800 caracteres.");
    var partes = [];
    if (asunto) partes.push("subject=" + encodeURIComponent(asunto));
    if (cuerpo) partes.push("body=" + encodeURIComponent(cuerpo));
    var texto = "mailto:" + encodeURIComponent(a).replace(/%40/g, "@") + (partes.length ? "?" + partes.join("&") : "");
    return ok(texto, null, "Correo");
  }

  /* ---------- Teléfono ---------- */
  function telefono(v) {
    var crudo = limpio(v["t-numero"]);
    if (!crudo) return mal("t-numero", "Escribe el número de teléfono.");
    var t = normalizarTelefono(crudo);
    if (!t) return mal("t-numero", "El número solo puede tener dígitos, espacios, guiones y un + al principio.");
    var aviso = t.conCodigo ? "" : "Sin código de país: solo se podrá marcar desde el mismo país.";
    return ok("tel:" + t.valor, null, "Teléfono", aviso);
  }

  var TIPOS = { enlace: enlace, whatsapp: whatsapp, wifi: wifi, contacto: contacto, correo: correo, telefono: telefono };

  function construir(tipo, valores) {
    if (!Object.prototype.hasOwnProperty.call(TIPOS, tipo)) return mal("", "Tipo de código desconocido.");
    return TIPOS[tipo](valores || {});
  }

  var Payload = { construir: construir, normalizarTelefono: normalizarTelefono, TIPOS: Object.keys(TIPOS) };

  if (typeof module === "object" && module.exports) {
    module.exports = Payload;
  } else {
    raiz.QRGen = raiz.QRGen || {};
    raiz.QRGen.Payload = Payload;
  }
})(typeof window !== "undefined" ? window : globalThis);
