-- Harden checkout and the cashback ledger without changing existing orders.
-- A repeated checkout key returns its original order instead of creating a duplicate.
alter table public.orders
  add column if not exists checkout_request_id uuid;

create unique index if not exists orders_user_checkout_request_id_key
  on public.orders (user_id, checkout_request_id)
  where checkout_request_id is not null;

alter table public.wallet_entries
  drop constraint if exists wallet_entries_entry_type_check;

alter table public.wallet_entries
  add constraint wallet_entries_entry_type_check
  check (entry_type = any (array['reserve'::text, 'release'::text, 'debit'::text, 'credit'::text, 'reversal'::text, 'cashback_refund'::text]));

-- New callers provide a stable key; old deployed clients continue to use the
-- five-argument wrapper below until the Cloudflare deployment is updated.
create or replace function public.place_order(
  p_items jsonb,
  p_payment_method text,
  p_fulfillment_method text,
  p_delivery_address jsonb,
  p_cashback_requested_cents integer,
  p_checkout_request_id uuid
) returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_public_number bigint;
  v_subtotal bigint := 0;
  v_total bigint := 0;
  v_cash_discount bigint := 0;
  v_reserved integer := coalesce(p_cashback_requested_cents, 0);
  v_balance bigint := 0;
  v_item record;
  v_variant record;
  v_items jsonb;
  v_existing_order jsonb;
  v_bulk_card integer;
  v_bulk_cash integer;
  v_full_unit integer;
  v_cash_unit integer;
  v_card_unit integer;
  v_unit integer;
  v_line bigint;
