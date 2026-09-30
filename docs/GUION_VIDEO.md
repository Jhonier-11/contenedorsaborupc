# Guion del video — SaborUPC 2.0 (máximo 5:00)

Un solo integrante, pantalla compartida con navegador (F12 disponible) y dos terminales visibles.

## Preparación (antes de grabar)

1. Repos limpios: `git status` en cada carpeta sin cambios pendientes.
2. Terminal 1, en `contenedor/`: `node scripts/start-all.js --sin perfil`
3. Terminal 2, en `contenedor/`: `node scripts/start-all.js --solo perfil`
   (Perfil va aparte para poder apagarlo sin tocar lo demás.)
4. Navegador en http://localhost:8080 con la consola abierta (pestañas **Red** y **Consola**), sin filtros,
   "Disable cache" activado. En otra pestaña, abierta la lista de `contrato.html` (ver escena 6).
5. Tener a mano `git -C ../mfe-catalogo log --oneline -3`.

## Escenas

| Tiempo | Escena | Qué mostrar | Qué decir (idea) |
|---|---|---|---|
| 0:00–0:30 | 1. Arquitectura | Diagrama Mermaid del `README.md` (contenedor + 4 MFE + tokens, puertos 8080–8085). | Seis repos, seis orígenes; el contenedor solo conoce el `registro.js`; las piezas hablan por eventos. |
| 0:30–1:30 | 2. Recorrido funcional | Catálogo → buscar "arepa" → agregar 2 platos (el contador amarillo sube) → Carrito → **Confirmar pedido** → **Pedidos**: aparece "Pedido #1 · Recibido" → esperar el toast "Pedido #1: En preparación" → ir a Perfil, escribir nombre, guardar ("Hola, …"). | Catálogo y Carrito en JS puro, Perfil es Web Component, Seguimiento es Vue: mismo contrato de montaje. Los toasts los publica el contenedor al oír `pedido:estado`, aunque no esté en Pedidos. |
| 1:30–2:00 | 3. Pestaña Red por origen | En Red, columna Dominio/Puerto (o filtro `localhost`): 8080 (html, css, js), 8081 `catalogo.js`, 8082 `carrito.js`, 8084 `seguimiento.js`, 8085 `tokens.css`; `perfil.js` (8083) solo aparece al entrar a Perfil; `vue.esm-browser.prod.js` desde `unpkg.com` al montar Pedidos por primera vez. | Cada equipo despliega desde su origen. Carga bajo demanda y precarga. Sin CORS porque son `<script>`. |
| 2:00–3:00 | 4. Caída de un MFE | Terminal 2: **Ctrl+C** (Perfil apagado). Navegador: clic en Perfil → mensaje amigable + botón **Reintentar**. Volver a Catálogo/Carrito: siguen funcionando. Clic en Reintentar con el servidor aún caído (falla otra vez). Terminal 2: `node scripts/start-all.js --solo perfil`. Clic en **Reintentar**: Perfil aparece **sin recargar** la página. En Consola: `[SaborUPC] Perfil no se pudo cargar (… ms)` y luego `[SaborUPC] Perfil cargado en … ms`. | Una SPA monolítica se caería entera; aquí falla una sección. `cargarScript` descarta la promesa fallida, por eso se puede reintentar. |
| 3:00–4:00 | 5. Despliegue independiente en vivo | Con la app abierta en Catálogo: Terminal 1 (o una 3.ª): `node scripts/desplegar.js catalogo 1.1.0`. Mostrar la salida y `git -C ../mfe-catalogo log --oneline -1` (commit `chore(release)`) y `git -C ../mfe-carrito status` (nada). Recargar el navegador: `mfe-catalogo v1.1.0` y el cambio de color de la etiqueta. Señalar que ninguna terminal de servidor se tocó. | Solo cambió un repo, sin reiniciar nada. Una versión nueva se ve al recargar (navegar no vuelve a descargar un script cargado). |
| 4:00–4:45 | 6. Consola y contratos | Consola: filtrar por `SaborUPC` y mostrar los tiempos de los MFE. Abrir `http://localhost:8084/contrato.html` (todo ✓), señalar las tres líneas "Compatibilidad…" y "versión desconocida"; abrir 8081, 8082 y 8083 `contrato.html` (todo ✓). Mostrar `CONTRATOS.md`: tabla de eventos y regla de evolución. | El contrato se prueba sin el contenedor. `canal` se agregó a `pedido:confirmado` sin romper a Seguimiento. |
| 4:45–5:00 | 7. Cierre | Volver al diagrama. | Qué se ganó (autonomía, resiliencia, tecnologías distintas) y qué costó (contratos que hay que cuidar, más piezas que operar). |

## Al terminar la grabación

Deshacer el despliegue de prueba y detener los servidores:

```bash
git -C ../mfe-catalogo reset --hard HEAD~1   # quita el commit chore(release) de la demostración
```

Luego **Ctrl+C** en las terminales.

## Consejos

- Los estados avanzan cada ~6 s: confirme el pedido en la escena 2 con tiempo, mientras habla del resto.
- Si el toast se pierde, no importa: la vista de Pedidos muestra el estado actual.
- Para ahorrar tiempo en la escena 5, deje el comando escrito en la terminal y solo pulse Enter.
