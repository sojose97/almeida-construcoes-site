-- Venda múltipla por quantidade.
-- Cada item de quantity_prices tem o formato:
-- [{"min_quantity": 12, "card_price_cents": 600, "cash_price_cents": 550}]
alter table public.product_variants
  add column if not exists quantity_prices jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product_variants'::regclass
      and conname = 'product_variants_quantity_prices_array_check'
  ) then
    alter table public.product_variants
      add constraint product_variants_quantity_prices_array_check
      check (jsonb_typeof(quantity_prices) = 'array');
  end if;
end $$;

-- Converte faixas antigas de um único preço para os dois canais, preservando o valor anterior.
update public.product_variants
set quantity_prices = coalesce((
  select jsonb_agg(
    jsonb_build_object(
      'min_quantity', (tier->>'min_quantity')::integer,
      'card_price_cents', coalesce((tier->>'card_price_cents')::integer, (tier->>'price_cents')::integer),
      'cash_price_cents', coalesce((tier->>'cash_price_cents')::integer, (tier->>'price_cents')::integer)
    ) order by (tier->>'min_quantity')::integer
  )
  from jsonb_array_elements(quantity_prices) as tier
), '[]'::jsonb)
where jsonb_array_length(quantity_prices) > 0;

-- O mesmo cálculo precisa ser repetido no servidor para que o cliente não possa
-- alterar o preço final pelo navegador.
create or replace function public.place_order(
  p_items jsonb,
  p_payment_method text,
  p_fulfillment_method text,
  p_delivery_address jsonb default null,
  p_cashback_requested_cents integer default 0
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_public_number bigint;
  v_subtotal integer := 0;
  v_cash_total integer := 0;
  v_total integer := 0;
  v_cash_discount integer := 0;
  v_reserved integer := greatest(coalesce(p_cashback_requested_cents, 0), 0);
  v_balance integer := 0;
  v_item record;
  v_variant record;
  v_bulk_card integer;
  v_bulk_cash integer;
  v_full_unit integer;
  v_cash_unit integer;
  v_card_unit integer;
  v_unit integer;
  v_line integer;
begin
  if v_user is null then raise exception 'É necessário entrar na conta para finalizar o pedido.'; end if;
  if p_payment_method not in ('pix', 'cash', 'card') then raise exception 'Forma de pagamento inválida.'; end if;
  if p_fulfillment_method not in ('pickup', 'delivery') then raise exception 'Forma de recebimento inválida.'; end if;
  if p_fulfillment_method = 'delivery' and coalesce(p_delivery_address, '{}'::jsonb) = '{}'::jsonb then raise exception 'Informe o endereço de entrega.'; end if;

  select greatest(0,
    coalesce(sum(case when entry_type = 'credit' then amount_cents else 0 end), 0)
    + coalesce(sum(case when entry_type = 'release' then amount_cents else 0 end), 0)
    - coalesce(sum(case when entry_type in ('debit', 'reserve', 'reversal') then amount_cents else 0 end), 0)
  ) into v_balance from wallet_entries where user_id = v_user;
  if v_reserved > v_balance then raise exception 'Cashback disponível insuficiente.'; end if;

  for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer) loop
    if v_item.quantity is null or v_item.quantity < 1 then raise exception 'Quantidade inválida.'; end if;
    select pv.*, p.name as product_name into v_variant
      from product_variants pv join products p on p.id = pv.product_id
      where pv.id = v_item.variant_id and pv.active = true and p.active = true;
    if not found then raise exception 'Produto indisponível.'; end if;
    if v_variant.stock_quantity is not null and v_variant.stock_quantity < v_item.quantity then raise exception 'Estoque insuficiente para %.', v_variant.product_name; end if;

    v_bulk_card := null;
    v_bulk_cash := null;
    select greatest(0, coalesce((tier->>'card_price_cents')::integer, (tier->>'price_cents')::integer)),
           greatest(0, coalesce((tier->>'cash_price_cents')::integer, (tier->>'price_cents')::integer))
      into v_bulk_card, v_bulk_cash
      from jsonb_array_elements(coalesce(v_variant.quantity_prices, '[]'::jsonb)) as tier
      where (tier->>'min_quantity')::integer <= v_item.quantity
      order by (tier->>'min_quantity')::integer desc limit 1;
    v_full_unit := coalesce(v_bulk_card, v_variant.price_cents);
    v_cash_unit := case when v_bulk_cash is not null then v_bulk_cash
      else coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents, v_variant.price_cents) end;
    v_card_unit := case when v_bulk_card is not null then v_bulk_card
      else case when coalesce(v_variant.cash_price_cents, 0) > 0
        then round(v_variant.price_cents * coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents)::numeric / v_variant.cash_price_cents)
        else v_variant.price_cents end end;
    v_unit := case when p_payment_method in ('pix', 'cash') then v_cash_unit else v_card_unit end;
    v_subtotal := v_subtotal + v_full_unit * v_item.quantity;
    v_cash_total := v_cash_total + v_cash_unit * v_item.quantity;
    v_total := v_total + v_unit * v_item.quantity;
  end loop;
  if v_total <= 0 then raise exception 'O carrinho está vazio.'; end if;
  v_cash_discount := greatest(0, v_subtotal - v_total);
  if v_reserved > v_total then raise exception 'O cashback não pode ser maior que o total.'; end if;

  insert into orders(user_id, status, payment_method, fulfillment_method, delivery_address, subtotal_cents, cash_discount_cents, cashback_reserved_cents, amount_due_cents)
  values(v_user, 'pending', p_payment_method, p_fulfillment_method, p_delivery_address, v_subtotal, v_cash_discount, v_reserved, v_total - v_reserved)
  returning id, public_number into v_order_id, v_public_number;

  for v_item in select * from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer) loop
    select pv.*, p.name as product_name into v_variant
      from product_variants pv join products p on p.id = pv.product_id where pv.id = v_item.variant_id;
    v_bulk_card := null;
    v_bulk_cash := null;
    select greatest(0, coalesce((tier->>'card_price_cents')::integer, (tier->>'price_cents')::integer)),
           greatest(0, coalesce((tier->>'cash_price_cents')::integer, (tier->>'price_cents')::integer))
      into v_bulk_card, v_bulk_cash
      from jsonb_array_elements(coalesce(v_variant.quantity_prices, '[]'::jsonb)) as tier
      where (tier->>'min_quantity')::integer <= v_item.quantity
      order by (tier->>'min_quantity')::integer desc limit 1;
    v_full_unit := coalesce(v_bulk_card, v_variant.price_cents);
    v_cash_unit := case when v_bulk_cash is not null then v_bulk_cash
      else coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents, v_variant.price_cents) end;
    v_card_unit := case when v_bulk_card is not null then v_bulk_card
      else case when coalesce(v_variant.cash_price_cents, 0) > 0
        then round(v_variant.price_cents * coalesce(nullif(v_variant.promo_price_cents, 0), v_variant.cash_price_cents)::numeric / v_variant.cash_price_cents)
        else v_variant.price_cents end end;
    v_unit := case when p_payment_method in ('pix', 'cash') then v_cash_unit else v_card_unit end;
    v_line := v_unit * v_item.quantity;
    insert into order_items(order_id, variant_id, product_name, variant_name, unit_price_cents, quantity, line_total_cents)
    values(v_order_id, v_item.variant_id, v_variant.product_name, v_variant.name, v_unit, v_item.quantity, v_line);
  end loop;
  if v_reserved > 0 then
    insert into wallet_entries(user_id, order_id, entry_type, amount_cents) values(v_user, v_order_id, 'reserve', v_reserved);
  end if;
  return jsonb_build_object('order_id', v_order_id, 'public_number', v_public_number, 'amount_due_cents', v_total - v_reserved, 'cashback_reserved_cents', v_reserved);
end;
$function$;
