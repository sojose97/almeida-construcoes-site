const CACHE='almeida-catalogo-v42';
const FILES=['./','index.html','conta.html','conta.js','account-dashboard.css','produto.html','admin.html','style.css','site.js','admin.js','auth-storefront.js','account-nav.js','produto.js','image-cleanup.js','product-images.js','catalogo.js','supabase-config.js','assets/logo.jpg','assets/fachada-almeida.png'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)))});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&new URL(event.request.url).origin===location.origin)event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request)))});

