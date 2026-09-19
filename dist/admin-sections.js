(function(){
const panel=document.querySelector('#admin-panel');if(!panel)return;
const heading=panel.querySelector('.admin-heading');
heading.insertAdjacentHTML('afterend','<nav class="admin-section-nav" aria-label="Seções do painel"><button type="button" class="admin-section-button active" data-admin-section="products">Produtos</button><button type="button" class="admin-section-button" data-admin-section="orders">Pedidos</button><button type="button" class="admin-section-button" data-admin-section="customers">Clientes</button></nav>');
const productArea=panel.querySelector('.admin-layout');
const targets={products:productArea,orders:panel.querySelector('#admin-orders'),customers:panel.querySelector('#admin-customers')};
function showSection(name){Object.entries(targets).forEach(([key,node])=>{if(node)node.hidden=key!==name});panel.querySelectorAll('[data-admin-section]').forEach(button=>button.classList.toggle('active',button.dataset.adminSection===name));if(name==='orders'&&typeof window.loadAdminOrders==='function')window.loadAdminOrders();if(name==='customers'&&typeof window.loadAdminCustomers==='function')window.loadAdminCustomers()}
panel.querySelector('.admin-section-nav').addEventListener('click',event=>{const button=event.target.closest('[data-admin-section]');if(button)showSection(button.dataset.adminSection)});
showSection('products');
})();

