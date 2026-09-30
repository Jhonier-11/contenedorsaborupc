(function () {
  const RUTA_INICIAL = '/catalogo';
  const ID_RAIZ = 'app-root';
  const DURACION_TOAST_MS = 3000;
  const raiz = document.getElementById(ID_RAIZ);
  const scripts = {};      // url -> Promise (cada script se descarga una sola vez)
  let montado = null;      // entrada del registro montada en este momento
  let turno = 0;           // evita condiciones de carrera si el usuario navega rápido

  // Observabilidad: cuánto tardó en cargar (o en fallar) cada micro frontend
  function registrarTiempo(nombre, inicio, cargado) {
    const ms = (performance.now() - inicio).toFixed(1);
    if (cargado) console.log('[SaborUPC] ' + nombre + ' cargado en ' + ms + ' ms');
    else console.warn('[SaborUPC] ' + nombre + ' no se pudo cargar (' + ms + ' ms)');
  }

  // 1. Descarga dinámica del bundle de un micro frontend
  function cargarScript(entrada) {
    const url = entrada.url;
    if (!scripts[url]) {
      const inicio = performance.now();
      scripts[url] = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = url + '?v=' + Date.now(); // sin caché: vemos cada "despliegue" al recargar
        s.onload = function () {
          registrarTiempo(entrada.nombre, inicio, true);
          resolve();
        };
        s.onerror = function () {
          delete scripts[url];
          registrarTiempo(entrada.nombre, inicio, false);
          reject(new Error('No se pudo cargar ' + url));
        };
        document.head.appendChild(s);
      });
    }
    return scripts[url];
  }

  // 2. Contrato de montaje / desmontaje
  function montar(entrada) {
    if (entrada.tipo === 'funcion') {
      window['render' + entrada.nombre](ID_RAIZ);
    } else if (entrada.tipo === 'webcomponent') {
      raiz.appendChild(document.createElement(entrada.etiqueta));
    }
    montado = entrada;
  }

  function desmontarActual() {
    if (montado && montado.tipo === 'funcion') {
      const desmontar = window['unmount' + montado.nombre];
      if (typeof desmontar === 'function') desmontar(ID_RAIZ);
    }
    raiz.innerHTML = '';
    montado = null;
  }

  // 3. Enrutamiento: la URL decide qué micro frontend se muestra
  async function navegar() {
    const miTurno = ++turno;
    const ruta = location.hash.replace('#', '') || RUTA_INICIAL;
    const entrada = window.REGISTRO_MFE[ruta];
    marcarEnlaceActivo(ruta);
    desmontarActual();

    if (!entrada) {
      raiz.innerHTML = '<p class="app-aviso">Página no encontrada.</p>';
      return;
    }
    raiz.innerHTML = '<p class="app-aviso">Cargando ' + entrada.nombre + '…</p>';
    try {
      await cargarScript(entrada);
      if (miTurno !== turno) return;   // el usuario ya navegó a otra ruta
      raiz.innerHTML = '';
      montar(entrada);
    } catch (e) {
      if (miTurno !== turno) return;
      raiz.innerHTML = '<div class="app-error">El micro frontend <b>' + entrada.nombre +
        '</b> no está disponible en este momento. El resto de la aplicación sigue funcionando. ' +
        '<button type="button" class="app-reintentar">Reintentar</button></div>';
      console.error(e);
    }
  }

  // Reintentar sin recargar la página: cargarScript ya descartó la promesa fallida,
  // así que navegar() vuelve a intentar la descarga.
  raiz.addEventListener('click', function (e) {
    if (e.target.closest('.app-reintentar')) navegar();
  });

  function marcarEnlaceActivo(ruta) {
    document.querySelectorAll('.app-nav a').forEach(function (a) {
      a.classList.toggle('activo', a.dataset.ruta === ruta);
    });
  }

  // 4. Comunicación: el contenedor solo ESCUCHA eventos públicos
  window.addEventListener('carrito:actualizado', function (e) {
    document.getElementById('app-contador').textContent = e.detail.cantidad;
  });
  window.addEventListener('usuario:cambio', function (e) {
    document.getElementById('app-saludo').textContent = 'Hola, ' + e.detail.nombre;
  });

  window.addEventListener('pedido:estado', function (e) {
    mostrarToast('Pedido #' + e.detail.id + ': ' + e.detail.estado);
  });

  // Aviso breve que desaparece solo
  function mostrarToast(texto) {
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.textContent = texto;
    document.getElementById('app-toasts').appendChild(toast);
    setTimeout(function () { toast.remove(); }, DURACION_TOAST_MS);
  }

  // 5. Arranque: precargar los micro frontends que lo requieran y navegar
  Object.values(window.REGISTRO_MFE)
    .filter(function (m) { return m.precargar; })
    .forEach(function (m) { cargarScript(m).catch(console.error); });

  window.addEventListener('hashchange', navegar);
  navegar();
})();
