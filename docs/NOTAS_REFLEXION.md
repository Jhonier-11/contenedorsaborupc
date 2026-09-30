# Notas para la reflexión individual

Solo hechos concretos registrados durante el desarrollo de SaborUPC 2.0 (trabajo de un integrante que
hizo los papeles de todos los "equipos"). **No es la reflexión**: sirve de material para que la escribas
tú. Las preguntas de la página individual son:

1. ¿Hubo coordinación inevitable entre equipos?
2. ¿Qué cambiarías del contrato?
3. ¿Recomendarías micro frontends para un proyecto de este tamaño?

## Coordinación que no se pudo evitar

- **Acordar `pedido:confirmado` antes de escribir Seguimiento o el cambio en Carrito.** Ninguno de los dos
  podía avanzar solo. Hubo que decidir quién asigna el `id` (el Carrito, contador `siguientePedido`), quién
  calcula el `total` (el publicador; Seguimiento lo toma tal cual), el formato de `fecha` (ISO 8601) y que
  los `items` se copian antes de vaciar el carrito.
- **Los textos de los estados son parte del contrato.** `Recibido`, `En preparación`, `En camino`,
  `Entregado` (con tilde) los usan Seguimiento (vista) y el contenedor (toast, que los muestra tal cual).
  Renombrar uno rompería la presentación de ambos sin ningún error visible.
- **Decidir `anterior: null` en el primer `pedido:estado`.** Sin ese primer evento el contenedor no podría
  mostrar el toast de "Recibido". Hubo que definirlo y documentarlo en `CONTRATOS.md`.
- **Agregar un MFE obliga a tocar el contenedor.** Para que `#/pedidos` existiera hubo que cambiar el
  `registro.js` (ruta, URL, `precargar: true`) y el `index.html` (enlace "Pedidos"); además el contenedor
  necesitó su propio código para los toasts. Seguimiento no puede registrarse solo; y el equipo del
  contenedor debe saber que Seguimiento requiere precarga.
- **El contrato de montaje resultó ser síncrono "por costumbre".** La guía llama `window.render<Nombre>()`
  sin esperar nada. Seguimiento descarga Vue antes de pintar, así que su `render` es asíncrona y el
  contenedor no la espera. Hubo que agregar la regla "`unmount` puede llegar antes de que termine `render`"
  (Seguimiento usa un contador de turnos) y dejarla escrita en `CONTRATOS.md`.
- **Nombres y prefijo de los tokens (`--upc-`)** debían acordarse entre el repo de tokens y los cuatro
  consumidores; agregar variables es compatible, renombrarlas no.
- **Cambiar la firma interna de `cargarScript`** (de `url` a la entrada del registro) para poder escribir el
  nombre del MFE en el log de tiempos fue un cambio solo del contenedor, sin coordinación externa.

## Qué costó definir o cambiaría del contrato

- Los tres eventos de la guía (`carrito:agregar`, `carrito:actualizado`, `usuario:cambio`) no tienen campo
  `version`. Para no cambiar contratos existentes se documentaron como "v1 implícita" y solo los dos nuevos
  llevan `version`. Queda un contrato con dos estilos.
- Un evento `carrito:agregar` describe "un plato" (sin `cantidad`); el Carrito decide sumar de a uno.
- El contrato vive en `contenedor/CONTRATOS.md`, pero el código que lo cumple está en otros cinco repos. Nada
  lo obliga a mantenerse sincronizado: la coherencia doc↔código la comprobó un script de verificación que
  escribí aparte (compara eventos, publicadores y consumidores del código con la tabla del documento).
- Los pedidos no tienen `id` único global: cada sesión del Carrito numera desde 1 (se reinicia al recargar).
- La prueba de compatibilidad incluyó una regla que no venía en el enunciado: ignorar versiones
  desconocidas (`version !== 1`). Fue una decisión mía; el enunciado solo pedía probar con y sin `canal`.
- Se quitó el `console.log('[mfe-perfil] desmontado')` que trae la guía en `disconnectedCallback`, porque la
  regla de 2.0 solo admite los logs de tiempos; el método quedó vacío y se eliminó.

## Qué fue más fácil por la independencia

- Cada cambio quedó en el repo de quien lo hizo: tokens, contrato de eventos del Carrito, `canal`, Seguimiento,
  ruta en el contenedor. Los historiales cuentan la historia por separado.
- Cada MFE se probó solo, sin contenedor: `contrato.html` en 8081, 8082, 8083 y 8084 (8, 12, 7 y 20
  comprobaciones, todas ✓).
- El despliegue de prueba (`desplegar.js catalogo 1.1.0`) produjo un commit en `mfe-catalogo` y ninguno en los
  otros cinco repos; los procesos de los servidores siguieron siendo los mismos.
- Caída de Perfil: el resto de la app siguió funcionando y **Reintentar** lo montó sin recargar la página.
- Caída del servidor de tokens (8085): sin cambios visibles, gracias a los `var(--upc-…, respaldo)`.
- Vue conviviendo con JS puro y un Web Component: no hubo conflictos. Cargado como módulo ES, no crea la
  global `Vue`.
- Un `button { background: black; }` en el CSS del contenedor no afectó a Perfil (Shadow DOM) ni a Catálogo y
  Carrito (clases con prefijo, que pesan más que el selector de elemento); sí afectó a un botón sin clase.

## Qué fue más difícil o costoso por la independencia

- Seis repos y seis servidores para una app pequeña; el modo "todos juntos" depende de que las carpetas sean
  hermanas y de tener libres los puertos 8080–8085.
- Ver una versión nueva exige recargar: `cargarScript` guarda la promesa de cada script, así que navegar
  entre secciones no vuelve a descargar. Al recargar se pierde el estado en memoria (carrito y pedidos).
- Estado y temporizadores de Seguimiento a nivel de módulo, más `precargar: true`, fueron necesarios para no
  perder eventos; es una regla que cada MFE con estado debe recordar aplicar.
- `contrato.html` repite el mismo mini-ejecutor de pruebas en los cuatro MFE (unas 40 líneas), porque
  compartirlo habría creado una dependencia entre repos.
- Seguimiento agrega una dependencia de red en tiempo de ejecución (`unpkg.com`, Vue 3.5.13). Si el CDN falla,
  la sección muestra un mensaje; el resto sigue funcionando.
- El tiempo de carga que mide el contenedor cubre el script del MFE, no la descarga diferida de Vue.

## Números medidos (una corrida local, Chromium sin interfaz)

- Tiempos de carga en consola: Catalogo 59.7 ms, Carrito 61.3 ms, Seguimiento 63.0 ms, Perfil 7.3 ms (los tres
  primeros descargan al arrancar y en paralelo; Perfil es bajo demanda).
- Fallo de Perfil apagado: `Perfil no se pudo cargar (5.2 ms)`; tras volver a encenderlo, `Perfil cargado en
  11.8 ms`.
- El primer avance de estado tardó 5.7 s con el intervalo de 6 s (el pedido llevaba unos instantes creado).
- Un pedido tarda unos 18 s en llegar de Recibido a Entregado (3 pasos de 6 s).
