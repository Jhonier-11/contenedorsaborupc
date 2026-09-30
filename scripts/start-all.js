// Servidor de desarrollo sin dependencias para SaborUPC (solo módulos nativos).
// Sirve cada carpeta del taller en su propio puerto, con Cache-Control: no-store.
//
// Uso (desde contenedor/):
//   node scripts/start-all.js                    levanta los cuatro servidores
//   node scripts/start-all.js --sin perfil       todos menos Perfil (simula su caída)
//   node scripts/start-all.js --solo perfil      solo Perfil (para "volver a encenderlo")
// --sin y --solo aceptan varios nombres separados por coma: --sin perfil,carrito
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ_TALLER = path.resolve(__dirname, '..', '..');
const SERVIDORES = [
  { clave: 'contenedor', carpeta: 'contenedor',   puerto: 8080 },
  { clave: 'catalogo',   carpeta: 'mfe-catalogo', puerto: 8081 },
  { clave: 'carrito',    carpeta: 'mfe-carrito',  puerto: 8082 },
  { clave: 'perfil',     carpeta: 'mfe-perfil',   puerto: 8083 }
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function leerLista(flag) {
  const args = process.argv.slice(2);
  const i = args.indexOf(flag);
  if (i === -1) return null;
  const valor = args[i + 1];
  if (!valor || valor.startsWith('--')) {
    console.error('Falta el valor de ' + flag + '. Ejemplo: ' + flag + ' perfil');
    process.exit(1);
  }
  return valor.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}

function validar(lista, flag) {
  const validas = SERVIDORES.map(function (s) { return s.clave; });
  (lista || []).forEach(function (n) {
    if (validas.indexOf(n) === -1) {
      console.error('Nombre desconocido en ' + flag + ': "' + n + '". Opciones: ' + validas.join(', '));
      process.exit(1);
    }
  });
}

function crearServidor(def) {
  const base = path.join(RAIZ_TALLER, def.carpeta);
  return http.createServer(function (req, res) {
    const cabeceras = { 'Cache-Control': 'no-store' };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, Object.assign({ Allow: 'GET, HEAD' }, cabeceras));
      return res.end();
    }
    let ruta;
    try {
      ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400, cabeceras);
      return res.end('Solicitud inválida');
    }
    let archivo = path.normalize(path.join(base, ruta));
    if (archivo !== base && archivo.indexOf(base + path.sep) !== 0) {
      res.writeHead(403, cabeceras);
      return res.end('Prohibido');
    }
    fs.stat(archivo, function (err, st) {
      if (!err && st.isDirectory()) {
        archivo = path.join(archivo, 'index.html');
        return fs.stat(archivo, function (err2, st2) { enviar(err2, st2); });
      }
      enviar(err, st);
    });
    function enviar(err, st) {
      if (err || !st.isFile()) {
        res.writeHead(404, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8' }, cabeceras));
        return res.end('404 No encontrado: ' + ruta);
      }
      const tipo = MIME[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, Object.assign({ 'Content-Type': tipo, 'Content-Length': st.size }, cabeceras));
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(archivo).on('error', function () { res.destroy(); }).pipe(res);
    }
  });
}

function iniciar(def) {
  return new Promise(function (resolve) {
    if (!fs.existsSync(path.join(RAIZ_TALLER, def.carpeta))) {
      console.error('✗ ' + def.carpeta + ': no existe la carpeta ' + path.join(RAIZ_TALLER, def.carpeta));
      return resolve(null);
    }
    const servidor = crearServidor(def);
    servidor.once('error', function (err) {
      if (err.code === 'EADDRINUSE') {
        console.error('✗ ' + def.carpeta + ': el puerto ' + def.puerto + ' ya está en uso. ' +
          'Cierre el proceso que lo ocupa (¿otra instancia de start-all.js?) y vuelva a intentarlo.');
      } else if (err.code === 'EACCES') {
        console.error('✗ ' + def.carpeta + ': sin permiso para usar el puerto ' + def.puerto + '.');
      } else {
        console.error('✗ ' + def.carpeta + ': ' + err.message);
      }
      resolve(null);
    });
    servidor.listen(def.puerto, function () {
      console.log('✓ ' + def.carpeta.padEnd(13) + 'http://localhost:' + def.puerto);
      resolve(servidor);
    });
  });
}

async function main() {
  const sin = leerLista('--sin');
  const solo = leerLista('--solo');
  validar(sin, '--sin');
  validar(solo, '--solo');
  if (sin && solo) {
    console.error('Use --sin o --solo, no ambos.');
    process.exit(1);
  }
  const elegidos = SERVIDORES.filter(function (s) {
    if (solo) return solo.indexOf(s.clave) !== -1;
    if (sin) return sin.indexOf(s.clave) === -1;
    return true;
  });
  if (elegidos.length === 0) {
    console.error('No hay servidores para iniciar.');
    process.exit(1);
  }
  if (sin || solo) {
    const apagados = SERVIDORES.filter(function (s) { return elegidos.indexOf(s) === -1; });
    if (apagados.length) console.log('(no se inician: ' + apagados.map(function (s) { return s.carpeta; }).join(', ') + ')');
  }
  const resultado = await Promise.all(elegidos.map(iniciar));
  const activos = resultado.filter(Boolean);
  if (activos.length === 0) {
    console.error('No se pudo iniciar ningún servidor.');
    process.exit(1);
  }
  if (activos.length < elegidos.length) {
    console.error('Atención: ' + (elegidos.length - activos.length) + ' servidor(es) no arrancaron; el resto sigue activo.');
  }
  console.log('Ctrl+C para detener.');
  process.on('SIGINT', function () { process.exit(0); });
}

main();
