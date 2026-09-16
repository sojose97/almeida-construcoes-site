const CACHE='almeida-catalogo-v2';
const FILES=['./','index.html','style.css','site.js','catalogo.js','supabase-config.js','assets/logo.jpg','assets/fachada.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&new URL(event.request.url).origin===location.origin)event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)))});