begin
  if v_user is null then raise exception 'É necessário entrar na conta para finalizar o pedido.'; end if;
  if p_checkout_request_id is null then raise exception 'Não foi possível validar este pedido. Recarregue a página e tente novamente.'; end if;
  if p_payment_method is null or p_payment_method not in ('pix', 'cash', 'card') then raise exception 'Forma de pagamento inválida.'; end if;
  if p_fulfillment_method is null or p_fulfillment_method not in ('pickup', 'delivery') then raise exception 'Forma de recebimento inválida.'; end if;
  if v_reserved < 0 then raise exception 'Valor de cashback inválido.'; end if;
  if p_items is null or pg_catalog.jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Carrinho inválido.'; end if;
  if pg_catalog.jsonb_array_length(p_items) = 0 then raise exception 'O carrinho está vazio.'; end if;
  if p_fulfillment_method = 'delivery'
     and pg_catalog.length(pg_catalog.btrim(coalesce(p_delivery_address ->> 'text', ''))) = 0 then
    raise exception 'Informe o endereço de entrega.';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    where x.variant_id is null or x.quantity is null or x.quantity < 1
  ) then raise exception 'Produto ou quantidade inválida.'; end if;
  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id
    having pg_catalog.sum(x.quantity::bigint) > 2147483647
  ) then raise exception 'Quantidade total inválida.'; end if;

  -- Serialize wallet reservations and request-key checks per customer.
  perform 1 from public.profiles as profile where profile.id = v_user for update;
  if not found then raise exception 'Não foi possível carregar o cadastro do cliente.'; end if;

  select pg_catalog.jsonb_build_object(
    'order_id', existing.id,
    'public_number', existing.public_number,
    'amount_due_cents', existing.amount_due_cents,
    'cashback_reserved_cents', existing.cashback_reserved_cents
  ) into v_existing_order
  from public.orders as existing
  where existing.user_id = v_user
    and existing.checkout_request_id = p_checkout_request_id;
  if found then return v_existing_order; end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('variant_id', merged.variant_id, 'quantity', merged.quantity)
      order by merged.variant_id
    ), '[]'::jsonb
  ) into v_items
  from (
    select x.variant_id, pg_catalog.sum(x.quantity::bigint)::integer as quantity
    from pg_catalog.jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id
  ) as merged;

  select greatest(0,
    coalesce(pg_catalog.sum(case when entry.entry_type = 'credit' then entry.amount_cents else 0 end), 0)
    + coalesce(pg_catalog.sum(case when entry.entry_type in ('release', 'cashback_refund') then entry.amount_cents else 0 end), 0)
    - coalesce(pg_catalog.sum(case when entry.entry_type in ('debit', 'reserve', 'reversal') then entry.amount_cents else 0 end), 0)
  ) into v_balance
  from public.wallet_entries as entry
  where entry.user_id = v_user;
  if v_reserved > v_balance then raise exception 'Cashback disponível insuficiente.'; end if;

  -- Locks keep product/variant prices stable during checkout and serialize any
  -- future stock controls. Variant locks are acquired in a consistent order.
  for v_item in
    select * from pg_catalog.jsonb_to_recordset(v_items) as x(variant_id uuid, quantity integer)
    order by variant_id
  loop
    select pv.*, product.name as product_name into v_variant
    from public.product_variants as pv
    join public.products as product on product.id = pv.product_id
    where pv.id = v_item.variant_id and pv.active = true and product.active = true
    for update of pv, product;
    if not found then raise exception 'Produto indisponível.'; end if;
    if v_variant.stock_quantity is not null and v_variant.stock_quantity < v_item.quantity then
      raise exception 'Estoque insuficiente para %.', v_variant.product_name;
    end if;

    v_bulk_card := null;
    v_bulk_cash := null;
    select greatest(0, coalesce((tier ->> 'card_price_cents')::integer, (tier ->> 'price_cents')::integer)),
           greatest(0, coalesce((tier ->> 'cash_price_cents')::integer, (tier ->> 'price_cents')::integer))
      into v_bulk_card, v_bulk_cash
      from pg_catalog.jsonb_array_elements(coalesce(v_variant.quantity_prices, '[]'::jsonb)) as tier
      where (tier ->> 'min_quantity')::integer <= v_item.quantity
      order by (tier ->> 'min_quantity')::integer desc limit 1;
    v_full_unit := coalesce(v_bulk_card, v_variant.price_cents);
    v_cash_unit := case when v_bulk_cash is not null then v_bulk_cash
      else coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents, v_variant.price_cents) end;
    v_card_unit := case when v_bulk_card is not null then v_bulk_card
      else case when coalesce(v_variant.cash_price_cents, 0) > 0
        then pg_catalog.round(v_variant.price_cents * coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents)::numeric / v_variant.cash_price_cents)
        else v_variant.price_cents end end;
    v_unit := case when p_payment_method in ('pix', 'cash') then v_cash_unit else v_card_unit end;
    v_subtotal := v_subtotal + v_full_unit::bigint * v_item.quantity;
    v_total := v_total + v_unit::bigint * v_item.quantity;
  end loop;
  if v_total <= 0 then raise exception 'O carrinho está vazio.'; end if;
  if v_subtotal > 2147483647 or v_total > 2147483647 then raise exception 'O total do pedido excede o limite permitido.'; end if;
  if v_total > v_subtotal then raise exception 'Os preços deste produto precisam ser revisados pela loja.'; end if;
  v_cash_discount := v_subtotal - v_total;
  if v_reserved > v_total then raise exception 'O cashback não pode ser maior que o total.'; end if;

  insert into public.orders(
    user_id, checkout_request_id, status, payment_method, fulfillment_method,
    delivery_address, subtotal_cents, cash_discount_cents,
    cashback_reserved_cents, amount_due_cents
  ) values (
    v_user, p_checkout_request_id, 'pending', p_payment_method, p_fulfillment_method,
    p_delivery_address, v_subtotal::integer, v_cash_discount::integer,
    v_reserved, (v_total - v_reserved)::integer
  ) returning id, public_number into v_order_id, v_public_number;

  for v_item in
    select * from pg_catalog.jsonb_to_recordset(v_items) as x(variant_id uuid, quantity integer)
    order by variant_id
  loop
    select pv.*, product.name as product_name into v_variant
    from public.product_variants as pv
    join public.products as product on product.id = pv.product_id
    where pv.id = v_item.variant_id;
    v_bulk_card := null;
    v_bulk_cash := null;
    select greatest(0, coalesce((tier ->> 'card_price_cents')::integer, (tier ->> 'price_cents')::integer)),
           greatest(0, coalesce((tier ->> 'cash_price_cents')::integer, (tier ->> 'price_cents')::integer))
      into v_bulk_card, v_bulk_cash
      from pg_catalog.jsonb_array_elements(coalesce(v_variant.quantity_prices, '[]'::jsonb)) as tier
      where (tier ->> 'min_quantity')::integer <= v_item.quantity
      order by (tier ->> 'min_quantity')::integer desc limit 1;
    v_full_unit := coalesce(v_bulk_card, v_variant.price_cents);
    v_cash_unit := case when v_bulk_cash is not null then v_bulk_cash
      else coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents, v_variant.price_cents) end;
    v_card_unit := case when v_bulk_card is not null then v_bulk_card
      else case when coalesce(v_variant.cash_price_cents, 0) > 0
        then pg_catalog.round(v_variant.price_cents * coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents)::numeric / v_variant.cash_price_cents)
        else v_variant.price_cents end end;
    v_unit := case when p_payment_method in ('pix', 'cash') then v_cash_unit else v_card_unit end;
    v_line := v_unit::bigint * v_item.quantity;
    insert into public.order_items(order_id, variant_id, product_name, variant_name, unit_price_cents, quantity, line_total_cents)
    values(v_order_id, v_item.variant_id, v_variant.product_name, v_variant.name, v_unit, v_item.quantity, v_line::integer);
  end loop;
  if v_reserved > 0 then
    insert into public.wallet_entries(user_id, order_id, entry_type, amount_cents)
    values(v_user, v_order_id, 'reserve', v_reserved);
  end if;

  return pg_catalog.jsonb_build_object(
    'order_id', v_order_id,
    'public_number', v_public_number,
    'amount_due_cents', (v_total - v_reserved)::integer,
    'cashback_reserved_cents', v_reserved
  );
