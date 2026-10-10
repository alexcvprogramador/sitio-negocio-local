/* ==========================================================================
   DATOS DEL NEGOCIO
   Este es el ÚNICO archivo que necesitas editar para cambiar de rubro.
   Todo lo que ves en la página sale de aquí: nombre, colores, horarios,
   catálogo, preguntas, número de WhatsApp.

   Reglas simples:
   · Escribe los textos entre comillas "así".
   · No borres las comas ni las llaves { }.
   · Si algo está mal escrito, al abrir la página en tu computador aparece
     un aviso arriba que te dice qué corregir. Los visitantes no lo ven.
   · Los textos de ejemplo (demostración) son inventados: cámbialos todos.
   ========================================================================== */
window.NEGOCIO = {

  /* ----- Identidad ------------------------------------------------------ */
  demo: true,                      // true muestra la franja "sitio de demostración". Pon false al publicar el sitio real.
  nombre: "Casa Maqui",
  rubro: "Pastelería artesanal",   // qué es el negocio, en pocas palabras
  ciudad: "Chillán",
  titular: "Kuchen, tortas y dulces hechos cada mañana.",
  bajada: "Arma tu caja, envíanos el pedido por WhatsApp y retira en el local o te lo llevamos.",

  /* ----- Colores (formato #RRGGBB) -------------------------------------- */
  // El color del texto sobre cada fondo se elige solo, para que siempre se lea.
  colores: {
    fondo: "#FBF8FD",      // fondo general de la página
    tinta: "#2B1346",      // textos, bordes y el pie de página
    principal: "#BEE3A6",  // portada
    acento: "#FF5C8A",     // botones importantes
    suave: "#FFE08A"       // franja "Cómo pedir" y detalles
  },

  /* ----- Portada -------------------------------------------------------- */
  // Tres íconos para la portada. Opciones: torta, rebanada, cupcake, galleta,
  // pan, berlin, alfajor, taza, caja, bolsa, tijera, llave, martillo, engranaje, estrella, etiqueta
  // Si tienes una foto propia, ponla en la carpeta assets/img y escribe aquí su nombre,
  // por ejemplo "assets/img/portada.webp". La foto reemplaza a los íconos.
  portada: {
    iconos: ["torta", "rebanada", "cupcake"],
    foto: "",
    fotoAlt: ""        // si pones foto, describe qué muestra (para personas que usan lector de pantalla)
  },
  carga: true,                     // true = pantalla de carga corta al abrir. false = sin pantalla de carga.

  /* ----- Contacto ------------------------------------------------------- */
  // whatsapp: solo números, con código de país y sin el +. Ejemplo Chile: "56912345678"
  whatsapp: "56900000000",
  correo: "",                      // opcional. Ejemplo: "contacto@minegocio.cl"
  instagram: "",                   // opcional. Solo el usuario, sin @. Ejemplo: "casamaqui"
  facebook: "",                    // opcional. Solo el nombre de la página. Ejemplo: "casamaqui"
  direccion: "Calle Ejemplo 123, Chillán",
  referencia: "Dirección de ejemplo, el local no existe.",   // opcional: dato que ayude a ubicarse
  mapa: "Chillán, Ñuble",          // lo que buscan los botones de mapa. Con la dirección exacta del local funciona mejor.

  /* ----- Horario --------------------------------------------------------
     Cada día lleva una lista de tramos "HH:MM-HH:MM" (formato 24 horas).
     Un día cerrado se escribe []. Para dos turnos, dos tramos separados por coma.
     Un tramo no puede pasar de medianoche: para eso, termina el día en "24:00"
     y empieza el siguiente en "00:00".                                       */
  zonaHoraria: "America/Santiago",
  horario: {
    lunes:     [],
    martes:    ["09:00-19:00"],
    miercoles: ["09:00-19:00"],
    jueves:    ["09:00-19:00"],
    viernes:   ["09:00-19:00"],
    sabado:    ["09:00-14:00", "16:00-20:00"],
    domingo:   ["10:00-14:00"]
  },
  notaHorario: "En feriados atendemos solo pedidos hechos con anticipación.",

  /* ----- Tres datos rápidos bajo la portada ------------------------------ */
  puntos: [
    { titulo: "Hecho cada mañana", texto: "Horneamos desde las 6 de la mañana." },
    { titulo: "Encargos con 48 horas", texto: "Para tortas y kuchen enteros." },
    { titulo: "Retiro o despacho", texto: "En el local o dentro de Chillán." }
  ],

  /* ----- Catálogo -------------------------------------------------------- */
  notaCatalogo: "Precios en pesos chilenos. Suma lo que quieras a tu caja y envía el pedido por WhatsApp.",
  categorias: [
    { id: "tortas",  nombre: "Tortas" },
    { id: "kuchen",  nombre: "Kuchen y tartas" },
    { id: "dulces",  nombre: "Dulces" },
    { id: "cafe",    nombre: "Para acompañar" }
  ],
  // Cada producto: categoria (el id de arriba), nombre, descripcion, precio (solo números, sin $ ni puntos),
  // icono (de la lista de la portada) y, si quieres, unidad ("porción"), desde: true, etiqueta ("Más pedida")
  // y foto ("assets/img/mi-foto.webp"). Si no pones precio, aparece "Consultar".
  productos: [
    { categoria: "tortas", nombre: "Torta mil hojas con manjar", descripcion: "Hojaldre crujiente y manjar casero. 12 porciones.", precio: 24900, icono: "torta", etiqueta: "Más pedida" },
    { categoria: "tortas", nombre: "Torta tres leches", descripcion: "Bizcocho húmedo con crema chantilly. 10 porciones.", precio: 22500, icono: "torta" },
    { categoria: "tortas", nombre: "Torta de frambuesa y crema", descripcion: "Bizcocho de vainilla, crema y frambuesas. 12 porciones.", precio: 27900, icono: "torta" },
    { categoria: "tortas", nombre: "Torta de cumpleaños a tu gusto", descripcion: "Cuéntanos tu idea por WhatsApp. Desde 15 porciones.", precio: 32000, desde: true, icono: "torta", etiqueta: "Por encargo" },

    { categoria: "kuchen", nombre: "Kuchen de nuez", descripcion: "Entero, con relleno de nuez y crema pastelera.", precio: 14500, icono: "rebanada" },
    { categoria: "kuchen", nombre: "Kuchen de manzana", descripcion: "Entero, con manzana verde y canela.", precio: 13900, icono: "rebanada" },
    { categoria: "kuchen", nombre: "Tartaleta de limón", descripcion: "Masa quebrada y crema de limón.", precio: 2800, unidad: "unidad", icono: "rebanada" },

    { categoria: "dulces", nombre: "Alfajor de manjar", descripcion: "Con coco rallado en el borde.", precio: 1200, unidad: "unidad", icono: "alfajor" },
    { categoria: "dulces", nombre: "Berlín relleno", descripcion: "Frito al día, con manjar o crema pastelera.", precio: 1500, unidad: "unidad", icono: "berlin" },
    { categoria: "dulces", nombre: "Cupcake de vainilla", descripcion: "Con crema de mantequilla y cobertura.", precio: 2300, unidad: "unidad", icono: "cupcake" },
    { categoria: "dulces", nombre: "Galletas de avena", descripcion: "Bolsa de 6 unidades.", precio: 3500, icono: "galleta" },

    { categoria: "cafe", nombre: "Café americano", descripcion: "Grano tostado en Chile, para tomar en el local.", precio: 1800, icono: "taza" },
    { categoria: "cafe", nombre: "Pan de masa madre", descripcion: "Fermentación lenta de 24 horas.", precio: 3200, icono: "pan" },
    { categoria: "cafe", nombre: "Caja de regalo", descripcion: "Seis dulces surtidos en caja con cinta.", precio: 9800, icono: "caja", etiqueta: "Para regalar" }
  ],

  /* ----- Pedido ---------------------------------------------------------- */
  entrega: ["Retiro en el local", "Despacho en Chillán"],

  /* ----- Cómo pedir (pasos en orden) -------------------------------------- */
  pasos: [
    { titulo: "Arma tu caja", texto: "Elige del catálogo y suma lo que quieras. Puedes cambiar las cantidades cuando quieras." },
    { titulo: "Envía el pedido", texto: "Se abre WhatsApp con tu lista ya escrita. Solo tienes que enviarla." },
    { titulo: "Retira o recibe", texto: "Te confirmamos el total y el horario. Pasas a buscarlo o te lo llevamos." }
  ],

  /* ----- Preguntas frecuentes --------------------------------------------- */
  preguntas: [
    { pregunta: "¿Con cuánta anticipación debo encargar una torta?", respuesta: "Con 48 horas para las tortas del catálogo y con 5 días para diseños a tu gusto." },
    { pregunta: "¿Hacen despacho?", respuesta: "Sí, dentro de Chillán. El costo depende del sector y te lo confirmamos por WhatsApp antes de preparar el pedido." },
    { pregunta: "¿Cómo se paga?", respuesta: "Con transferencia o en efectivo al retirar. Para encargos grandes pedimos un abono del 50%." },
    { pregunta: "¿Hay alérgenos en sus productos?", respuesta: "Todo se prepara en una cocina donde hay gluten, lácteos, huevo y frutos secos. Si tienes alguna alergia, avísanos antes de pedir." }
  ],

  /* ----- Pie de página ---------------------------------------------------- */
  creditos: { texto: "Sitio de demostración hecho por Alexander Carrillo", enlace: "" },   // enlace: una dirección https:// o déjalo vacío

  /* ----- Buscadores -------------------------------------------------------
     Tipo de negocio para Google. Opciones: LocalBusiness, Bakery, Restaurant, CafeOrCoffeeShop,
     HairSalon, BeautySalon, AutoRepair, HardwareStore, Store                                    */
  tipoNegocio: "Bakery"
};
