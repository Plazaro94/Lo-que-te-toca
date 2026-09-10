# Modelo de datos propuesto — Lo que te toca

La siguiente etapa del producto debe separar **hechos de vida**, **perfil derivado** y **catálogo jurídico versionado**. El prototipo actual demuestra la primera capa en navegador; este documento define cómo llevarla a una base de datos cuando llegue ese momento.

## 1. Hechos de vida

```ts
type Hecho = {
  id: string;
  tipo: "nacimiento" | "adopcion" | "fin_trabajo" | "inicio_alquiler" | "mudanza" | "dependencia" | string;
  fechaInicio: string;        // YYYY-MM-DD
  fechaFin?: string | null;   // si deja de estar vigente
  datos: Record<string, unknown>;
  fuente: "usuario" | "documento" | "administracion";
  creadoEn: string;
  actualizadoEn: string;
};
```

El usuario no debería tener que rellenar datos derivados como `hijosMenores3` o `miembros`. Esos valores se calculan a partir de los hechos y del perfil.

## 2. Vigencia territorial

La residencia debe ser histórica, no un campo fijo:

```ts
type Residencia = {
  comunidad: string;
  municipio?: string;
  desde: string;
  hasta?: string | null;
};
```

Esto permite responder correctamente a una pregunta como «¿qué derechos tenía cuando vivía en Cataluña en 2024?».

## 3. Catálogo de derechos

Cada ayuda debe ser un registro versionado:

```ts
type Regla = {
  id: string;
  nombreClaro: string;
  nombreOficial: string;
  territorio: "estado" | "ccaa" | "municipio";
  territorioId?: string;
  ejercicio: number;
  vigenteDesde: string;
  vigenteHasta?: string | null;
  requiere: string[];
  condicion: unknown;         // DSL o reglas declarativas, no código UI
  resultado: {
    estado: "corresponde" | "posible" | "descartado";
    motivo: string;
    importe?: number | null;
  };
  plazo?: {
    tipo: "fecha_fija" | "desde_evento" | "convocatoria";
    fecha?: string;
    dias?: number;
  };
  documentos: string[];
  rutaSolicitud?: string[];
  url?: string;
  baseLegal?: string;
  fuenteOficial: string;
  verificadoEn: string;
  verificadoPor?: string;
  estadoCatalogo: "pendiente" | "verificada" | "retirada";
};
```

## 4. Triple nivel de evidencia

Cada dato importante debería poder pasar por:

**Lo dice la persona → lo demuestra un documento → lo confirma la administración.**

No hace falta pedir el documento para construir el resultado inicial; sí hace falta guardar qué afirmación está respaldada y cuál no.

## 5. Motor

El motor debe hacer dos cosas:

1. `perfil -> reglas`: detectar derechos.
2. `hecho/regla nueva -> perfiles afectados`: poder avisar en el futuro cuando una nueva regla o cambio normativo afecte a alguien.

La interfaz es la última capa. Las reglas no deberían depender de componentes React.

## 6. Versionado

Nunca se debe sobrescribir silenciosamente una regla antigua. Cuando cambia un umbral o requisito, se crea una nueva versión con su fecha de entrada en vigor. Así el sistema puede explicar qué habría correspondido en una fecha pasada y qué corresponde hoy.

---

### Qué demuestra ya este prototipo

La pestaña **Mi vida** permite añadir un hecho fechado, y el ejemplo «Ha nacido o he adoptado un hijo» modifica el perfil existente. La persistencia sigue siendo local mediante `localStorage`. Los otros tipos de evento están preparados como interfaz y se pueden conectar a reglas específicas en la siguiente iteración.
