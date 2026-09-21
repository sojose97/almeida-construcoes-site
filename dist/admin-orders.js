(function(){
const area=document.querySelector('#admin-panel');if(!area)return;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
area.insertAdjacentHTML('beforeend','<section id="admin-orders" class="admin-orders" hidden><h2>Pedidos recebidos</h2><div id="admin-order-list"></div></section>');
async function loadOrders(){const list=document.querySelector('#admin-order-list');if(!list)return;try{const rows=await request('/rest/v1/orders?select=id,public_number,status,payment_method,fulfillment_method,delivery_address,amount_due_cents,cashback_reserved_cents,cashback_credited_cents,created_at,order_items(product_name,variant_name,quantity,line_total_cents)&order=created_at.desc');list.innerHTML=rows.length?rows.map(o=>`<article class="order-card"><strong>Pedido #${esc(o.public_number)}</strong><span>${esc(o.status)}</span><small>${esc(new Date(o.created_at).toLocaleString('pt-BR'))} · ${esc(o.payment_method)} · ${esc(o.fulfillment_method)}</small><p>${(o.order_items||[]).map(i=>`${esc(i.quantity)}× ${esc(i.product_name)} (${esc(i.variant_name)}) — ${money(i.line_total_cents)}`).join('<br>')}</p><b>Total: ${money(o.amount_due_cents)}</b>${o.status==='pending'?`<div class="admin-order-actions"><button class="primary" data-confirm="${esc(o.id)}">Confirmar venda</button><button class="secondary" data-cancel="${esc(o.id)}">Cancelar</button></div>`:o.status==='confirmed'?`<div class="admin-order-actions single"><button class="secondary" data-cancel="${esc(o.id)}">Cancelar venda confirmada</button></div>`:''}</article>`).join(''):'<p>Nenhum pedido recebido.</p>'}catch(e){list.innerHTML='<p>'+esc(e.message)+'</p>'}}
async function changeStatus(orderId,status){
  const body=JSON.stringify({p_order_id:orderId,p_status:status});
  try{
    await request("/rest/v1/rpc/admin_set_order_status_v2",{method:"POST",body});
  }catch(error){
    // Both endpoints execute the same atomic, server-side transition. Retry
    // the compatibility endpoint for deployments whose PostgREST cache still
    // serves an older function definition. There are no direct table writes.
    try{
      await request("/rest/v1/rpc/admin_set_order_status",{method:"POST",body});
    }catch(fallbackError){
      throw new Error(String(fallbackError&&fallbackError.message||fallbackError)+" (v2: "+String(error&&error.message||error)+")");
    }
  }
}
window.loadAdminOrders=loadOrders;
document.querySelector('#admin-order-list').onclick=async e=>{const b=e.target.closest('[data-confirm],[data-cancel]');if(!b)return;const status=b.dataset.confirm?'confirmed':'cancelled';b.disabled=true;try{await changeStatus(b.dataset.confirm||b.dataset.cancel,status);await loadOrders()}catch(x){b.disabled=false;const card=b.closest('.order-card');if(card){const note=document.createElement('p');note.className='admin-order-error';note.textContent=x.message;card.append(note)}alert(x.message)}};
})();

