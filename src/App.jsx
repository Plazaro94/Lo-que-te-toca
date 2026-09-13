import React, { useState, useMemo, useEffect } from "react";
import { track } from "@vercel/analytics";

/* ═══════════════════════════════════════════════════════════════
   LO QUE TE TOCA · prototipo v3 · versión web autónoma
   Adaptado para funcionar fuera de una interfaz de IA.
   El almacenamiento usa localStorage del navegador.
   ═══════════════════════════════════════════════════════════════ */

const C = {
  fondo: "#F6F2EC", tarjeta: "#FFFFFF", hondo: "#EDE6DC",
  tinta: "#2A2028", suave: "#6F6169", borde: "#E2D9CE",
  ciruela: "#6E3D5B", miel: "#A0701A", salvia: "#4C7A5E", alerta: "#B0452C",
};
const serif = 'Georgia,"Iowan Old Style","Palatino Linotype",Palatino,serif';
const sans = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

const STORAGE_KEY = "loquetetoca:v3";
const IPREM = 8400;
const EJERCICIOS_RECT = 4;

const CCAA = [
  ["andalucia", "Andalucía"], ["aragon", "Aragón"], ["asturias", "Asturias"],
  ["baleares", "Illes Balears"], ["canarias", "Canarias"], ["cantabria", "Cantabria"],
  ["castillalamancha", "Castilla-La Mancha"], ["castillayleon", "Castilla y León"],
  ["cataluna", "Cataluña"], ["valencia", "Comunitat Valenciana"], ["extremadura", "Extremadura"],
  ["galicia", "Galicia"], ["madrid", "Madrid"], ["murcia", "Murcia"], ["navarra", "Navarra"],
  ["paisvasco", "País Vasco"], ["rioja", "La Rioja"], ["ceuta", "Ceuta"], ["melilla", "Melilla"],
];
const nombreCCAA = (c) => CCAA.find((x) => x[0] === c)?.[1] || "tu comunidad";

const hoy = () => new Date();
const parseF = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const fmtE = (n) => (n == null ? null : new Intl.NumberFormat("es-ES", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0,
}).format(n));
const edadDe = (s) => {
  const d = parseF(s);
  if (!d || Number.isNaN(d.getTime())) return null;
  let e = hoy().getFullYear() - d.getFullYear();
  const m = hoy().getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoy().getDate() < d.getDate())) e--;
  return e;
};

const PREGUNTAS = [
  { id: "comunidad", texto: "¿Dónde vives?", ayuda: "Cada comunidad tiene sus propias ayudas y sus propias deducciones", tipo: "select", opciones: CCAA, prioridad: 100 },
  { id: "municipio", texto: "¿En qué pueblo o ciudad vives?", ayuda: "Los ayuntamientos también dan lo suyo, y casi nadie lo pide", tipo: "texto", prioridad: 90, tras: "comunidad" },
  { id: "nacimiento", texto: "¿Cuándo naciste?", ayuda: "La edad abre y cierra muchas puertas", tipo: "fecha", prioridad: 95 },
  { id: "situacion", texto: "¿A qué te dedicas ahora mismo?", tipo: "select", prioridad: 92,
    opciones: [["asalariado", "Trabajo para una empresa"], ["autonomo", "Soy autónomo"], ["desempleado", "Estoy en paro"], ["estudiante", "Estoy estudiando"], ["jubilado", "Estoy jubilado o cobro una pensión"], ["hogar", "Ahora mismo no trabajo"]] },
  { id: "pareja", texto: "¿Vives en pareja?", tipo: "select", prioridad: 89,
    opciones: [["casado", "Sí, casados"], ["hecho", "Sí, pareja de hecho registrada"], ["junto", "Sí, pero sin papeles"], ["no", "No, vivo sin pareja"]] },
  { id: "adultos", texto: "¿Cuántos adultos vivís en casa, contándote a ti?", ayuda: "Cuenta a tu pareja si vivís juntos, y a cualquier otro adulto: padres, hermanos, compañeros de piso", tipo: "numero", prioridad: 88, tras: "pareja" },
  { id: "hijos", texto: "¿Tienes hijos?", ayuda: "Añade la fecha de nacimiento de cada uno. Si no tienes, pasa de largo", tipo: "fechas", prioridad: 87 },
  { id: "ingresos", texto: "Más o menos, ¿cuánto entra al año en casa?", ayuda: "En bruto y sumando lo de todos. Un número aproximado vale", tipo: "numero", prioridad: 85 },
  { id: "vivienda", texto: "¿Dónde vives ahora?", tipo: "select", prioridad: 84,
    opciones: [["alquiler", "En un piso de alquiler"], ["propiedad", "En una casa mía"], ["cedida", "En una casa cedida o de la familia"], ["sinhogar", "No tengo vivienda estable"]] },
  { id: "renta", texto: "¿Cuánto pagas de alquiler al mes?", tipo: "numero", cuando: (f) => f.vivienda === "alquiler", tras: "vivienda" },
  { id: "anyoCompra", texto: "¿En qué año compraste tu vivienda?", ayuda: "Si fue antes de 2013 conservas un beneficio fiscal que ya no existe para nadie más", tipo: "numero", cuando: (f) => f.vivienda === "propiedad", tras: "vivienda" },
  { id: "pisoAlquilado", texto: "¿Tienes algún piso alquilado a otra persona?", tipo: "sino", ayuda: "Da beneficios fiscales, pero también cuenta como ingreso para otras cosas", cuando: (f) => f.vivienda !== "sinhogar" },
  { id: "titularLuz", texto: "¿La luz está a tu nombre?", tipo: "sino", cuando: (f) => f.vivienda !== "sinhogar", tras: "vivienda" },
  { id: "discapacidad", texto: "¿Hay alguna discapacidad reconocida en casa?", tipo: "select",
    opciones: [["no", "No"], ["leve", "Sí, entre el 33% y el 64%"], ["grave", "Sí, del 65% o más"], ["tramite", "La estamos tramitando"]] },
  { id: "discapacidadQuien", texto: "¿De quién es la discapacidad?", ayuda: "Cambia mucho el resultado: no abre las mismas puertas si es tuya, de un hijo o de un mayor a tu cargo. Marca todas las que haya", tipo: "multi", cuando: (f) => !!f.discapacidad && f.discapacidad !== "no", tras: "discapacidad",
    opciones: [["yo", "Mía"], ["hijo", "De un hijo o hija"], ["mayor", "De un familiar mayor a mi cargo"], ["pareja", "De mi pareja"], ["otro", "De otra persona de casa"]] },
  { id: "dependencia", texto: "¿Cuidas de alguien que no puede valerse solo?", ayuda: "Un padre, una madre, un familiar enfermo. Aunque no cobres nada por ello", tipo: "sino" },
  { id: "embarazo", texto: "¿Hay un embarazo en marcha?", tipo: "sino", cuando: (f) => f.edad != null && f.edad < 50 },
  { id: "guarderia", texto: "¿Algún peque va a guardería de pago?", tipo: "sino", cuando: (f) => f.hijosMenores3 > 0, tras: "hijos" },
  { id: "estudios", texto: "¿Hay alguien estudiando en casa?", ayuda: "Marca todo lo que haya", tipo: "multi", cuando: (f) => f.nHijos > 0 || f.situacion === "estudiante",
    opciones: [["infantil", "Guardería o infantil"], ["obligatoria", "Primaria o ESO"], ["postobligatoria", "Bachillerato o FP"], ["universidad", "Universidad"], ["ninguno", "Nadie estudia"]] },
  { id: "cotizado", texto: "En los últimos 6 años, ¿cuánto tiempo has estado cotizando?", ayuda: "Si no lo sabes de memoria, mira tu vida laboral. A ojo también vale", tipo: "select", cuando: (f) => f.situacion === "desempleado", tras: "situacion",
    opciones: [["mucho", "Más de un año"], ["poco", "Entre 3 meses y un año"], ["nada", "Menos de 3 meses, o nada"]] },
  { id: "altaAutonomo", texto: "¿Cuándo te diste de alta de autónomo?", tipo: "fecha", cuando: (f) => f.situacion === "autonomo", tras: "situacion" },
  { id: "anyosResidencia", texto: "¿Cuánto llevas viviendo en España?", tipo: "select",
    opciones: [["siempre", "Toda la vida, o más de 10 años"], ["media", "Entre 1 y 10 años"], ["poco", "Menos de un año"]] },
  { id: "vehiculo", texto: "¿Tienes coche o moto a tu nombre?", tipo: "sino" },
  { id: "reforma", texto: "¿Te ronda la cabeza reformar la casa?", ayuda: "Cambiar ventanas, poner aislamiento, placas solares, caldera nueva", tipo: "sino", cuando: (f) => f.vivienda === "propiedad" },
  { id: "transporte", texto: "¿Usas el transporte público a menudo?", tipo: "sino" },
  { id: "herencia", texto: "¿Has heredado algo en los últimos años?", tipo: "sino" },
  { id: "violencia", texto: "¿Eres víctima acreditada de violencia de género?", ayuda: "Puedes saltarte esta pregunta sin problema. La hago porque abre derechos que mucha gente no sabe que tiene", tipo: "sino" },
];

const si = (motivo, extra = {}) => ({ estado: "corresponde", motivo, ...extra });
const quiza = (motivo, extra = {}) => ({ estado: "posible", motivo, ...extra });
const no = (motivo) => ({ estado: "descartado", motivo });
const umbral = (f, mult, incr = 0.3) => IPREM * mult * (1 + incr * (f.miembros - 1));
// 1,5×IPREM base + 0,3×IPREM por cada adulto adicional + 0,5×IPREM por cada menor (regla oficial del bono social eléctrico)
const umbralBonoSocial = (f) => IPREM * 1.5 + IPREM * 0.3 * Math.max((f.adultos || 1) - 1, 0) + IPREM * 0.5 * (f.hijosMenores18 || 0);

