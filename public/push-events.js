/* Loaded by the generated Workbox service worker. No client secrets are stored here. */
self.addEventListener('push', event => {
  let payload;
  try { payload = event.data.json(); } catch { payload = {title:'Invictus reminder',body:'Open your plan to see what is next.'}; }
  const url = typeof payload.url === 'string' && payload.url.startsWith('/plan') ? payload.url : '/plan';
  event.waitUntil(self.registration.showNotification(String(payload.title || 'Invictus').slice(0,180), {
    body:String(payload.body||'').slice(0,500), icon:'/pwa-192x192.png', badge:'/pwa-192x192.png',
    tag:payload.id || 'invictus-reminder', data:{url,id:payload.id,kind:payload.kind}, timestamp:payload.at,
    actions:[{action:'open',title:payload.kind==='prayer'?'Open prayer & azaan':'Open plan'}],
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url || '/plan';
  const url = new URL(path.startsWith('/plan') ? path : '/plan', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients => {
    for (const client of clients) if (new URL(client.url).origin === self.location.origin) { await client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});
