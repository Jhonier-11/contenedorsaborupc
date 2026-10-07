# Contratos de SaborUPC 2.0

Este documento es el **contrato público entre equipos**. Las piezas nunca se importan entre sí: solo
cumplen lo que está escrito aquí. Si el código y este documento discrepan, es un error de uno de los dos.

Versión del documento: **2.0** (ver el [historial](#5-historial-de-cambios)).

## 1. Contrato de montaje y desmontaje

El contenedor conoce a cada micro frontend únicamente por su entrada en `registro.js`:

| Campo | Significado |
|---|---|
| ruta (clave) | Hash que activa el MFE, por ejemplo `/pedidos`. |
| `nombre` | Nombre base del contrato. Con `tipo: 'funcion'` define `render<nombre>` / `unmount<nombre>`. |
| `url` | Script que se descarga en tiempo de ejecución (otro origen, sin CORS: es un `<script src>`). |
| `tipo` | `'funcion'` o `'webcomponent'`. |
| `etiqueta` | Solo `webcomponent`: la etiqueta que el contenedor crea. |
| `precargar` | `true` si el MFE debe escuchar eventos aunque no esté en pantalla. |

### a) Funciones globales (`tipo: 'funcion'`)

```js
window.render<Nombre>(idContenedor)    // pinta dentro de document.getElementById(idContenedor)
window.unmount<Nombre>(idContenedor)   // deja de escuchar lo que montó, libera recursos y vacía el contenedor
```

Reglas:

- `render` puede ser asíncrona (Seguimiento descarga Vue antes de montar). El contenedor **no espera** su
  resultado; el MFE debe tolerar que `unmount` llegue antes de que termine de montar.
- Todo lo que deba vivir fuera de pantalla (estado, listeners de `window`, temporizadores) se crea **al
  cargar el script**, no dentro de `render`; por eso esos MFE se registran con `precargar: true`.
- Lo que sí se crea en `render` (listeners del contenedor, apps de un framework) se retira en `unmount`.
- Sus estilos llevan prefijo propio (`cat-`, `car-`, `seg-`) para no filtrarse a otros equipos.

| MFE | Puerto | `nombre` | Ruta | `precargar` |
|---|---|---|---|---|
| Catálogo | 8081 | `Catalogo` | `/catalogo` | no |
| Carrito | 8082 | `Carrito` | `/carrito` | sí |
| Seguimiento (Vue 3 por CDN) | 8084 | `Seguimiento` | `/pedidos` | sí |

### b) Web Component (`tipo: 'webcomponent'`)

El script define una etiqueta con `customElements.define`; el contenedor solo la crea y la inserta en
`#app-root`. El montaje ocurre en `connectedCallback` y la limpieza en `disconnectedCallback`. El contenido
va en un Shadow DOM.

| MFE | Puerto | Etiqueta | Ruta | `precargar` |
|---|---|---|---|---|
| Perfil | 8083 | `<mfe-perfil>` | `/perfil` | no |

## 2. Eventos

Todos viajan por `window` como `CustomEvent`. Quien publica no sabe quién escucha.

| Evento | Publicador | Consumidores | `detail` | Versión |
|---|---|---|---|---|
| `carrito:agregar` | Catálogo | Carrito | `{ id: number, nombre: string, precio: number }` | 1 (implícita, sin campo `version`) |
| `carrito:actualizado` | Carrito | Contenedor | `{ cantidad: number, total: number }` | 1 (implícita, sin campo `version`) |
| `usuario:cambio` | Perfil | Contenedor | `{ nombre: string }` | 1 (implícita, sin campo `version`) |
| `pedido:confirmado` | Carrito | Seguimiento | `{ version: 1, id: number, items: [{ id, nombre, precio, cantidad }], total: number, fecha: string ISO 8601, canal?: string }` | 1 |
| `pedido:estado` | Seguimiento | Contenedor | `{ version: 1, id: number, estado: string, anterior: string \| null }` | 1 |

Notas por evento:

- **`pedido:confirmado`**: el Carrito copia los datos **antes** de vaciarse; `items` nunca comparte
  referencias con su estado interno. `id` es un entero creciente por sesión del Carrito. `canal` es
  **opcional** (hoy el Carrito envía `'web'`); un consumidor debe funcionar sin él.
- **`pedido:estado`**: `estado` es uno de `Recibido`, `En preparación`, `En camino`, `Entregado`, en ese
  orden. El primer evento de cada pedido es `Recibido` con `anterior: null`. Tras `Entregado` no hay más
  eventos de ese pedido.
- Los tres eventos de la guía original (`carrito:agregar`, `carrito:actualizado`, `usuario:cambio`) no
  llevan campo `version`; se consideran versión 1 y su forma no cambió en 2.0.

## 3. Regla de evolución

1. **Compatible = solo agregar campos opcionales** al `detail`. No se renombran, no se eliminan y no se
   cambia el tipo de campos existentes. Los consumidores **ignoran los campos que no conocen**.
2. **Incompatible = nueva versión**: se incrementa `version` (`2`) y, mientras haya consumidores en la
   versión anterior, el publicador emite ambas versiones (dos eventos, o el mismo con las dos formas) hasta
   que todos migren.
3. **Un consumidor solo procesa las versiones que conoce.** Seguimiento acepta `version: 1` e ignora en
   silencio cualquier otra (probado en `mfe-seguimiento/contrato.html`).
4. Todo cambio del contrato se anota en el [historial](#5-historial-de-cambios) en el mismo cambio que lo
   introduce, y se cubre con las pruebas de contrato del publicador y del consumidor.

Ejemplo real: `canal` se agregó a `pedido:confirmado` sin cambiar `version`. Seguimiento se probó con el
evento sin `canal` (un publicador antiguo) y con `canal: 'web'`; ambos se aceptan.

## 4. Sistema de diseño (contrato de estilo)

`design-tokens/tokens.css` (puerto 8085) publica **solo variables CSS** con prefijo `--upc-`: colores,
tipografía, espaciado y forma. Se consumen siempre como `var(--upc-…, valor-de-respaldo)`, de modo que
cada pieza se ve igual en modo independiente o si el servidor de tokens está caído. Las variables heredan a
través del Shadow DOM, así que también llegan a `<mfe-perfil>`. Agregar una variable es compatible;
renombrar o eliminar una, no. **Cambiar el valor** de una variable es el mecanismo previsto para rediseñar:
ningún MFE se toca por ello, salvo los valores de respaldo, que deben coincidir con `tokens.css`.

Grupos de tokens: color de marca y de estado, superficies y texto, tipografía (`--upc-fuente-base`,
`--upc-fuente-display`, `--upc-fuente-mono`, tamaños), espaciado, radios y sombras. Las fuentes (Fraunces,
Hanken Grotesk e IBM Plex Mono) se cargan desde el HTML de cada página; sin ellas se usan las de respaldo.

## 5. Historial de cambios

| Versión | Cambio |
|---|---|
| 2.0 | Nuevos eventos `pedido:confirmado` y `pedido:estado` (versión 1). Nuevo MFE Seguimiento (`/pedidos`, precargado, render asíncrona). Nuevo servidor de tokens. |
| 2.0 | `pedido:confirmado` agrega el campo opcional `canal` (sin cambiar de versión). |
| 2.0 | Rediseño visual (paleta verde, tipografía, sombras): solo cambian valores de tokens y CSS de cada pieza; contratos de montaje y eventos intactos. |
| 1.0 | Contrato de la guía: `carrito:agregar`, `carrito:actualizado`, `usuario:cambio`, funciones `renderX/unmountX` y Web Component. |

## 6. Cómo se verifica

Cada MFE tiene `contrato.html`, que se abre con el servidor de su puerto (sin el contenedor) y muestra
✓/✗ por comprobación (además de `console.assert`):

| Página | Comprueba |
|---|---|
| `http://localhost:8081/contrato.html` | Funciones expuestas, montaje con contenido, forma de `carrito:agregar`. |
| `http://localhost:8082/contrato.html` | Funciones expuestas, montaje, `carrito:actualizado`, `pedido:confirmado` (copia previa al vaciado, `canal`). |
| `http://localhost:8083/contrato.html` | Etiqueta definida, shadow-root, `usuario:cambio`, tokens dentro del Shadow DOM. |
| `http://localhost:8084/contrato.html` | Funciones expuestas, montaje (Vue), `pedido:estado` con la forma acordada, avance de estados, **compatibilidad hacia atrás** (con y sin `canal`, versión desconocida ignorada), estado fuera de pantalla. |
