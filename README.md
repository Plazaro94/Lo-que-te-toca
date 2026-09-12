# Lo que te toca · prototipo web

Versión autónoma del prototipo React/Vite para probarlo fuera de una interfaz de IA.

## Qué incluye

- Entrevista dinámica basada en el catálogo de derechos.
- Resultados con «Esto es tuyo / Míralo bien / No es para ti».
- Checklist de documentos y estado de tramitación.
- Persistencia privada en `localStorage` del navegador.
- Primera capa de **línea de tiempo / Mi vida**, donde se pueden añadir hechos fechados.
- El evento «Ha nacido o he adoptado un hijo» se transforma en un dato real del perfil y vuelve a evaluar el catálogo.
- `MODELO_DATOS.md` con la arquitectura propuesta para pasar de prototipo a catálogo versionado.

## Ejecutarlo en tu ordenador

Necesitas Node.js 18 o superior.

```bash
npm install
npm run dev
```

Vite mostrará una dirección local, normalmente:

```text
http://localhost:5173/
```

## Crear la versión de producción

```bash
npm run build
```

Se generará `dist/`.

## Publicarlo en Vercel

Puedes importar este proyecto como proyecto Vite. Vercel detectará el `package.json` y utilizará el script `build`.

No necesita base de datos para este prototipo.

## Privacidad

Las respuestas y estados se guardan en el navegador de la persona que utiliza la app. No se envían a un servidor por parte del prototipo.

## Importante

El catálogo contiene datos de demostración. Antes de utilizarlo públicamente deben verificarse requisitos, importes, plazos, bases legales y enlaces contra las fuentes oficiales vigentes. La etiqueta de demostración no sustituye esa verificación.
