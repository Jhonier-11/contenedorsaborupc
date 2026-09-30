(function () {
  const RUTA_INICIAL = '/catalogo';
  const ID_RAIZ = 'app-root';
  const raiz = document.getElementById(ID_RAIZ);
  const scripts = {};      // url -> Promise (cada script se descarga una sola vez)
  let montado = null;      // entrada del registro montada en este momento
  let turno = 0;           // evita condiciones de carrera si el usuario navega rápido

  // 1. Descarga dinámica del bundle de un micro frontend
  function cargarScript(url) {
    if (!scripts[url]) {
      scripts[url] = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = url + '?v=' + Date.now(); // sin caché: vemos cada "despliegue" al recargar
        s.onload = resolve;
        s.onerror = function () {
          delete scripts[url];
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
      await cargarScript(entrada.url);
      if (miTurno !== turno) return;   // el usuario ya navegó a otra ruta
      raiz.innerHTML = '';
      montar(entrada);
    } catch (e) {
      if (miTurno !== turno) return;
      raiz.innerHTML = '<p class="app-error">El micro frontend <b>' + entrada.nombre +
        '</b> no está disponible en este momento. El resto de la aplicación sigue funcionando.</p>';
      console.error(e);
    }
  }

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

  // 5. Arranque: precargar los micro frontends que lo requieran y navegar
  Object.values(window.REGISTRO_MFE)
    .filter(function (m) { return m.precargar; })
    .forEach(function (m) { cargarScript(m.url).catch(console.error); });

  window.addEventListener('hashchange', navegar);
  navegar();
})();