end;
$function$;

-- Compatibility endpoint for already-deployed storefront bundles.
create or replace function public.place_order(
  p_items jsonb,
  p_payment_method text,
  p_fulfillment_method text,
  p_delivery_address jsonb default null,
  p_cashback_requested_cents integer default 0
) returns jsonb
language sql security definer
set search_path = ''
as $function$
  select public.place_order(
    p_items, p_payment_method, p_fulfillment_method, p_delivery_address,
    p_cashback_requested_cents, pg_catalog.gen_random_uuid()
  );
$function$;

create or replace function public.admin_set_order_status(p_order_id uuid, p_status text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_paid integer;
  v_credit integer;
begin
  if not exists (
    select 1 from public.profiles as profile where profile.id = auth.uid() and profile.role = 'admin'
  ) then raise exception 'Acesso restrito à loja.'; end if;
  if p_status is null or p_status not in ('confirmed', 'cancelled') then raise exception 'Status inválido.'; end if;

  select * into v_order from public.orders as order_row where order_row.id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if p_status = 'confirmed' and v_order.status <> 'pending' then
    return pg_catalog.jsonb_build_object('status', v_order.status, 'order_id', v_order.id);
  end if;
  if p_status = 'cancelled' and v_order.status = 'cancelled' then
    return pg_catalog.jsonb_build_object('status', 'cancelled', 'order_id', v_order.id);
  end if;
  if p_status = 'cancelled' and v_order.status not in ('pending', 'confirmed') then
    raise exception 'Este pedido não pode ser cancelado no estado atual.';
  end if;

  -- Keep status changes and new checkout reservations serialized for each wallet.
  perform 1 from public.profiles as profile where profile.id = v_order.user_id for update;
  if not found then raise exception 'Não foi possível carregar o cadastro do cliente.'; end if;

  if p_status = 'confirmed' then
    v_paid := greatest(0, v_order.amount_due_cents);
    if v_order.cashback_reserved_cents > 0 then
      -- Release the pending reservation, then record its permanent debit.
      insert into public.wallet_entries(user_id, order_id, entry_type, amount_cents)
      values(v_order.user_id, v_order.id, 'release', v_order.cashback_reserved_cents)
      on conflict (order_id, entry_type) do nothing;
      insert into public.wallet_entries(user_id, order_id, entry_type, amount_cents)
      values(v_order.user_id, v_order.id, 'debit', v_order.cashback_reserved_cents)
      on conflict (order_id, entry_type) do nothing;
    end if;
    v_credit := pg_catalog.floor(v_paid::numeric * 0.02)::integer;
    if v_credit > 0 then
      insert into public.wallet_entries(user_id, order_id, entry_type, amount_cents)
      values(v_order.user_id, v_order.id, 'credit', v_credit)
      on conflict (order_id, entry_type) do nothing;
    end if;
    update public.orders
    set status = 'confirmed', amount_paid_cents = v_paid,
        cashback_credited_cents = v_credit, confirmed_at = pg_catalog.now()
    where id = v_order.id;
  else
    if v_order.cashback_reserved_cents > 0 then
      insert into public.wallet_entries(user_id, order_id, entry_type, amount_cents)
      values(v_order.user_id, v_order.id, 'release', v_order.cashback_reserved_cents)
      on conflict (order_id, entry_type) do nothing;
      if v_order.status = 'confirmed' then
        -- Refund cashback redeemed on a confirmed order. Cash payment refunds
        -- remain a separate, manual payment-provider/store operation.
        insert into public.wallet_entries(user_id, order_id, entry_type, amount_cents)
        values(v_order.user_id, v_order.id, 'cashback_refund', v_order.cashback_reserved_cents)
        on conflict (order_id, entry_type) do nothing;
      end if;
    end if;
    if v_order.status = 'confirmed' and v_order.cashback_credited_cents > 0 then
      insert into public.wallet_entries(user_id, order_id, entry_type, amount_cents)
      values(v_order.user_id, v_order.id, 'reversal', v_order.cashback_credited_cents)
      on conflict (order_id, entry_type) do nothing;
    end if;
    update public.orders
    set status = 'cancelled', cancelled_at = pg_catalog.now(),
        cashback_credited_cents = case when v_order.status = 'confirmed' then 0 else cashback_credited_cents end
    where id = v_order.id;
  end if;

  return pg_catalog.jsonb_build_object('status', p_status, 'order_id', v_order.id, 'cashback_rate', 0.02);
end;
$function$;

create or replace function public.admin_set_order_status_v2(p_order_id uuid, p_status text)
returns jsonb
language sql security definer
set search_path = ''
as $function$
  select public.admin_set_order_status(p_order_id, p_status);
$function$;

revoke all on function public.place_order(jsonb, text, text, jsonb, integer) from public, anon;
revoke all on function public.place_order(jsonb, text, text, jsonb, integer, uuid) from public, anon;
revoke all on function public.admin_set_order_status(uuid, text) from public, anon;
revoke all on function public.admin_set_order_status_v2(uuid, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, jsonb, integer) to authenticated, service_role;
grant execute on function public.place_order(jsonb, text, text, jsonb, integer, uuid) to authenticated, service_role;
grant execute on function public.admin_set_order_status(uuid, text) to authenticated, service_role;
grant execute on function public.admin_set_order_status_v2(uuid, text) to authenticated, service_role;

revoke select on table public.profiles, public.orders, public.order_items, public.wallet_entries from anon;

notify pgrst, 'reload schema';
