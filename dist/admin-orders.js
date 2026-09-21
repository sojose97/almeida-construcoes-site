(function () {
  var area = document.querySelector('#admin-panel');
  if (!area) return;
  var esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  area.insertAdjacentHTML('beforeend', '<section id="admin-orders" class="admin-orders" hidden><h2>Pedidos recebidos</h2><div id="admin-order-list"></div></section>');
  function orderHtml(order) {
    var items = (order.order_items || []).map(function (item) {
      return esc(item.quantity) + '× ' + esc(item.product_name) + ' (' + esc(item.variant_name) + ') — ' + money(item.line_total_cents);
    }).join('<br>');
    var actions = '';
    if (order.status === 'pending') {
      actions = '<div class="admin-order-actions"><button class="primary" data-confirm="' + esc(order.id) + '">Confirmar venda</button><button class="secondary" data-cancel="' + esc(order.id) + '">Cancelar</button></div>';
    } else if (order.status === 'confirmed') {
      actions = '<div class="admin-order-actions single"><button class="secondary" data-cancel="' + esc(order.id) + '">Cancelar venda confirmada</button></div>';
    }
    return '<article class="order-card"><strong>Pedido #' + esc(order.public_number) + '</strong><span>' + esc(order.status) + '</span><small>' + esc(new Date(order.created_at).toLocaleString('pt-BR')) + ' · ' + esc(order.payment_method) + ' · ' + esc(order.fulfillment_method) + '</small><p>' + items + '</p><b>Total: ' + money(order.amount_due_cents) + '</b>' + actions + '</article>';
  }
  async function loadOrders() {
    var list = document.querySelector('#admin-order-list');
    if (!list) return;
    try {
      var rows = await request('/rest/v1/orders?select=id,public_number,status,payment_method,fulfillment_method,delivery_address,amount_due_cents,cashback_reserved_cents,cashback_credited_cents,created_at,order_items(product_name,variant_name,quantity,line_total_cents)&order=created_at.desc');
      list.innerHTML = rows.length ? rows.map(orderHtml).join('') : '<p>Nenhum pedido recebido.</p>';
    } catch (error) {
      list.innerHTML = '<p>' + esc(error.message) + '</p>';
    }
  }
  async function changeStatus(orderId, status) {
    var options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_order_id: orderId, p_status: status }) };
    try {
      await request('/rest/v1/rpc/admin_set_order_status_v2', options);
    } catch (error) {
      try {
        await request('/rest/v1/rpc/admin_set_order_status', options);
      } catch (fallbackError) {
        throw new Error(String(fallbackError && fallbackError.message || fallbackError) + ' (v2: ' + String(error && error.message || error) + ')');
      }
    }
  }
  window.loadAdminOrders = loadOrders;
  document.querySelector('#admin-order-list').onclick = async function (event) {
    var button = event.target.closest('[data-confirm],[data-cancel]');
    if (!button) return;
    var status = button.dataset.confirm ? 'confirmed' : 'cancelled';
    button.disabled = true;
    try {
      await changeStatus(button.dataset.confirm || button.dataset.cancel, status);
      await loadOrders();
    } catch (error) {
      button.disabled = false;
      var card = button.closest('.order-card');
      if (card) {
        var note = document.createElement('p');
        note.className = 'admin-order-error';
        note.textContent = error.message;
        card.append(note);
      }
      alert(error.message);
    }
  };
})();