const D = [
  { id: "imv", a: "Una ayuda mensual si el dinero no llega", n: "Ingreso Mínimo Vital", amb: "Estado", cat: "Prestación", org: "Seguridad Social",
    req: ["ingresos", "adultos", "hijos", "anyosResidencia"], link: "https://www.seg-social.es",
    docs: ["Empadronamiento de toda la casa, con histórico", "Libro de familia", "Justificante de lo que entra en casa", "DNI o NIE de todos"],
    ev: (f) => f.anyosResidencia === "poco" ? no("Piden llevar más tiempo viviendo aquí de forma legal") :
      f.ingresos > umbral(f, 1, 0.3) ? no(`Con lo que entra en casa te quedas fuera. El corte está sobre los ${fmtE(umbral(f, 1, 0.3))}`) :
        quiza("Por ingresos encajas. Antes de darla miran también lo que tienes ahorrado y lo que ganaste el año pasado") },

  { id: "cai", a: "Un extra al mes por cada hijo", n: "Complemento de ayuda para la infancia", amb: "Estado", cat: "Prestación", org: "Seguridad Social",
    req: ["ingresos", "hijos", "adultos"], link: "https://www.seg-social.es",
    docs: ["Libro de familia", "Empadronamiento de toda la casa", "Justificante de ingresos"],
    ev: (f) => f.hijosMenores18 === 0 ? no("Es para menores de 18 años") :
      f.ingresos > umbral(f, 1.5, 0.3) ? no("Los ingresos de casa quedan por encima del corte") :
        quiza("Tienes hijos y los ingresos encajan. Merece la pena que lo mires", { it: "Una cantidad al mes por cada hijo, más alta cuanto más pequeño" }) },

  { id: "nacimientoSS", a: "Tu baja por el nacimiento", n: "Prestación por nacimiento y cuidado de menor", amb: "Estado", cat: "Prestación", org: "Seguridad Social",
    req: ["hijos", "situacion"], link: "https://www.seg-social.es", plazoNota: "No lo dejes: cuanto antes lo pidas, antes cobras",
    docs: ["El informe de maternidad que te dan en el hospital", "Libro de familia", "Certificado de tu empresa", "Tu número de cuenta"],
    ev: (f) => f.hijoMasReciente == null || f.hijoMasReciente > 1 ? no("No hay ningún nacimiento reciente") :
      ["asalariado", "autonomo"].includes(f.situacion) ? si("Acabas de tener un hijo y estás cotizando: esto te toca seguro", { it: "Cobras tu sueldo completo durante todo el permiso" }) :
        quiza("Depende de cuánto habías cotizado justo antes del parto") },

  { id: "riesgo", a: "Baja pagada si tu trabajo es un riesgo para el embarazo", n: "Prestación por riesgo durante el embarazo", amb: "Estado", cat: "Prestación", org: "Seguridad Social o mutua",
    req: ["nacimiento", "embarazo", "situacion"], link: "https://www.seg-social.es",
    docs: ["Informe de tu médico", "Certificado de la empresa describiendo tu puesto"],
    ev: (f) => !f.embarazo ? no("No hay embarazo en marcha") :
      ["asalariado", "autonomo"].includes(f.situacion) ? quiza("Si quien está embarazada tiene un puesto que no se puede adaptar, puede irse a casa cobrando el 100%") :
        no("Hay que estar trabajando y de alta") },

  { id: "paro", a: "El paro de toda la vida", n: "Prestación contributiva por desempleo", amb: "Estado", cat: "Prestación", org: "SEPE",
    req: ["situacion", "cotizado"], link: "https://www.sepe.es", plazoNota: "Tienes 15 días hábiles desde que terminaste. Pasado eso, pierdes días de cobro",
    docs: ["Certificado de empresa", "DNI", "Tu número de cuenta"],
    ev: (f) => f.situacion !== "desempleado" ? no("Ahora mismo no estás en paro") :
      f.cotizado === "mucho" ? si("Has cotizado de sobra: esto es tuyo", { it: "Un porcentaje de tu sueldo, con tope" }) :
        f.cotizado === "poco" ? quiza("Te puede salir una prestación corta. Aunque sean pocos meses, pídela") : no("No llegas a lo mínimo cotizado, pero mira los subsidios de abajo") },

  { id: "subsidio", a: "Una ayuda si el paro no te alcanza", n: "Subsidio por desempleo", amb: "Estado", cat: "Prestación", org: "SEPE",
    req: ["situacion", "cotizado", "ingresos", "adultos"], link: "https://www.sepe.es",
    docs: ["Vida laboral", "Justificante de que no tienes otros ingresos", "Libro de familia si tienes hijos a cargo"],
    ev: (f) => f.situacion !== "desempleado" ? no("Ahora mismo no estás en paro") :
      f.ingresos > IPREM * 0.75 * f.miembros ? no("En casa entra más de lo que permiten para esta ayuda") :
        si("Estás en paro y sin ingresos suficientes: te toca", { it: "Una cantidad fija al mes mientras dure" }) },

  { id: "subsidio52", a: "La ayuda para mayores de 52 años", n: "Subsidio para mayores de 52 años", amb: "Estado", cat: "Prestación", org: "SEPE",
    req: ["nacimiento", "situacion", "ingresos"], link: "https://www.sepe.es",
    docs: ["Vida laboral completa", "Justificante de tus ingresos"],
    ev: (f) => f.edad == null || f.edad < 52 ? no("Es a partir de los 52") :
      f.situacion !== "desempleado" ? no("Hay que estar en paro") :
        quiza("Piden 15 años cotizados en total. Es la ayuda más importante a esta edad porque sigue cotizando para tu jubilación") },

  { id: "pnc", a: "Una pensión aunque no hayas cotizado", n: "Pensión no contributiva", amb: "Estado", cat: "Prestación", org: "Tu comunidad",
    req: ["nacimiento", "ingresos", "discapacidad", "discapacidadQuien", "anyosResidencia"], link: "https://imserso.es",
    docs: ["Empadronamiento con histórico", "Ingresos de todos los que viven contigo", "Certificado de discapacidad si lo hay"],
    ev: (f) => f.ingresos > IPREM * 0.9 * f.miembros ? no("En casa entra por encima del límite") :
      (f.edad != null && f.edad >= 65) ? quiza("Por edad, si no te llega para una pensión normal") :
        (f.discapacidad === "grave" && f.disYo) ? quiza("Por tener una discapacidad del 65% o más") :
          f.discapacidad === "grave" ? quiza("La pensión la pide la persona con la discapacidad, no la familia. Si vive contigo, puede solicitarla ella") :
            no("Es para mayores de 65 o para discapacidad del 65% o más") },

  { id: "dependenciaPr", a: "Ayuda para cuidar a quien no puede valerse", n: "Prestaciones por dependencia", amb: "Estado", cat: "Prestación", org: "Servicios sociales",
    req: ["dependencia"], link: "https://imserso.es", plazoNota: "La valoración tarda meses. Cuanto antes la pidas, antes empieza a contar",
    docs: ["Solicitud de valoración", "Informe de salud del médico de cabecera", "Empadronamiento juntos"],
    ev: (f) => !f.dependencia ? no("No consta que cuides de nadie en esa situación") :
      quiza("Lo primero es pedir la valoración. De ahí sale todo lo demás", { it: "Ayuda a domicilio, centro de día o dinero al mes" }) },

  { id: "cuidador", a: "Cobrar por cuidar a tu familiar", n: "Prestación al cuidador no profesional", amb: "Estado", cat: "Prestación", org: "Tu comunidad",
    req: ["dependencia"], link: "https://imserso.es",
    docs: ["Resolución del grado de dependencia", "Convenio de cuidador no profesional"],
    ev: (f) => !f.dependencia ? no("No consta que cuides de nadie en esa situación") :
      quiza("Si eres tú quien cuida, puedes cobrar por ello y además cotizar para tu jubilación. Mucha gente no lo sabe") },

  { id: "hijodiscap", a: "Ayuda por un hijo con discapacidad", n: "Prestación por hijo a cargo con discapacidad", amb: "Estado", cat: "Prestación", org: "Seguridad Social",
    req: ["hijos", "discapacidad", "discapacidadQuien"], link: "https://www.seg-social.es",
    docs: ["Certificado de discapacidad del niño", "Libro de familia"],
    ev: (f) => f.nHijos === 0 ? no("No hay hijos a cargo") :
      f.discapacidad === "no" ? no("No consta discapacidad reconocida") :
        !f.disHijo ? no("Esta es por un hijo con discapacidad, y la que consta en casa es de otra persona") :
          f.discapacidad === "tramite" ? quiza("En cuanto salga la resolución, vuelve aquí") :
            si("Esta no mira lo que ganas: te toca igual", { it: "Una cantidad fija cada mes, sin límite de ingresos" }) },

  { id: "viudedad", a: "Pensión si fallece tu pareja", n: "Pensión de viudedad y orfandad", amb: "Estado", cat: "Prestación", org: "Seguridad Social",
    req: ["pareja"], link: "https://www.seg-social.es",
    docs: ["Certificado de defunción", "Libro de familia", "Certificado de matrimonio o de pareja de hecho"],
    ev: (f) => f.pareja === "junto" ? quiza("Ojo con esto: si no estáis casados ni registrados como pareja de hecho, no hay pensión de viudedad. Registrarse es gratis y cambia mucho las cosas") :
      f.pareja === "no" ? no("No aplica a tu situación") :
        quiza("Derecho que está ahí por si acaso. Con el matrimonio o el registro de pareja ya lo tienes cubierto") },

  { id: "ceseact", a: "El paro de los autónomos", n: "Cese de actividad", amb: "Estado", cat: "Prestación", org: "Tu mutua",
    req: ["situacion"], link: "https://www.seg-social.es",
    docs: ["Declaraciones trimestrales", "Baja en Hacienda", "Justificación de por qué cierras"],
    ev: (f) => f.situacion !== "autonomo" ? no("Es solo para autónomos") :
      quiza("Si algún día cierras, tienes tu propio paro. Conviene saberlo antes de necesitarlo, no después") },

  { id: "vg", a: "Ayudas si eres víctima de violencia de género", n: "Ayuda del artículo 27 y renta activa de inserción", amb: "Estado", cat: "Prestación", org: "SEPE y tu comunidad",
    req: ["violencia"], link: "https://violenciagenero.igualdad.gob.es",
    docs: ["Acreditación de la situación", "Informe de servicios sociales"],
    ev: (f) => !f.violencia ? no("No aplica según lo que me has contado") :
      si("Tienes varias vías abiertas y prioridad en muchas otras ayudas", { it: "Pago único, renta mensual y prioridad en vivienda" }) },

  { id: "maternidad", a: "1.200 € al año por cada hijo menor de 3", n: "Deducción por maternidad en el IRPF", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["hijos", "situacion"], link: "https://sede.agenciatributaria.gob.es", retro: true, base: "IRPF art. 81",
    docs: ["Modelo 140 si lo quieres cobrar mes a mes", "DNI de la madre y del niño"],
    ev: (f) => f.hijosMenores3 === 0 ? no("Es solo hasta que cumplen 3 años") :
      ["asalariado", "autonomo", "desempleado"].includes(f.situacion) ? si(`Con ${f.hijosMenores3} peque(s) de menos de 3 años, esto es tuyo`, { imp: 1200 * f.hijosMenores3, it: "Puedes cobrarlo cada mes o esperar a la declaración" }) :
        quiza("Hay que estar dado de alta o cobrando una prestación") },

  { id: "guarderiaded", a: "Hasta 1.000 € más por la guardería", n: "Incremento por gastos de custodia", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["guarderia", "hijos"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Facturas de la guardería", "Certificado que el centro emite cada año para Hacienda"],
    ev: (f) => f.hijosMenores3 === 0 ? no("Es solo hasta los 3 años") :
      !f.guarderia ? no("No consta que pagues guardería") : si("Pídele al centro el certificado anual y no lo dejes fuera de la declaración", { imp: 1000 }) },

  { id: "fnded", a: "1.200 € al año por familia numerosa", n: "Deducción por familia numerosa", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["hijos", "situacion"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Título de familia numerosa en vigor", "Modelo 143 para cobrarlo mensual"],
    ev: (f) => f.nHijos < 3 ? no("Hacen falta tres hijos, o dos si hay discapacidad") : si(`Con ${f.nHijos} hijos te toca`, { imp: 1200, it: "Y sube si sois familia numerosa de categoría especial" }) },

  { id: "monoded", a: "1.200 € al año por criar solo a dos hijos", n: "Deducción por ascendiente separado con dos hijos", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["pareja", "hijos"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Libro de familia", "Justificante de que no cobras anualidades por alimentos"],
    ev: (f) => f.pareja !== "no" ? no("Es para quien cría sin pareja") :
      f.nHijos < 2 ? no("Hacen falta dos hijos o más") : si("Crías solo a dos hijos o más: esto se olvida muchísimo", { imp: 1200 }) },

  { id: "discapded", a: "Deducciones por discapacidad", n: "Mínimo y deducción por discapacidad", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["discapacidad", "discapacidadQuien"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Certificado del grado de discapacidad", "La declaración del año que quieras corregir"],
    ev: (f) => f.discapacidad === "no" ? no("No consta discapacidad reconocida") :
      f.discapacidad === "tramite" ? quiza("Importante: cuando salga, cuenta desde el día que lo solicitaste, no desde que te lo dan") :
        (f.disYo || f.disHijo || f.disMayor) ? si("Además de la deducción, te sube el mínimo exento. Muchos años se declara mal por no marcarlo", { imp: 1200 }) :
          quiza("El mínimo por discapacidad se aplica por ti, por un hijo o por un ascendiente a tu cargo. Si es de tu pareja, mirad si os compensa declarar juntos") },

  { id: "alquilerded", a: "Deducción por tu alquiler", n: "Deducción estatal por alquiler de vivienda habitual", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["vivienda"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Contrato de alquiler", "Justificantes de los pagos del año"],
    ev: (f) => f.vivienda !== "alquiler" ? no("No vives de alquiler") :
      quiza("Solo sigue viva para contratos firmados antes de 2015. Mira la fecha del tuyo, que mucha gente la tiene y no la aplica") },

  { id: "viviendaded", a: "Deducción por tu hipoteca", n: "Deducción por inversión en vivienda habitual", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["vivienda", "anyoCompra"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Escritura de compra", "Recibos del préstamo del año"],
    ev: (f) => f.vivienda !== "propiedad" ? no("No tienes vivienda en propiedad") :
      f.anyoCompra && f.anyoCompra < 2013 ? si("Compraste antes de 2013, así que conservas una deducción que ya no existe para nadie más", { it: "Un porcentaje de todo lo que pagas al banco cada año" }) :
        no("Se suprimió para las compras a partir de 2013") },

  { id: "arrendador", a: "Te ahorras impuestos por alquilar tu piso", n: "Reducción por arrendamiento de vivienda", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["pisoAlquilado"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Contrato de alquiler", "Facturas de gastos, IBI, comunidad, seguro y reparaciones"],
    aviso: "Ojo con el otro lado: ese alquiler cuenta como ingreso y te puede dejar fuera del bono social, de las becas o del comedor escolar.",
    ev: (f) => !f.pisoAlquilado ? no("No consta que alquiles ninguna vivienda") :
      si("Si es vivienda habitual del inquilino, buena parte de lo que ganas no tributa", { it: "Y antes de eso puedes descontar casi todos los gastos" }) },

  { id: "eficiencia", a: "Deducción por reformar y gastar menos energía", n: "Deducción por obras de mejora de eficiencia energética", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["reforma", "vivienda"], link: "https://sede.agenciatributaria.gob.es",
    docs: ["Certificado energético antes y después de la obra", "Facturas pagadas por transferencia o tarjeta, nunca en efectivo"],
    ev: (f) => f.vivienda !== "propiedad" ? no("Está pensada para propietarios") :
      !f.reforma ? no("No hay obras a la vista") :
        si("Si vas a reformar, pide el certificado energético antes de empezar. Sin ese papel previo pierdes la deducción", { it: "Un porcentaje de lo que te gastes" }) },

  { id: "conjunta", a: "Mirar si os compensa declarar juntos", n: "Tributación conjunta", amb: "Estado", cat: "Deducción", org: "Hacienda",
    req: ["pareja", "ingresos"], link: "https://sede.agenciatributaria.gob.es", retro: true,
    docs: ["Los datos fiscales de los dos"],
    ev: (f) => !["casado", "hecho"].includes(f.pareja) ? no("Requiere matrimonio o pareja de hecho registrada") :
      quiza("Si uno de los dos gana bastante menos que el otro, juntos suele salir más barato. Se puede simular en un minuto") },

  { id: "herenciaISD", a: "Reducciones al heredar", n: "Impuesto de Sucesiones y Donaciones", amb: "Auton", cat: "Deducción", org: "Tu comunidad",
    req: ["herencia", "comunidad"], plazoNota: "Solo hay 6 meses desde el fallecimiento. Se puede pedir prórroga, pero hay que pedirla a tiempo",
    docs: ["Certificado de defunción", "Testamento o declaración de herederos", "Valoración de los bienes"],
    ev: (f) => !f.herencia ? no("No consta ninguna herencia reciente") :
      si("Cada comunidad tiene sus propias reducciones y varían muchísimo. Es de los sitios donde más dinero se pierde por desconocimiento") },

  { id: "bonoluz", a: "Descuento en la factura de la luz", n: "Bono social eléctrico", amb: "Estado", cat: "Descuento", org: "Tu comercializadora",
    req: ["ingresos", "adultos", "hijos", "titularLuz"], link: "https://www.bonosocial.gob.es", plazoNota: "Caduca. Si no lo renuevas, un día dejas de tenerlo sin que nadie te avise",
    docs: ["Formulario firmado por todos los mayores de 14 años de la casa", "Empadronamiento de todos", "Última factura", "DNI de todos"],
    ev: (f) => !f.titularLuz ? no("El contrato tiene que estar a tu nombre") :
      f.nHijos >= 3 ? si("Siendo familia numerosa te lo dan sin mirar lo que ganáis", { it: "Un descuento fijo en cada factura" }) :
        f.ingresos > umbralBonoSocial(f) ? no(`Con lo que entra en casa te quedas fuera. El corte anda por los ${fmtE(umbralBonoSocial(f))}`) :
          si("Por ingresos entras. Es de las más fáciles de pedir y de las que más se olvidan", { it: "Un descuento fijo en cada factura" }) },

  { id: "bonotermico", a: "Un pago al año para la calefacción", n: "Bono social térmico", amb: "Estado", cat: "Descuento", org: "Tu comunidad",
    req: ["ingresos", "adultos", "hijos", "titularLuz"], link: "https://www.bonosocial.gob.es",
    docs: ["Ninguno: te lo dan solo si ya tienes el bono social de la luz"],
    ev: (f) => !f.titularLuz ? no("Va pegado al titular de la luz") :
      f.ingresos > umbralBonoSocial(f) && f.nHijos < 3 ? no("Va pegado a tener antes el bono social eléctrico") :
        si("Este llega solo si tienes el de la luz. No hay que pedir nada", { it: "Un ingreso una vez al año" }) },

  { id: "bonotelefono", a: "Internet más barato", n: "Bono social de telecomunicaciones", amb: "Estado", cat: "Descuento", org: "Tu operadora",
    req: ["ingresos", "adultos", "hijos"], link: "https://www.telecomunicaciones.gob.es",
    docs: ["Acreditación de tu situación económica", "Contrato de la línea"],
    ev: (f) => f.ingresos > umbral(f, 1.5, 0.25) ? no("Los ingresos quedan por encima del corte") :
      quiza("Descuento en la cuota de internet. Se pide a la operadora, no a la administración") },

  { id: "farmacia", a: "Pagar menos en la farmacia", n: "Aportación reducida en prestación farmacéutica", amb: "Estado", cat: "Descuento", org: "Seguridad Social",
    req: ["ingresos", "situacion", "discapacidad", "discapacidadQuien"], link: "https://www.seg-social.es",
    docs: ["Se aplica solo, pero conviene comprobar en qué tramo te han puesto"],
    ev: (f) => (f.ingresos < 18000 || f.disYo || f.situacion === "jubilado") ?
      si("Por tu situación te toca un tramo reducido. A veces está mal asignado y se paga de más durante años", { it: "Menos porcentaje en cada receta y un tope al mes" }) :
      no("Te corresponde el tramo general") },

  { id: "fntitulo", a: "El carné de familia numerosa", n: "Título de familia numerosa", amb: "Auton", cat: "Acceso", org: "Tu comunidad",
    req: ["hijos", "discapacidad", "discapacidadQuien", "comunidad"], plazoNota: "Sácalo lo primero: es la llave que abre casi todo lo demás",
    docs: ["Libro de familia", "Empadronamiento de todos", "DNI de los padres", "Fotos de carné"],
    ev: (f) => f.nHijos >= 3 ? si(`Con ${f.nHijos} hijos te toca, y este papel te abre descuentos en el IBI, el transporte, las matrículas y las tasas`) :
      (f.nHijos === 2 && (f.disHijo || f.disYo || f.disPareja)) ? quiza("Con dos hijos y una discapacidad de un hijo o de un progenitor puede salir. Merece preguntarlo") :
        no("Hacen falta tres hijos, o dos si un hijo o un progenitor tiene discapacidad") },

  { id: "carnejoven", a: "Descuentos por ser joven", n: "Carné Joven", amb: "Auton", cat: "Descuento", org: "Instituto de la juventud",
    req: ["nacimiento", "comunidad"], link: "https://www.injuve.es", docs: ["DNI"],
    ev: (f) => f.edad == null ? no("Me falta tu fecha de nacimiento") :
      f.edad <= 30 ? si(`Con ${f.edad} años lo tienes`, { it: "Transporte, alojamiento, cultura, cursos" }) : no("Es hasta los 30") },

  { id: "transportebono", a: "Abono de transporte más barato", n: "Bonificaciones en títulos de transporte", amb: "Auton", cat: "Descuento", org: "Consorcio de transporte",
    req: ["transporte", "nacimiento", "comunidad"],
    docs: ["Tarjeta de transporte personalizada", "Lo que acredite tu situación: edad, familia numerosa o paro"],
    ev: (f) => !f.transporte ? no("No usas transporte público habitualmente") :
      si("Casi todos los consorcios bonifican a jóvenes, mayores, familias numerosas y gente en paro. Se pide una vez y ya está") },

  { id: "moves", a: "Descuento al comprar coche eléctrico", n: "Plan MOVES", amb: "Estado", cat: "Ayuda", org: "IDAE y tu comunidad",
    req: ["vehiculo"], link: "https://www.idae.es",
    docs: ["Presupuesto o factura del vehículo", "Baja del coche viejo si lo achatarras"],
    aviso: "Ojo: en algunos casos esta ayuda tributa como ingreso al año siguiente. Cuéntalo antes de decidir.",
    ev: () => quiza("Solo tiene sentido si te vas a cambiar de coche. Va por convocatorias y se agota") },

  { id: "ivtm", a: "No pagar el impuesto del coche", n: "Exención del IVTM por discapacidad", amb: "Local", cat: "Descuento", org: "Tu ayuntamiento",
    req: ["vehiculo", "discapacidad", "discapacidadQuien", "municipio"],
    docs: ["Certificado de discapacidad", "Permiso de circulación", "Declaración de para qué usas el coche"],
    ev: (f) => !f.vehiculo ? no("No tienes vehículo a tu nombre") :
      f.discapacidad === "no" ? no("Hace falta discapacidad reconocida") :
        f.disYo ? si("Tienes coche y discapacidad reconocida: no deberías pagar este impuesto", { it: "Exención completa, todos los años" }) :
          quiza("La exención va ligada a la persona con discapacidad: sale si el coche está a su nombre, o si se usa para llevarla habitualmente") },

  { id: "tarifaplana", a: "Cuota reducida de autónomo", n: "Tarifa reducida en el RETA", amb: "Estado", cat: "Descuento", org: "Seguridad Social",
    req: ["situacion", "altaAutonomo"], link: "https://www.seg-social.es",
    docs: ["Alta en el RETA", "Declaración de que no estuviste de alta antes"],
    ev: (f) => f.situacion !== "autonomo" ? no("Es solo para autónomos") :
      f.mesesAutonomo != null && f.mesesAutonomo <= 24 ? si("Te diste de alta hace poco, así que pagas menos cuota. Comprueba que te la estén aplicando") :
        no("El periodo de cuota reducida ya habría pasado") },

  { id: "alquilerjoven", a: "Ayuda al alquiler si eres joven", n: "Ayudas al alquiler para jóvenes", amb: "Auton", cat: "Ayuda", org: "Tu comunidad",
    req: ["nacimiento", "vivienda", "ingresos", "comunidad"], plazoNota: "El dinero se acaba. Se conceden por orden de llegada, así que el primer día importa",
    docs: ["Contrato de alquiler", "Todos los recibos pagados", "Vida laboral", "Declaración de la renta", "Empadronamiento"],
    ev: (f) => f.vivienda !== "alquiler" ? no("No vives de alquiler") :
      f.edad == null || f.edad >= 36 ? no("Estas líneas suelen cortar a los 35") :
        f.ingresos > IPREM * 3 ? quiza("Puede que te pases del límite de renta. Depende de la convocatoria de este año") :
          si(`Con ${f.edad} años y viviendo de alquiler, esta es de las más importantes para ti`) },

  { id: "alquilergeneral", a: "Ayuda al alquiler general", n: "Ayudas al alquiler de vivienda", amb: "Auton", cat: "Ayuda", org: "Tu comunidad",
    req: ["vivienda", "ingresos", "renta", "comunidad"],
    docs: ["Contrato", "Todos los recibos del año", "Justificante de ingresos", "Empadronamiento"],
    ev: (f) => f.vivienda !== "alquiler" ? no("No vives de alquiler") :
      f.esfuerzo != null && f.esfuerzo > 0.3 ? si(`El alquiler se te lleva el ${Math.round(f.esfuerzo * 100)}% de lo que entra en casa. Eso te pone en cabeza en casi cualquier baremo`) :
        quiza("Depende de cuánto pese el alquiler sobre tus ingresos y del baremo de este año") },

  { id: "vpo", a: "Apuntarte a la lista de vivienda protegida", n: "Registro de solicitantes de vivienda protegida", amb: "Auton", cat: "Acceso", org: "Tu comunidad",
    req: ["vivienda", "ingresos", "comunidad"], plazoNota: "Cuanto antes te apuntes, más antigüedad acumulas. Es gratis y no obliga a nada",
    docs: ["Declaración de la renta", "Empadronamiento", "Declaración de que no tienes otra vivienda"],
    ev: (f) => f.vivienda === "propiedad" ? no("Tener casa propia suele dejarte fuera") :
      si("Apuntarte hoy no te cuesta nada y empieza a contar antigüedad desde ya. Es el consejo más rentable de esta lista") },

  { id: "urgencia", a: "Ayuda urgente si no llegas este mes", n: "Ayudas de urgencia social", amb: "Local", cat: "Ayuda", org: "Servicios sociales de tu ayuntamiento",
    req: ["ingresos", "adultos", "municipio"],
    docs: ["Pide cita con el trabajador social de tu zona", "Justificantes de gastos e ingresos"],
    ev: (f) => f.ingresos > umbral(f, 1.2, 0.3) ? no("Están pensadas para situaciones de necesidad puntual") :
      si("Tu ayuntamiento tiene fondo propio para luz, alquiler o comida. Se resuelve en semanas, no en meses") },

  { id: "rehabilitacion", a: "Ayuda para reformar la casa", n: "Ayudas a la rehabilitación de vivienda", amb: "Auton", cat: "Ayuda", org: "Tu comunidad",
    req: ["reforma", "vivienda", "comunidad"],
    docs: ["Proyecto técnico", "Certificado energético previo", "Acuerdo de la comunidad si la obra es del edificio"],
    ev: (f) => !f.reforma ? no("No hay obras a la vista") : si("Cuanto más baje el consumo del edificio, más te cubren. A veces llega a la mitad de la obra") },

  { id: "becamec", a: "Beca para estudiar", n: "Beca general del Ministerio de Educación", amb: "Estado", cat: "Ayuda", org: "Ministerio de Educación",
    req: ["estudios", "ingresos", "adultos", "hijos"], link: "https://www.becaseducacion.gob.es", plazoNota: "Se pide en primavera, antes de matricularse. Si esperas a septiembre, ya no hay nada que hacer",
    docs: ["DNI de todos los de casa", "Matrícula del curso", "Cuenta bancaria del estudiante"],
    ev: (f) => !f.estudiaPost ? no("No hay nadie en bachillerato, FP o universidad") :
      f.ingresos > ({ 1: 14000, 2: 24000, 3: 32000, 4: 38000 }[Math.min(f.miembros, 4)] || 44000) * 1.15 ? no("Los ingresos quedan por encima del umbral") :
        si("Hay estudiante en casa y los ingresos encajan. Pídela aunque dudes: solicitarla es gratis") },

  { id: "becanee", a: "Ayuda si tu hijo necesita apoyo escolar", n: "Ayudas para alumnado con necesidad específica de apoyo", amb: "Estado", cat: "Ayuda", org: "Ministerio de Educación",
    req: ["hijos", "discapacidad", "discapacidadQuien"], link: "https://www.becaseducacion.gob.es",
    docs: ["Certificado de discapacidad o informe del orientador del colegio", "Presupuesto del logopeda o del apoyo"],
    ev: (f) => f.nHijos === 0 ? no("No hay hijos a cargo") :
      f.discapacidad === "no" ? no("Hace falta discapacidad o necesidad educativa acreditada") :
        !f.disHijo ? no("Esta va por el alumno: la discapacidad que consta en casa es de otra persona") :
          si("Esta no mira lo que ganas. Cubre logopeda, reeducación y transporte, y muchísima gente no la pide") },

  { id: "comedor", a: "Comedor escolar gratis o casi", n: "Ayudas de comedor escolar", amb: "Auton", cat: "Ayuda", org: "Tu comunidad",
    req: ["estudios", "ingresos", "hijos", "adultos", "comunidad"], plazoNota: "Se pide antes del verano. Si se te pasa, pierdes el curso entero",
    docs: ["Matrícula del colegio", "Declaración de la renta de la familia", "Empadronamiento de todos", "Libro de familia"],
    ev: (f) => !f.estudiaObligatoria ? no("No hay hijos en primaria ni ESO") :
      f.ingresos > umbral(f, 2, 0.4) ? no("Los ingresos quedan por encima del baremo") :
        si("Encajas en el baremo. Es una de las que más dinero ahorra al año") },

  { id: "libros", a: "Ayuda para libros y material", n: "Ayudas para libros de texto", amb: "Auton", cat: "Ayuda", org: "Tu comunidad o ayuntamiento",
    req: ["estudios", "ingresos", "hijos", "comunidad"],
    docs: ["Matrícula", "Facturas del material", "Declaración de la renta"],
    ev: (f) => !f.estudiaObligatoria ? no("No hay hijos en enseñanza obligatoria") :
      quiza("Existe en casi todas partes, a veces por la comunidad y a veces por el ayuntamiento o el AMPA") },

  { id: "escuela03", a: "Guardería gratis o bonificada", n: "Ayudas a la escolarización de 0 a 3 años", amb: "Auton", cat: "Ayuda", org: "Tu comunidad o ayuntamiento",
    req: ["hijos", "guarderia", "comunidad"],
    docs: ["Matrícula de un centro autorizado", "Justificante de ingresos", "Libro de familia"],
    ev: (f) => f.hijosMenores3 === 0 ? no("No hay peques de menos de 3 años") :
      si("Cada vez más comunidades cubren el primer ciclo entero. Comprueba si el centro está autorizado, que es el requisito que más falla") },

  { id: "casals", a: "Campamentos de verano a precio reducido", n: "Actividades municipales de verano", amb: "Local", cat: "Ayuda", org: "Tu ayuntamiento",
    req: ["hijos", "ingresos", "municipio"], plazoNota: "Las plazas vuelan en primavera",
    docs: ["Inscripción en el ayuntamiento", "Justificante de ingresos", "Justificante de que los dos trabajáis"],
    ev: (f) => f.hijosMenores18 === 0 ? no("No hay menores a cargo") :
      si("Precio según lo que ganes, y suelen dar prioridad si los dos trabajáis") },

  { id: "autonNacimiento", a: "Deducción de tu comunidad por el nacimiento", n: "Deducción autonómica por nacimiento o adopción", amb: "Auton", cat: "Deducción", org: "Tu comunidad, vía IRPF",
    req: ["hijos", "comunidad"], retro: true,
    docs: ["Certificado de nacimiento", "La declaración del año del nacimiento"],
    ev: (f) => f.hijoMasReciente == null || f.hijoMasReciente > EJERCICIOS_RECT ? no("No hay nacimientos dentro de los años que aún se pueden corregir") :
      si(`Nació hace ${f.hijoMasReciente} año(s), así que todavía estás a tiempo`, { it: "Casi todas las comunidades tienen la suya, con importes distintos" }) },

  { id: "autonAlquiler", a: "Deducción de tu comunidad por el alquiler", n: "Deducción autonómica por arrendamiento", amb: "Auton", cat: "Deducción", org: "Tu comunidad, vía IRPF",
    req: ["vivienda", "comunidad", "nacimiento"], retro: true,
    docs: ["Contrato de alquiler", "Justificantes de pago", "El NIF del casero"],
    ev: (f) => f.vivienda !== "alquiler" ? no("No vives de alquiler") :
      si("Va aparte de la estatal. Suele estar reservada a jóvenes, gente en paro, familias numerosas o rentas bajas") },

  { id: "autonGuarderia", a: "Deducción de tu comunidad por la guardería", n: "Deducción autonómica por gastos de custodia", amb: "Auton", cat: "Deducción", org: "Tu comunidad, vía IRPF",
    req: ["guarderia", "hijos", "comunidad"], retro: true,
    docs: ["Facturas del centro", "La declaración de ese año"],
    ev: (f) => !f.guarderia ? no("No consta gasto en guardería") : si("Esta se suma a la estatal, no la sustituye. Se pueden llevar las dos") },

  { id: "autonEstudios", a: "Deducción de tu comunidad por gastos del cole", n: "Deducción autonómica por gastos educativos", amb: "Auton", cat: "Deducción", org: "Tu comunidad, vía IRPF",
    req: ["estudios", "comunidad"], retro: true,
    docs: ["Facturas de libros, idiomas, uniformes o transporte escolar", "La declaración de ese año"],
    ev: (f) => (!f.estudiaObligatoria && !f.estudiaPost) ? no("No hay estudiantes en casa") :
      si("Guarda las facturas del uniforme, los libros y las clases de inglés. En varias comunidades desgravan y casi nadie lo aplica") },

  { id: "autonMayores", a: "Deducción por cuidar de un mayor", n: "Deducción autonómica por cuidado de ascendientes", amb: "Auton", cat: "Deducción", org: "Tu comunidad, vía IRPF",
    req: ["dependencia", "comunidad"], retro: true,
    docs: ["Certificado de convivencia", "Grado de dependencia o discapacidad", "La declaración de ese año"],
    ev: (f) => !f.dependencia ? no("No consta que cuides de nadie en casa") :
      si("Si convive contigo, en muchas comunidades desgrava. Y se puede corregir hacia atrás") },

  { id: "rentaAuton", a: "La renta mínima de tu comunidad", n: "Renta mínima de inserción autonómica", amb: "Auton", cat: "Prestación", org: "Servicios sociales de tu comunidad",
    req: ["ingresos", "adultos", "hijos", "comunidad"],
    docs: ["Empadronamiento continuado", "Justificante de ingresos", "Vida laboral", "Declaración de bienes"],
    ev: (f) => f.ingresos > umbral(f, 0.95, 0.25) ? no("Los ingresos quedan por encima del corte") :
      quiza("Va encima del IMV, no en lugar de él. Suelen pedir que primero agotes lo estatal") },

  { id: "natalidadRural", a: "Dinero por tener un hijo en un pueblo pequeño", n: "Ayudas municipales a la natalidad", amb: "Local", cat: "Ayuda", org: "Tu ayuntamiento o diputación",
    req: ["hijos", "municipio"],
    docs: ["Empadronamiento", "Libro de familia", "Compromiso de quedarte unos años"],
    ev: (f) => f.hijoMasReciente == null || f.hijoMasReciente > 2 ? no("No hay nacimientos recientes") :
      quiza("Muchos pueblos pagan por cada nacimiento y por empadronarse. Nadie se entera porque solo se publica en el tablón") },

  { id: "ibiFn", a: "Descuento en el IBI por familia numerosa", n: "Bonificación del IBI", amb: "Local", cat: "Descuento", org: "Tu ayuntamiento",
    req: ["hijos", "vivienda", "municipio"], plazoNota: "Hay que pedirlo antes de que emitan el recibo del año, normalmente en los primeros meses",
    docs: ["Título de familia numerosa", "Último recibo del IBI", "Empadronamiento en esa vivienda"],
    ev: (f) => f.nHijos < 3 ? no("Hace falta el título de familia numerosa") :
      f.vivienda !== "propiedad" ? no("Es para la vivienda en propiedad") :
        si("En algunos municipios llega al 90% del recibo. Se pide una vez y hay que renovarlo cada año") },

  { id: "ibiSolar", a: "Descuento en el IBI por poner placas", n: "Bonificación del IBI por energías renovables", amb: "Local", cat: "Descuento", org: "Tu ayuntamiento",
    req: ["vivienda", "reforma", "municipio"],
    docs: ["Certificado de la instalación", "Licencia de obra", "Recibo del IBI"],
    ev: (f) => f.vivienda !== "propiedad" ? no("Es para propietarios") :
      quiza("Si pones autoconsumo, muchos ayuntamientos te bajan el IBI durante varios años. Hay que pedirlo, no llega solo") },

  { id: "tasas", a: "Descuentos en las tasas del ayuntamiento", n: "Bonificaciones en tributos y tasas municipales", amb: "Local", cat: "Descuento", org: "Tu ayuntamiento",
    req: ["ingresos", "municipio", "adultos"],
    docs: ["Empadronamiento", "Justificante de ingresos", "El recibo de la tasa que quieras bonificar"],
    ev: () => quiza("Basura, agua, escuela de música, piscina. Casi todas tienen descuento por renta, edad o familia numerosa, y van una por una") },

  { id: "agua", a: "Agua más barata", n: "Tarifa social del agua", amb: "Local", cat: "Descuento", org: "La empresa de aguas de tu municipio",
    req: ["ingresos", "adultos", "hijos", "municipio"],
    docs: ["Factura del agua a tu nombre", "Justificante de ingresos", "Empadronamiento de todos"],
    ev: (f) => f.ingresos > umbral(f, 2, 0.25) ? no("Los ingresos quedan por encima del corte habitual") :
      si("Entras por ingresos. Se pide a la empresa del agua, no al ayuntamiento") },
];

const FAMILIAS = [
  ["Vivienda y alquiler", ["alquilerded", "alquilerjoven", "alquilergeneral", "vpo", "rehabilitacion", "viviendaded", "arrendador", "eficiencia", "autonAlquiler"]],
  ["Familia e hijos", ["cai", "nacimientoSS", "maternidad", "guarderiaded", "fnded", "monoded", "hijodiscap", "autonNacimiento", "autonGuarderia", "natalidadRural", "escuela03"]],
  ["Empleo y autónomos", ["paro", "subsidio", "subsidio52", "ceseact", "tarifaplana"]],
  ["Estudios y becas", ["becamec", "becanee", "comedor", "libros", "autonEstudios"]],
  ["Salud y dependencia", ["dependenciaPr", "cuidador", "discapded", "pnc", "autonMayores"]],
  ["Energía y hogar", ["bonoluz", "bonotermico", "bonotelefono", "agua", "ibiSolar", "ibiFn", "tasas", "moves", "ivtm"]],
].map(([nombre, ids]) => [nombre, ids.length]);

function derivar(r) {
  const hijos = Array.isArray(r.hijos) ? r.hijos.filter(Boolean) : [];
  const edades = hijos.map((h) => edadDe(h)).filter((e) => e != null);
  const adultos = Number(r.adultos) || 1;
  const est = Array.isArray(r.estudios) ? r.estudios : [];
  const quienDis = Array.isArray(r.discapacidadQuien) ? r.discapacidadQuien : [];
  const f = {
    ...r,
    disYo: quienDis.includes("yo"),
    disHijo: quienDis.includes("hijo"),
    disMayor: quienDis.includes("mayor"),
    disPareja: quienDis.includes("pareja"),
    edad: r.nacimiento ? edadDe(r.nacimiento) : null,
    adultos, nHijos: hijos.length, edades,
    miembros: adultos + hijos.length,
    hijosMenores3: edades.filter((e) => e < 3).length,
    hijosMenores18: edades.filter((e) => e < 18).length,
    hijoMasReciente: edades.length ? Math.min(...edades) : null,
    ingresos: Number(r.ingresos) || 0,
    renta: Number(r.renta) || 0,
    anyoCompra: Number(r.anyoCompra) || null,
    estudiaObligatoria: est.includes("obligatoria") || edades.some((e) => e >= 6 && e <= 16),
    estudiaPost: est.includes("postobligatoria") || est.includes("universidad") || r.situacion === "estudiante",
    mesesAutonomo: r.altaAutonomo ? Math.round((hoy() - parseF(r.altaAutonomo)) / 2.63e9) : null,
  };
  f.esfuerzo = f.ingresos > 0 && f.renta > 0 ? (f.renta * 12) / f.ingresos : null;
  return f;
}
/* Cómo llega cada ayuda a tu bolsillo. Es la diferencia que de verdad importa:
   - automatica: te la aplican sin que hagas nada.
   - evidente: hay que pedirla, pero alguien te lo va a decir (el hospital, la
     empresa, el SEPE, el colegio). Difícil que se te escape.
   - silenciosa: nadie te va a avisar. Si no te enteras y la pides, se pierde.
   Todo lo que no esté listado aquí es silencioso, que es la norma. */
const AUTOMATICAS = ["bonotermico", "farmacia"];
const EVIDENTES = [
  "nacimientoSS", "riesgo", "paro", "subsidio", "subsidio52", "viudedad", "ceseact",
  "maternidad", "viviendaded", "conjunta", "herenciaISD", "moves", "tarifaplana",
  "becamec", "comedor", "libros",
];
const obtencionDe = (id) =>
  AUTOMATICAS.includes(id) ? "automatica" : EVIDENTES.includes(id) ? "evidente" : "silenciosa";

const OBTENCION_TEXTO = {
  automatica: { etiqueta: "Te llega sola", detalle: "No tienes que pedir nada: se aplica automáticamente." },
  evidente: { etiqueta: "Hay que pedirla", detalle: "Hay que solicitarla, pero es de las que se ven venir: normalmente alguien te avisa." },
  silenciosa: { etiqueta: "Nadie te va a avisar", detalle: "Si no la pides tú, nadie lo va a hacer por ti. Aquí es donde se pierde el dinero." },
};

/* Enlaces. Antes todas apuntaban a la home del organismo y había que buscar a mano,
   y 24 ayudas no tenían enlace ninguno. Ahora: si hay una URL directa verificada se
   usa esa; si no, se manda al usuario a una búsqueda ya escrita con el nombre oficial
   del trámite, acotada al dominio del organismo o a su comunidad o municipio. */
const buscar = (terminos) => `https://www.google.com/search?q=${encodeURIComponent(terminos.filter(Boolean).join(" "))}`;
const dominioDe = (url) => { try { return new URL(url).hostname; } catch { return null; } };

function enlaceDe(x, r, nombreComunidad) {
  if (x.directo) return { url: x.directo, texto: "Ir a pedirla", directo: true };
  const dominio = x.link ? dominioDe(x.link) : null;
  if (dominio) return { url: buscar([`site:${dominio}`, `"${x.n}"`]), texto: "Buscar cómo se pide", directo: false };
  const territorio = x.amb === "Local" ? (r.municipio || nombreComunidad) : nombreComunidad;
  return { url: buscar([`"${x.n}"`, territorio, "sede electrónica"]), texto: "Buscar cómo se pide", directo: false };
}

const contestada = (r, id) => r[id] !== undefined && r[id] !== "";
const POR_ID = Object.fromEntries(PREGUNTAS.map((p) => [p.id, p]));
// Una pregunta que no aplica a tu caso (el alquiler si tienes casa propia) no debe
// bloquear para siempre a la regla que la pedía: nunca te la van a preguntar.
const aplicable = (id, f) => {
  const p = POR_ID[id];
  return !p || !p.cuando || p.cuando(f);
};

function evaluar(r) {
  const f = derivar(r);
  return D.map((d) => {
    const obt = obtencionDe(d.id);
    const faltan = d.req.filter((q) => !contestada(r, q) && aplicable(q, f));
    if (faltan.length) return { ...d, obt, estado: "desconocido", faltan };
    return { ...d, obt, ...d.ev(f), faltan: [] };
  });
}

function siguiente(r, saltadas, ultima = null) {
  const f = derivar(r);
  const pend = evaluar(r).filter((x) => x.estado === "desconocido");
  const cand = PREGUNTAS.filter((p) => !contestada(r, p.id) && !saltadas.includes(p.id) && (!p.cuando || p.cuando(f)));
  if (!cand.length) return null;
  const s = cand.map((p) => ({ ...p, desbloquea: pend.filter((d) => d.req.includes(p.id)).length }));
  // Cuántas ayudas desbloquea, más la prioridad de guion. Una pregunta marcada como
  // continuación de otra salta al frente justo después de su pregunta madre.
  const puntua = (p) => p.desbloquea + (p.prioridad || 0) + (p.tras && p.tras === ultima ? 500 : 0);
  s.sort((a, b) => puntua(b) - puntua(a));
  return s[0];
}

const sombra = "0 1px 2px rgba(42,32,40,0.04), 0 4px 14px rgba(42,32,40,0.06)";
const inputBase = { width: "100%", padding: "13px 14px", border: `1px solid ${C.borde}`, borderRadius: 10, background: C.tarjeta, font: `16px ${sans}`, color: C.tinta, boxSizing: "border-box" };
const btn = (on) => ({ padding: "13px 22px", border: "none", borderRadius: 10, background: on ? C.ciruela : C.hondo, color: on ? "#fff" : C.suave, font: `500 15.5px ${sans}`, cursor: on ? "pointer" : "default", boxShadow: on ? "0 2px 8px rgba(110,61,91,0.28)" : "none" });
const btnSuave = { padding: "13px 22px", border: `1px solid ${C.borde}`, borderRadius: 10, background: C.tarjeta, color: C.tinta, font: `500 15.5px ${sans}`, cursor: "pointer", boxShadow: sombra };
const link = { border: "none", background: "none", padding: 0, textDecoration: "underline", cursor: "pointer", font: `inherit` };

function Marca({ tam = 30, onClick = null }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 9, cursor: onClick ? "pointer" : "default" }}>
      <svg width={tam} height={tam} viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
        <rect width="32" height="32" rx="8" fill={C.ciruela} />
        <path d="M9 16.6l4.6 4.6L23 11.4" fill="none" stroke={C.fondo} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ font: `500 ${Math.round(tam * 0.63)}px ${serif}`, color: C.ciruela, whiteSpace: "nowrap" }}>Lo que te toca</span>
    </div>
  );
}

function Obtencion({ tipo }) {
  const color = { automatica: C.suave, evidente: C.suave, silenciosa: C.ciruela }[tipo];
  const fondo = tipo === "silenciosa" ? "#F5EEF2" : "transparent";
  return (
    <span style={{ fontSize: 12, color, background: fondo, border: `1px solid ${tipo === "silenciosa" ? C.ciruela : C.borde}`, borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {OBTENCION_TEXTO[tipo].etiqueta}
    </span>
  );
}

function Etiqueta({ estado }) {
  const m = { corresponde: ["Esto es tuyo", C.salvia], posible: ["Míralo bien", C.miel], descartado: ["No es para ti", C.suave] }[estado];
  if (!m) return null;
  return <span style={{ fontSize: 12, color: m[1], background: "#fff", border: `1px solid ${m[1]}`, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{m[0]}</span>;
}

function readLocal() {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function writeLocal(value) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
}

// ── Hechos vitales (primera capa de la futura línea de tiempo) ──
const EVENTOS_TIPO = [
  ["nacimiento-hijo", "Ha nacido o he adoptado un hijo", "Introduce la fecha: la app recalcula edad, menores de 3, familia numerosa, etc."],
  ["fin-trabajo", "He perdido el trabajo", "La fecha servirá después para calcular plazos de desempleo y ayudas."],
  ["inicio-alquiler", "He empezado un alquiler", "Guarda la fecha del contrato para cruzarla con ayudas y deducciones."],
  ["mudanza", "Me he mudado", "Guarda desde cuándo y dónde, para respetar vigencias territoriales."],
  ["inicio-dependencia", "He empezado a cuidar de un familiar", "Activa el bloque de dependencia y sus posibles prestaciones."],
];
const EVENTO_LABEL = Object.fromEntries(EVENTOS_TIPO.map(([id, label]) => [id, label]));
const fechaBonita = (s) => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(parseF(s));

function aplicarEvento(r, evento) {
  if (!evento?.tipo || !evento.fecha) return r;
  if (evento.tipo === "nacimiento-hijo") {
    return { ...r, hijos: [...(Array.isArray(r.hijos) ? r.hijos : []), evento.fecha] };
  }
  return r;
}

export default function LoQueTeToca() {
  const [r, setR] = useState({});
  const [nombre, setNombre] = useState("");
  const [saltadas, setSaltadas] = useState([]);
  const [borrador, setBorrador] = useState(null);
  const [pantalla, setPantalla] = useState("bienvenida");
  const [abierta, setAbierta] = useState(null);
  const [docs, setDocs] = useState({});
  const [gestion, setGestion] = useState({});
  const [verDesc, setVerDesc] = useState(false);
  const [ultimo, setUltimo] = useState(null);
  const [listo, setListo] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [nuevoEvento, setNuevoEvento] = useState({ tipo: "nacimiento-hijo", fecha: "", nota: "" });
  const [emailGestion, setEmailGestion] = useState("");
  const [ultimaId, setUltimaId] = useState(null);

  useEffect(() => {
    try {
      const raw = readLocal();
      if (raw) {
        const d = JSON.parse(raw);
        setR(d.r || {}); setNombre(d.nombre || ""); setSaltadas(d.saltadas || []);
        setDocs(d.docs || {}); setGestion(d.gestion || {}); setEventos(Array.isArray(d.eventos) ? d.eventos : []);
        if (Object.keys(d.r || {}).length) setPantalla("preguntas");
      }
    } catch (e) {}
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    writeLocal({ r, nombre, saltadas, docs, gestion, eventos });
  }, [r, nombre, saltadas, docs, gestion, eventos, listo]);

  const pregunta = useMemo(() => siguiente(r, saltadas, ultimaId), [r, saltadas, ultimaId]);
  const res = useMemo(() => evaluar(r), [r]);
  const tuyas = res.filter((x) => x.estado === "corresponde");
  const mirar = res.filter((x) => x.estado === "posible");
  const fuera = res.filter((x) => x.estado === "descartado");
  const sinsaber = res.filter((x) => x.estado === "desconocido");
  const total = tuyas.reduce((s, x) => s + (x.imp || 0), 0);
  const retro = tuyas.filter((x) => x.retro && x.imp);
  const totalRetro = retro.reduce((s, x) => s + x.imp * EJERCICIOS_RECT, 0);
  const urgentes = [...tuyas, ...mirar].filter((x) => x.plazoNota);
  const avisos = [...tuyas, ...mirar].filter((x) => x.aviso);
  const accionables = [...tuyas, ...mirar];
  const silenciosas = accionables.filter((x) => x.obt === "silenciosa" && !["solicitada", "concedida"].includes(gestion[x.id]));
  const yaTienes = accionables.filter((x) => ["solicitada", "concedida"].includes(gestion[x.id]));
  // Preguntas que te saltaste y que dejan ayudas sin resolver: hay que poder recuperarlas.
  const saltadasQueBloquean = saltadas.filter((id) => sinsaber.some((x) => x.faltan.includes(id)));
  const contestadas = PREGUNTAS.filter((p) => contestada(r, p.id)).length;
  const totalAplicables = useMemo(() => {
    const f = derivar(r);
    return PREGUNTAS.filter((p) => !p.cuando || p.cuando(f)).length;
  }, [r]);
  const saludo = nombre ? nombre.trim().split(/\s+/)[0] : null;

  const responder = (v) => {
    if (!pregunta) return;
    const antes = evaluar(r);
    const nuevo = { ...r, [pregunta.id]: v };
    const desp = evaluar(nuevo);
    setUltimo({
      gan: desp.filter((d) => d.estado === "corresponde" && antes.find((a) => a.id === d.id)?.estado !== "corresponde").length,
      perd: desp.filter((d) => d.estado === "descartado" && antes.find((a) => a.id === d.id)?.estado !== "descartado").length,
    });
    setUltimaId(pregunta.id);
    setR(nuevo); setBorrador(null);
  };

  const añadirEvento = () => {
    if (!nuevoEvento.fecha || !nuevoEvento.tipo) return;
    const evento = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...nuevoEvento };
    const nuevoR = aplicarEvento(r, evento);
    setEventos((v) => [...v, evento].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")));
    setR(nuevoR);
    setNuevoEvento({ tipo: nuevoEvento.tipo, fecha: "", nota: "" });
    setPantalla("resultados");
  };

  const eliminarEvento = (id) => {
    const evento = eventos.find((e) => e.id === id);
    if (!evento) return;
    // Para el prototipo, solo deshacemos automáticamente los nacimientos añadidos por evento.
    if (evento.tipo === "nacimiento-hijo") {
      const hijos = Array.isArray(r.hijos) ? r.hijos : [];
      const i = hijos.lastIndexOf(evento.fecha);
      if (i >= 0) setR({ ...r, hijos: hijos.filter((_, idx) => idx !== i) });
    }
    setEventos((v) => v.filter((e) => e.id !== id));
  };

  const entrada = () => {
    const p = pregunta;
    if (!p) return null;
    if (p.tipo === "select" && p.opciones.length <= 7) return (
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {p.opciones.map(([v, t]) => (
          <button key={v} style={{ ...btnSuave, textAlign: "left", padding: "13px 16px" }} onClick={() => responder(v)}>{t}</button>
        ))}
      </div>
    );
    if (p.tipo === "select") return (<div>
      <select style={inputBase} value={borrador ?? ""} onChange={(e) => setBorrador(e.target.value)}>
        <option value="">Elige...</option>
        {p.opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <button style={{ ...btn(!!borrador), marginTop: 14 }} disabled={!borrador} onClick={() => responder(borrador)}>Siguiente</button>
    </div>);
    if (p.tipo === "sino") return (<div style={{ display: "flex", gap: 10 }}>
      <button style={btn(true)} onClick={() => responder(true)}>Sí</button>
      <button style={btnSuave} onClick={() => responder(false)}>No</button>
    </div>);
    if (p.tipo === "multi") {
      const sel = Array.isArray(borrador) ? borrador : [];
      // "Nadie estudia" y equivalentes no pueden convivir con el resto de opciones.
      const alternar = (v) => {
        if (v === "ninguno") return setBorrador(sel.includes("ninguno") ? [] : ["ninguno"]);
        const base = sel.filter((x) => x !== "ninguno");
        setBorrador(base.includes(v) ? base.filter((x) => x !== v) : [...base, v]);
      };
      return (<div>
        {p.opciones.map(([v, t]) => (
          <label key={v} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", fontSize: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={sel.includes(v)} onChange={() => alternar(v)} />{t}
          </label>))}
        <button style={{ ...btn(sel.length > 0), marginTop: 12 }} disabled={!sel.length} onClick={() => responder(sel)}>Siguiente</button>
      </div>);
    }
    if (p.tipo === "fechas") {
      const l = Array.isArray(borrador) ? borrador : [];
      return (<div>
        {l.map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="date" style={inputBase} value={v} onChange={(e) => setBorrador(l.map((x, j) => (j === i ? e.target.value : x)))} />
            <button onClick={() => setBorrador(l.filter((_, j) => j !== i))} style={{ ...btnSuave, padding: "0 16px" }}>Quitar</button>
          </div>))}
        <button onClick={() => setBorrador([...l, ""])} style={{ ...btnSuave, marginBottom: 14 }}>+ Añadir un hijo</button>
        <div><button style={btn(true)} onClick={() => responder(l.filter(Boolean))}>{l.filter(Boolean).length ? "Siguiente" : "No tengo hijos"}</button></div>
      </div>);
    }
    return (<div>
      <input type={p.tipo === "numero" ? "number" : p.tipo === "fecha" ? "date" : "text"} style={inputBase}
        value={borrador ?? ""} onChange={(e) => setBorrador(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && borrador && responder(borrador)} />
      <button style={{ ...btn(!!borrador), marginTop: 14 }} disabled={!borrador} onClick={() => responder(borrador)}>Siguiente</button>
    </div>);
  };

  const territorio = (x) => ({ Estado: "De toda España", Auton: nombreCCAA(r.comunidad), Local: r.municipio || "Tu ayuntamiento" }[x.amb]);

  const Ficha = ({ x }) => {
    const tengo = gestion[x.id];
    const cerrada = tengo === "concedida" || tengo === "solicitada";
    return (
    <article onClick={() => setAbierta(abierta === x.id ? null : x.id)}
      style={{ background: C.tarjeta, border: `1px solid ${cerrada ? C.salvia : C.borde}`, borderRadius: 14, boxShadow: sombra, padding: "16px 18px", marginBottom: 12, cursor: "pointer", opacity: cerrada ? 0.72 : 1 }}>
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `500 18px/1.3 ${serif}`, marginBottom: 4 }}>{cerrada ? "✓ " : ""}{x.a}</div>
          <div style={{ fontSize: 12.5, color: C.suave }}>{x.n} · {territorio(x)}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {x.imp ? <div style={{ font: `500 20px ${serif}`, color: C.miel, fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>{fmtE(x.imp)}</div> : null}
          <Etiqueta estado={x.estado} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
        <Obtencion tipo={x.obt} />
        {tengo === "concedida" && <span style={{ fontSize: 12, color: C.salvia, border: `1px solid ${C.salvia}`, borderRadius: 20, padding: "3px 9px" }}>Ya la tienes</span>}
        {tengo === "solicitada" && <span style={{ fontSize: 12, color: C.salvia, border: `1px solid ${C.salvia}`, borderRadius: 20, padding: "3px 9px" }}>Ya la pediste</span>}
        {tengo === "preparando" && <span style={{ fontSize: 12, color: C.suave, border: `1px solid ${C.borde}`, borderRadius: 20, padding: "3px 9px" }}>Juntando papeles</span>}
        {tengo === "denegada" && <span style={{ fontSize: 12, color: C.alerta, border: `1px solid ${C.alerta}`, borderRadius: 20, padding: "3px 9px" }}>Te la denegaron</span>}
      </div>
      <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.55 }}>{x.motivo}</div>
      {x.it && <div style={{ fontSize: 14, color: C.suave, marginTop: 4 }}>{x.it}</div>}
      {x.aviso && <div style={{ marginTop: 10, fontSize: 14, color: C.alerta, background: "#FCF3F0", borderRadius: 8, padding: "8px 11px" }}>{x.aviso}</div>}

      {abierta === x.id && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.hondo}` }} onClick={(e) => e.stopPropagation()}>
          <div style={{ font: `500 15px ${sans}`, marginBottom: 10 }}>Lo que te van a pedir</div>
          {x.docs.map((d, i) => {
            const k = `${x.id}:${i}`;
            return (
              <label key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, marginBottom: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={!!docs[k]} onChange={() => setDocs((v) => ({ ...v, [k]: !v[k] }))} style={{ marginTop: 4 }} />
                <span style={{ textDecoration: docs[k] ? "line-through" : "none", color: docs[k] ? C.suave : C.tinta }}>{d}</span>
              </label>);
          })}
          {x.plazoNota && <p style={{ fontSize: 14.5, color: C.alerta, margin: "14px 0 0" }}>{x.plazoNota}</p>}
          <p style={{ fontSize: 14, color: C.suave, margin: "14px 0 0" }}>{OBTENCION_TEXTO[x.obt].detalle} Se pide en {x.org}.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
            {(() => {
              const e = enlaceDe(x, r, nombreCCAA(r.comunidad));
              return <a href={e.url} target="_blank" rel="noreferrer" style={{ ...btn(true), textDecoration: "none", display: "inline-block" }}>{e.texto}</a>;
            })()}
            <select value={gestion[x.id] || "pendiente"} onChange={(e) => setGestion((g) => ({ ...g, [x.id]: e.target.value }))}
              style={{ ...inputBase, width: "auto", minWidth: 220, padding: "10px 12px", fontSize: 14.5 }}>
              <option value="pendiente">Todavía no la he pedido</option>
              <option value="preparando">Estoy juntando papeles</option>
              <option value="solicitada">Ya la he pedido</option>
              <option value="concedida">Me la han dado</option>
              <option value="denegada">Me la han denegado</option>
            </select>
          </div>
          <p style={{ fontSize: 12, color: C.suave, marginTop: 16, marginBottom: 0 }}>
            {x.base ? `${x.base} · ` : ""}Dato de demostración, pendiente de verificar
          </p>
        </div>
      )}
    </article>
    );
  };

  if (pantalla === "informe") {
    const sinHacer = accionables.filter((x) => !["solicitada", "concedida"].includes(gestion[x.id]));
    const grupos = [
      ["silenciosa", "Nadie te las va a dar si no las pides", "Aquí es donde se pierde el dinero: ninguna de estas llega sola ni te la va a recordar nadie."],
      ["evidente", "Hay que pedirlas, pero se ven venir", "Normalmente alguien te avisa: el hospital, la empresa, el colegio o la propia administración."],
      ["automatica", "Te llegan solas", "No tienes que pedir nada. Lo único que conviene es comprobar que te las están aplicando."],
    ];
    const fechaHoy = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(hoy());

    const Entrada = ({ x }) => (
      <div style={{ breakInside: "avoid", padding: "14px 0", borderBottom: `1px solid ${C.borde}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `500 17px/1.3 ${serif}` }}>{x.a}</div>
            <div style={{ fontSize: 12.5, color: C.suave }}>{x.n} · {x.org} · {territorio(x)}</div>
          </div>
          {x.imp ? <div style={{ font: `500 18px ${serif}`, color: C.miel, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtE(x.imp)}</div> : null}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 14.5 }}><strong style={{ fontWeight: 600 }}>Por qué te corresponde:</strong> {x.motivo}</p>
        {x.plazoNota && <p style={{ margin: "5px 0 0", fontSize: 14, color: C.alerta }}><strong style={{ fontWeight: 600 }}>Plazo:</strong> {x.plazoNota}</p>}
        <p style={{ margin: "5px 0 0", fontSize: 14 }}><strong style={{ fontWeight: 600 }}>Papeles:</strong> {x.docs.join(" · ")}</p>
        <p style={{ margin: "5px 0 0", fontSize: 14, color: C.suave }}>
          <strong style={{ fontWeight: 600, color: C.tinta }}>Dónde:</strong> busca «{x.n}» en {x.amb === "Estado" ? x.org : territorio(x)}.
        </p>
      </div>
    );

    return (
      <div style={{ background: "#fff", color: C.tinta, font: `16px/1.6 ${sans}`, minHeight: "100vh", padding: "30px 20px 70px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div data-noprint style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 26 }}>
            <button style={btnSuave} onClick={() => setPantalla("resultados")}>← Volver</button>
            <button style={btn(true)} onClick={() => { track("imprimir_informe"); window.print(); }}>Guardar en PDF o imprimir</button>
          </div>

          <div style={{ borderBottom: `2px solid ${C.tinta}`, paddingBottom: 16, marginBottom: 22 }}>
            <Marca tam={30} />
            <h1 style={{ font: `500 27px/1.25 ${serif}`, margin: "16px 0 6px" }}>
              {saludo ? `Informe de ${saludo}` : "Tu informe"}: lo que puedes pedir
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: C.suave }}>
              Generado el {fechaHoy} · {territorio({ amb: "Auton" })}{r.municipio ? ` · ${r.municipio}` : ""}
            </p>
          </div>

          <p style={{ margin: "0 0 8px", fontSize: 16 }}>
            Según lo que me has contado, te corresponden <strong style={{ fontWeight: 600 }}>{tuyas.length}</strong> cosas y hay otras <strong style={{ fontWeight: 600 }}>{mirar.length}</strong> que merecen que las mires.
            {total > 0 && <> De lo que se puede poner cifra, suman <strong style={{ color: C.miel, fontWeight: 600 }}>{fmtE(total)}</strong> al año.</>}
          </p>
          {silenciosas.length > 0 && (
            <p style={{ margin: "0 0 26px", fontSize: 16 }}>
              <strong style={{ fontWeight: 600 }}>{silenciosas.length}</strong> de ellas no te las va a dar nadie si no las pides tú.
            </p>
          )}

          {grupos.map(([tipo, titulo, bajada]) => {
            const g = sinHacer.filter((x) => x.obt === tipo);
            if (!g.length) return null;
            return (
              <section key={tipo} style={{ marginBottom: 30, breakInside: "avoid" }}>
                <h2 style={{ font: `500 19px ${serif}`, margin: "0 0 3px" }}>{titulo} <span style={{ color: C.suave, fontWeight: 400 }}>· {g.length}</span></h2>
                <p style={{ margin: "0 0 6px", fontSize: 14, color: C.suave }}>{bajada}</p>
                {g.map((x) => <Entrada key={x.id} x={x} />)}
              </section>
            );
          })}

          {yaTienes.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ font: `500 19px ${serif}`, margin: "0 0 3px" }}>Estas ya las tienes o las has pedido <span style={{ color: C.suave, fontWeight: 400 }}>· {yaTienes.length}</span></h2>
              <p style={{ margin: "0 0 6px", fontSize: 14, color: C.suave }}>Las dejo aquí para que tengas la foto completa, pero no hay nada que hacer con ellas.</p>
              {yaTienes.map((x) => (
                <div key={x.id} style={{ padding: "9px 0", borderBottom: `1px solid ${C.borde}`, fontSize: 14.5 }}>
                  ✓ {x.a} <span style={{ color: C.suave }}>— {x.n}</span>
                </div>
              ))}
            </section>
          )}

          <div data-noprint style={{ background: C.tarjeta, border: `2px solid ${C.ciruela}`, borderRadius: 16, padding: 22, marginBottom: 26, boxShadow: "0 4px 20px rgba(110,61,91,0.12)" }}>
            <h2 style={{ font: `500 19px ${serif}`, margin: "0 0 8px" }}>¿Prefieres no hacer tú el papeleo?</h2>
            <p style={{ fontSize: 15, margin: "0 0 14px" }}>Este informe es tuyo y es gratis, con o sin nosotros. Si quieres que nos encarguemos de presentarlo todo, <strong>no pagas nada por adelantado: solo si el dinero llega a tu cuenta</strong>.</p>
            <a
              href={`mailto:polazarock@gmail.com?subject=${encodeURIComponent("Quiero que me ayudéis a tramitar mis ayudas")}&body=${encodeURIComponent(`Hola,\n\nSoy ${nombre || "un usuario del test"} y quiero que me ayudéis con estas:\n\n${sinHacer.map((x) => `- ${x.a} (${x.n})`).join("\n")}\n`)}`}
              onClick={() => track("click_quiero_ayuda", { desde: "informe" })}
              style={{ ...btn(true), textDecoration: "none", display: "inline-block" }}
            >
              Quiero que me ayudéis
            </a>
            <p style={{ fontSize: 13.5, color: C.suave, margin: "10px 0 0" }}>
              Si el botón no te abre el correo, escríbenos tú a <strong style={{ color: C.tinta, fontWeight: 600, userSelect: "all" }}>polazarock@gmail.com</strong>
            </p>
          </div>

          <p style={{ fontSize: 12.5, color: C.suave, borderTop: `1px solid ${C.borde}`, paddingTop: 14, margin: 0 }}>
            Informe orientativo generado por Lo que te toca a partir de tus respuestas. Los datos del catálogo son de demostración: contrasta cada cifra, requisito y plazo con la convocatoria oficial antes de presentar nada. No somos un organismo público ni una asesoría.
          </p>
        </div>
      </div>
    );
  }

  if (pantalla === "bienvenida") return (
    <div style={{ background: C.fondo, color: C.tinta, font: `16px/1.6 ${sans}`, minHeight: "100vh", display: "flex", alignItems: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ marginBottom: 30 }}><Marca tam={34} /></div>
        <h1 style={{ font: `500 34px/1.2 ${serif}`, margin: "0 0 18px" }}>Hay dinero público a tu nombre que nadie te va a reclamar.</h1>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", margin: "0 0 22px", padding: "16px 0", borderTop: `1px solid ${C.borde}`, borderBottom: `1px solid ${C.borde}` }}>
          <div><div style={{ font: `500 22px ${serif}`, color: C.ciruela }}>{D.length}</div><div style={{ fontSize: 12.5, color: C.suave }}>ayudas, prestaciones y deducciones que reviso</div></div>
          <div><div style={{ font: `500 22px ${serif}`, color: C.ciruela }}>{CCAA.length}</div><div style={{ fontSize: 12.5, color: C.suave }}>comunidades autónomas cubiertas</div></div>
          <div><div style={{ font: `500 22px ${serif}`, color: C.ciruela }}>0 €</div><div style={{ fontSize: 12.5, color: C.suave }}>cuesta comprobarlo, siempre</div></div>
        </div>

        <p style={{ margin: "0 0 14px", color: C.tinta }}>Te voy a preguntar por tu vida: dónde vives, con quién, de qué trabajas, qué te ha pasado últimamente. Con cada respuesta voy tachando lo que no te toca y encontrando lo que sí.</p>
        <p style={{ margin: "0 0 18px", color: C.suave, fontSize: 15 }}>Puedes parar cuando quieras, saltarte lo que no quieras contar y cambiar cualquier respuesta después. Nada de esto sale de tu móvil.</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "0 0 26px" }}>
          {FAMILIAS.map(([familia]) => (
            <span key={familia} style={{ fontSize: 13, color: C.ciruela, background: "#F5EEF2", border: `1px solid ${C.borde}`, padding: "5px 12px", borderRadius: 20 }}>{familia}</span>
          ))}
        </div>

        <label style={{ display: "block", fontSize: 14.5, color: C.suave, marginBottom: 8 }}>¿Cómo te llamo?</label>
        <input style={inputBase} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" onKeyDown={(e) => e.key === "Enter" && setPantalla("preguntas")} />
        <button style={{ ...btn(true), marginTop: 16, width: "100%" }} onClick={() => { track("empezar_test"); setPantalla("preguntas"); }}>Empezar</button>
        <p style={{ fontSize: 12.5, color: C.suave, marginTop: 20, marginBottom: 0 }}>Prototipo con datos de ejemplo. Las cifras son orientativas y no sustituyen a lo que diga la convocatoria oficial.</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.fondo, color: C.tinta, font: `16px/1.6 ${sans}`, minHeight: "100vh", padding: "0 0 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ paddingTop: 22, paddingBottom: 16, borderBottom: `1px solid ${C.borde}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Marca tam={28} onClick={() => setPantalla("bienvenida")} />
          {total > 0 && <span style={{ fontSize: 13.5, color: C.miel }}>Llevas <strong style={{ fontWeight: 600 }}>{fmtE(total)}</strong> al año encontrados</span>}
        </div>

        <header style={{ paddingTop: 18, paddingBottom: 18, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPantalla("preguntas")} style={{ ...(pantalla === "preguntas" ? btn(true) : btnSuave), padding: "9px 16px", fontSize: 14.5 }}>Preguntas</button>
            <button onClick={() => setPantalla("vida")} style={{ ...(pantalla === "vida" ? btn(true) : btnSuave), padding: "9px 16px", fontSize: 14.5 }}>Mi vida{eventos.length ? ` · ${eventos.length}` : ""}</button>
            <button onClick={() => { track("ver_resultados", { tuyas: tuyas.length, mirar: mirar.length }); setPantalla("resultados"); }} style={{ ...(pantalla === "resultados" ? btn(true) : btnSuave), padding: "9px 16px", fontSize: 14.5 }}>Lo mío{tuyas.length ? ` · ${tuyas.length}` : ""}</button>
          </div>
        </header>

        {pantalla === "preguntas" && (
          <div>
            {pregunta && (() => {
              const totalBarra = Math.max(totalAplicables, contestadas + 1);
              const pct = Math.max(4, Math.min(100, Math.round((contestadas / totalBarra) * 100)));
              return (
                <div style={{ margin: "0 0 14px" }}>
                  <div style={{ height: 6, background: C.hondo, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: C.ciruela, borderRadius: 4, transition: "width .3s ease" }} />
                  </div>
                  <p style={{ fontSize: 12.5, color: C.suave, margin: "6px 0 0" }}>Pregunta {contestadas + 1} de ~{totalBarra}</p>
                </div>
              );
            })()}
            {ultimo && <p style={{ fontSize: 14.5, color: C.ciruela, background: "#F5EEF2", borderRadius: 10, padding: "10px 14px", margin: "0 0 18px" }}>
              {ultimo.gan > 0 ? `Con eso he encontrado ${ultimo.gan} cosa${ultimo.gan === 1 ? "" : "s"} más para ti` : "Con eso he descartado cosas que no venían al caso"}{ultimo.perd > 0 ? ` y he tachado ${ultimo.perd}.` : "."}
            </p>}
            {pregunta ? (
              <div style={{ background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: 16, boxShadow: sombra, padding: "24px 22px" }}>
                <h2 style={{ font: `500 23px/1.3 ${serif}`, margin: "0 0 8px" }}>{contestadas === 0 && saludo ? `${saludo}, ` : ""}{contestadas === 0 && saludo ? pregunta.texto.replace(/^([¿¡]*)([A-ZÁÉÍÓÚÑ])/, (_, pre, letra) => pre + letra.toLowerCase()) : pregunta.texto}</h2>
                {pregunta.ayuda ? <p style={{ fontSize: 15, color: C.suave, margin: "0 0 18px" }}>{pregunta.ayuda}</p> : <div style={{ height: 12 }} />}
                {entrada()}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.hondo}`, fontSize: 13.5, color: C.suave }}>
                  <span>De esta respuesta dependen {pregunta.desbloquea} cosa{pregunta.desbloquea === 1 ? "" : "s"}</span>
                  <button onClick={() => { setSaltadas((s) => [...s, pregunta.id]); setBorrador(null); }} style={{ ...link, color: C.suave, fontSize: 13.5 }}>Prefiero no decirlo</button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: 16, boxShadow: sombra, padding: "24px 22px" }}>
                <h2 style={{ font: `500 23px ${serif}`, margin: "0 0 10px" }}>Ya está{saludo ? `, ${saludo}` : ""}.</h2>
                <p style={{ fontSize: 15.5, color: C.suave, margin: "0 0 18px" }}>No me queda nada por preguntarte. Vuelve cuando cambie algo: un nacimiento, una mudanza, un trabajo nuevo, alguien a quien empieces a cuidar. Cada cambio abre puertas nuevas y cierra otras.</p>
                <button style={btn(true)} onClick={() => setPantalla("resultados")}>Ver lo mío</button>
              </div>
            )}

            {contestadas > 0 && <div style={{ marginTop: 30 }}>
              <h3 style={{ font: `500 16px ${serif}`, margin: "0 0 12px" }}>Lo que ya me has contado</h3>
              {PREGUNTAS.filter((p) => contestada(r, p.id)).map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14.5, padding: "9px 0", borderBottom: `1px solid ${C.hondo}` }}>
                  <span style={{ color: C.suave }}>{p.texto}</span>
                  <button onClick={() => { const c = { ...r }; delete c[p.id]; setR(c); }} style={{ ...link, color: C.ciruela, fontSize: 14, whiteSpace: "nowrap" }}>Cambiar</button>
                </div>))}
              <button onClick={() => { setR({}); setSaltadas([]); setDocs({}); setGestion({}); setEventos([]); setUltimo(null); setBorrador(null); }} style={{ ...link, color: C.suave, fontSize: 13.5, marginTop: 16 }}>Empezar de cero</button>
            </div>}
          </div>
        )}

        {pantalla === "vida" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ font: `500 26px/1.3 ${serif}`, margin: "0 0 10px" }}>Tu vida cambia. Tus derechos también.</h1>
              <p style={{ margin: 0, color: C.suave, fontSize: 15.5 }}>
                En vez de volver a rellenar todo el formulario, puedes añadir un hecho cuando ocurra. La fecha queda guardada y el perfil se recalcula.
              </p>
            </div>

            <div style={{ background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: 16, boxShadow: sombra, padding: 20, marginBottom: 24 }}>
              <div style={{ font: `500 17px ${serif}`, marginBottom: 6 }}>Ha pasado algo nuevo</div>
              <p style={{ color: C.suave, fontSize: 14.5, margin: "0 0 16px" }}>Prueba con “ha nacido mi hijo” y una fecha. Es el primer ejemplo del modelo de línea de tiempo.</p>
              <select style={inputBase} value={nuevoEvento.tipo} onChange={(e) => setNuevoEvento((v) => ({ ...v, tipo: e.target.value }))}>
                {EVENTOS_TIPO.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
              <input type="date" style={{ ...inputBase, marginTop: 10 }} value={nuevoEvento.fecha} onChange={(e) => setNuevoEvento((v) => ({ ...v, fecha: e.target.value }))} />
              <input type="text" style={{ ...inputBase, marginTop: 10 }} value={nuevoEvento.nota} onChange={(e) => setNuevoEvento((v) => ({ ...v, nota: e.target.value }))} placeholder="Nota opcional, por ejemplo: nació en el hospital de Reus" />
              <button style={{ ...btn(!!nuevoEvento.fecha), marginTop: 14 }} disabled={!nuevoEvento.fecha} onClick={añadirEvento}>Añadir a mi vida</button>
            </div>

            <div>
              <h2 style={{ font: `500 17px ${serif}`, margin: "0 0 12px" }}>Línea de tiempo</h2>
              {eventos.length === 0 ? (
                <div style={{ background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: 14, boxShadow: sombra, padding: 18, color: C.suave, fontSize: 14.5 }}>
                  Todavía no has añadido hechos. Tus respuestas del cuestionario siguen funcionando exactamente igual.
                </div>
              ) : eventos.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((e) => (
                <div key={e.id} style={{ background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: 14, boxShadow: sombra, padding: "15px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ font: `500 17px ${serif}` }}>{EVENTO_LABEL[e.tipo] || "Hecho de vida"}</div>
                      <div style={{ color: C.suave, fontSize: 13.5 }}>{fechaBonita(e.fecha)}</div>
                      {e.nota ? <div style={{ marginTop: 7, fontSize: 14.5 }}>{e.nota}</div> : null}
                    </div>
                    <button onClick={() => eliminarEvento(e.id)} style={{ ...link, color: C.suave, fontSize: 13.5 }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pantalla === "resultados" && (
          <div>
            {tuyas.length === 0 && mirar.length === 0 ? (
              <div style={{ background: C.tarjeta, border: `1px solid ${C.borde}`, borderRadius: 16, boxShadow: sombra, padding: 22 }}><p style={{ margin: 0, color: C.suave }}>Todavía no me has contado lo suficiente. Contesta unas cuantas preguntas y esto se llena.</p></div>
            ) : (
              <>
                <div style={{ marginBottom: 26 }}>
                  <h1 style={{ font: `500 26px/1.3 ${serif}`, margin: "0 0 10px" }}>{saludo ? `${saludo}, esto es lo tuyo` : "Esto es lo tuyo"}</h1>
                  <p style={{ margin: 0, fontSize: 16 }}>He encontrado <strong style={{ fontWeight: 600 }}>{tuyas.length}</strong> cosas que te corresponden{mirar.length > 0 && <> y otras <strong style={{ fontWeight: 600 }}>{mirar.length}</strong> que merecen que las mires</>}.{total > 0 && <> Solo de lo que puedo poner cifra, son <strong style={{ color: C.miel, fontWeight: 600 }}>{fmtE(total)}</strong> al año.</>}{urgentes.length > 0 && <> Hay <strong style={{ fontWeight: 600 }}>{urgentes.length}</strong> con fecha límite, así que empieza por ahí.</>}</p>
                  {silenciosas.length > 0 && (
                    <p style={{ margin: "12px 0 0", fontSize: 15.5, background: "#F5EEF2", color: C.ciruela, borderRadius: 10, padding: "12px 15px" }}>
                      De todas ellas, <strong style={{ fontWeight: 600 }}>{silenciosas.length}</strong> no te las va a dar nadie si no las pides tú. Son las que de verdad se pierden.
                    </p>
                  )}
                  {yaTienes.length > 0 && (
                    <p style={{ margin: "10px 0 0", fontSize: 14.5, color: C.suave }}>
                      {yaTienes.length === 1 ? "Una ya la tienes o la has pedido" : `${yaTienes.length} ya las tienes o las has pedido`}, así que las dejo marcadas y fuera de la cuenta de arriba.
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                    <button style={btnSuave} onClick={() => { track("ver_informe"); setPantalla("informe"); }}>Ver mi informe completo</button>
                  </div>
                </div>

                {avisos.length > 0 && <div style={{ background: "#FCF3F0", border: "1px solid #EDD8D0", borderRadius: 14, padding: "14px 16px", marginBottom: 24 }}>
                  <div style={{ font: `500 16px ${serif}`, marginBottom: 6 }}>Y una cosa que no te va a gustar</div>
                  {avisos.map((x) => <p key={x.id} style={{ margin: "0 0 4px", fontSize: 14.5 }}>{x.aviso}</p>)}
                </div>}

                {["Prestación", "Deducción", "Ayuda", "Descuento", "Acceso"].map((cat) => {
                  const g = [...tuyas, ...mirar].filter((x) => x.cat === cat);
                  if (!g.length) return null;
                  const titulo = { Prestación: "Dinero que puedes cobrar", Deducción: "Lo que te ahorras en la declaración", Ayuda: "Ayudas que hay que pedir", Descuento: "Facturas y recibos que puedes bajar", Acceso: "Papeles que abren otras puertas" }[cat];
                  return <section key={cat} style={{ marginBottom: 28 }}><h2 style={{ font: `500 17px ${serif}`, margin: "0 0 12px" }}>{titulo} <span style={{ color: C.suave, fontWeight: 400 }}>· {g.length}</span></h2>{g.map((x) => <Ficha key={x.id} x={x} />)}</section>;
                })}

                {retro.length > 0 && <div style={{ border: `1px solid ${C.miel}`, background: C.tarjeta, borderRadius: 14, padding: 18, marginBottom: 24, boxShadow: sombra }}>
                  <h3 style={{ font: `500 18px ${serif}`, margin: "0 0 6px" }}>Y esto es de años pasados</h3>
                  <p style={{ fontSize: 14.5, color: C.suave, margin: "0 0 14px" }}>Si no lo aplicaste en su día, Hacienda deja corregir las declaraciones de los últimos {EJERCICIOS_RECT} años. No hace falta que te devuelvan la razón: se pide y ya está.</p>
                  {retro.map((x) => <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15, padding: "8px 0", borderBottom: `1px solid ${C.hondo}` }}><span>{x.a}</span><span style={{ color: C.miel, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>hasta {fmtE(x.imp * EJERCICIOS_RECT)}</span></div>)}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, font: `500 19px ${serif}` }}><span>En total</span><span style={{ color: C.miel, fontVariantNumeric: "tabular-nums" }}>{fmtE(totalRetro)}</span></div>
                  <p style={{ fontSize: 12.5, color: C.suave, marginTop: 12, marginBottom: 0 }}>Es el techo, no lo que vas a cobrar seguro. Cada año se revisa por separado.</p>
                </div>}

                <div style={{ background: C.tarjeta, border: `2px solid ${C.ciruela}`, borderRadius: 16, padding: "22px 22px", marginBottom: 24, boxShadow: "0 4px 20px rgba(110,61,91,0.12)" }}>
                  <h2 style={{ font: `500 20px ${serif}`, margin: "0 0 8px" }}>¿Quieres que te lo consigamos nosotros?</h2>
                  <p style={{ fontSize: 15, margin: "0 0 14px" }}>Comprobarlo es gratis y seguirá siéndolo siempre. Si además quieres que nos encarguemos del papeleo, no pagas nada por adelantado: <strong>solo cobramos algo si el dinero llega a tu cuenta</strong>. Si te lo deniegan, no debes nada.</p>
                  <label style={{ display: "block", fontSize: 14, color: C.suave, marginBottom: 6 }}>Tu email, para contactarte</label>
                  <input type="email" style={{ ...inputBase, marginBottom: 12 }} value={emailGestion} onChange={(e) => setEmailGestion(e.target.value)} placeholder="tucorreo@ejemplo.com" />
                  <a
                    href={`mailto:polazarock@gmail.com?subject=${encodeURIComponent("Quiero que me ayudéis a tramitar mis ayudas")}&body=${encodeURIComponent(`Hola,\n\nSoy ${nombre || "un usuario del test"} y quiero que me ayudéis a tramitar lo siguiente:\n\n${[...tuyas, ...mirar].map((x) => `- ${x.a}`).join("\n")}\n\nMi email de contacto: ${emailGestion || "(no indicado)"}\n`)}`}
                    onClick={() => track("click_quiero_ayuda", { tuyas: tuyas.length, mirar: mirar.length })}
                    style={{ ...btn(true), textDecoration: "none", display: "inline-block" }}
                  >
                    Quiero que me ayudéis
                  </a>
                  <p style={{ fontSize: 13.5, color: C.suave, margin: "10px 0 0" }}>
                    Si el botón no te abre el correo, escríbenos tú a <strong style={{ color: C.tinta, fontWeight: 600, userSelect: "all" }}>polazarock@gmail.com</strong>
                  </p>
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.hondo}` }}>
                    {[
                      ["¿De verdad es gratis comprobarlo?", "Sí, siempre. El test no tiene coste ni ahora ni si vuelves más adelante."],
                      ["¿Cuánto cobráis si me ayudáis?", "Todavía estamos definiendo el porcentaje exacto, pero el principio no cambia: si no te conceden la ayuda, no pagas nada."],
                      ["¿Qué hacéis con mis datos?", "Nada sale de tu dispositivo mientras solo haces el test. Si nos pides ayuda, usamos tu email únicamente para contactarte sobre esto."],
                    ].map(([q, a]) => (
                      <div key={q} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{q}</div>
                        <div style={{ fontSize: 14, color: C.suave }}>{a}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {sinsaber.length > 0 && (
                  <p style={{ fontSize: 15, background: "#F5EEF2", color: C.ciruela, borderRadius: 10, padding: "12px 15px" }}>
                    Me faltan datos para decidir sobre {sinsaber.length} cosas más.{" "}
                    {saltadasQueBloquean.length > 0 ? (
                      <>
                        Dependen de {saltadasQueBloquean.length === 1 ? "una pregunta que te saltaste" : `${saltadasQueBloquean.length} preguntas que te saltaste`}.{" "}
                        <button
                          onClick={() => { setSaltadas((s) => s.filter((id) => !saltadasQueBloquean.includes(id))); setPantalla("preguntas"); }}
                          style={{ ...link, color: C.ciruela }}
                        >
                          Volver a preguntármelas
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setPantalla("preguntas")} style={{ ...link, color: C.ciruela }}>Seguir contestando</button>
                    )}
                  </p>
                )}

                {fuera.length > 0 && <div style={{ marginTop: 22 }}>
                  <button onClick={() => setVerDesc((v) => !v)} style={{ ...link, color: C.suave, fontSize: 14.5 }}>{verDesc ? "Ocultar" : "Ver"} las {fuera.length} que he descartado, y por qué</button>
                  {verDesc && <div style={{ marginTop: 14 }}>{fuera.map((x) => <div key={x.id} style={{ fontSize: 14.5, padding: "9px 0", borderBottom: `1px solid ${C.hondo}` }}><span>{x.a}</span><span style={{ color: C.suave }}> — {x.motivo}</span></div>)}</div>}
                </div>}
              </>
            )}
          </div>
        )}

        <footer style={{ marginTop: 46, paddingTop: 22, borderTop: `1px solid ${C.borde}`, fontSize: 13, color: C.suave, lineHeight: 1.7 }}>
          <div style={{ marginBottom: 12 }}><Marca tam={24} onClick={() => setPantalla("bienvenida")} /></div>
          <p style={{ margin: "0 0 6px" }}>Tus respuestas se guardan solo en este dispositivo. No viajan a ningún servidor ni las vemos nosotros.</p>
          <p style={{ margin: "0 0 6px" }}>Proyecto independiente: no somos un organismo público ni una asesoría. Los datos son de demostración, así que contrasta cualquier cifra con la convocatoria oficial antes de fiarte de ella.</p>
          <p style={{ margin: 0 }}>¿Dudas o algo mal? <a href="mailto:polazarock@gmail.com" style={{ color: C.ciruela }}>Escríbenos</a>.</p>
        </footer>
      </div>
    </div>
  );
}
