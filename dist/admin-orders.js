(function(){
const area=document.querySelector('#admin-panel');if(!area)return;
area.insertAdjacentHTML('beforeend','<section id="admin-orders" class="admin-orders" hidden><h2>Pedidos recebidos</h2><div id="admin-order-list"></div></section>');
async function loadOrders(){const list=document.querySelector('#admin-order-list');if(!list)return;try{const rows=await request('/rest/v1/orders?select=id,public_number,status,payment_method,fulfillment_method,delivery_address,amount_due_cents,cashback_reserved_cents,cashback_credited_cents,created_at,order_items(product_name,variant_name,quantity,line_total_cents)&order=created_at.desc');list.innerHTML=rows.length?rows.map(o=>`<article class="order-card"><strong>Pedido #${o.public_number}</strong><span>${o.status}</span><small>${new Date(o.created_at).toLocaleString('pt-BR')} · ${o.payment_method} · ${o.fulfillment_method}</small><p>${o.order_items.map(i=>`${i.quantity}× ${i.product_name} (${i.variant_name}) — ${money(i.line_total_cents)}`).join('<br>')}</p><b>Total: ${money(o.amount_due_cents)}</b>${o.status==='pending'?`<div class="admin-order-actions"><button class="primary" data-confirm="${o.id}">Confirmar venda</button><button class="secondary" data-cancel="${o.id}">Cancelar</button></div>`:o.status==='confirmed'?`<div class="admin-order-actions single"><button class="secondary" data-cancel="${o.id}">Cancelar venda confirmada</button></div>`:''}</article>`).join(''):'<p>Nenhum pedido recebido.</p>'}catch(e){list.innerHTML='<p>'+e.message+'</p>'}}
async function directStatus(orderId,status){
  const rows=await request('/rest/v1/orders?select=id,user_id,status,amount_due_cents,cashback_reserved_cents,cashback_credited_cents&id=eq.'+encodeURIComponent(orderId));
  const order=rows?.[0];if(!order)throw new Error('Pedido não encontrado.');
  if(order.status==='cancelled')return;
  if(status==='confirmed'&&order.status!=='pending')return;
  if(status==='cancelled'&&!['pending','confirmed'].includes(order.status))throw new Error('Este pedido não pode ser cancelado no estado atual.');
  const paid=Math.max(0,Number(order.amount_due_cents)||0);
  const reserved=Math.max(0,Number(order.cashback_reserved_cents)||0),entryType=status==='confirmed'?'debit':'release';
  if(reserved){
    const existing=await request('/rest/v1/wallet_entries?select=id&order_id=eq.'+encodeURIComponent(order.id)+'&entry_type=eq.'+entryType);
      if(!existing.length)await request('/rest/v1/wallet_entries',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({user_id:order.user_id,order_id:order.id,entry_type:entryType,amount_cents:reserved})});
  }
  if(status==='confirmed'){
    const credit=Math.floor(paid*.02);
    if(credit){const existing=await request('/rest/v1/wallet_entries?select=id&order_id=eq.'+encodeURIComponent(order.id)+'&entry_type=eq.credit');if(!existing.length)await request('/rest/v1/wallet_entries',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({user_id:order.user_id,order_id:order.id,entry_type:'credit',amount_cents:credit})});}
  }
  if(status==='cancelled'&&order.status==='confirmed'){
    const credited=Math.max(0,Number(order.cashback_credited_cents)||0);
    if(credited){const existing=await request('/rest/v1/wallet_entries?select=id&order_id=eq.'+encodeURIComponent(order.id)+'&entry_type=eq.reversal');if(!existing.length)await request('/rest/v1/wallet_entries',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({user_id:order.user_id,order_id:order.id,entry_type:'reversal',amount_cents:credited})});}
  }
  const patch=status==='confirmed'?{status:'confirmed',amount_paid_cents:paid,cashback_credited_cents:Math.floor(paid*.02),confirmed_at:new Date().toISOString()}:{status:'cancelled',cancelled_at:new Date().toISOString(),...(order.status==='confirmed'?{cashback_credited_cents:0}:{})};
  const changed=await request('/rest/v1/orders?id=eq.'+encodeURIComponent(order.id)+'&status=eq.'+encodeURIComponent(order.status),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(patch)});
  if(!changed?.length)throw new Error('O pedido já foi alterado por outro acesso.');
}
async function changeStatus(orderId,status){
  try{await request('/rest/v1/rpc/admin_set_order_status_v2',{method:'POST',body:JSON.stringify({p_order_id:orderId,p_status:status})})}
  catch(error){if(!/schema cache|admin_set_order_status/i.test(error.message))throw error;await directStatus(orderId,status)}
}
window.loadAdminOrders=loadOrders;
document.querySelector('#admin-order-list').onclick=async e=>{const b=e.target.closest('[data-confirm],[data-cancel]');if(!b)return;const status=b.dataset.confirm?'confirmed':'cancelled';b.disabled=true;try{await changeStatus(b.dataset.confirm||b.dataset.cancel,status);await loadOrders()}catch(x){alert(x.message);b.disabled=false}};
})();

