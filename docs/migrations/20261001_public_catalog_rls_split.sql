-- Keep anonymous catalog access public without requiring anon to read profiles.
-- The prior combined policies queried public.profiles for every role. After
-- revoking anon access to profiles, the policy itself raised 42501 on catalog reads.

drop policy if exists "catalog and admins read products" on public.products;
create policy "public reads active products"
  on public.products for select to anon
  using (active);
create policy "authenticated reads active products and admins"
  on public.products for select to authenticated
  using (
    active or exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid()) and profile.role = 'admin'
    )
  );

drop policy if exists "catalog and admins read product variants" on public.product_variants;
create policy "public reads active variants for active products"
  on public.product_variants for select to anon
  using (
    active and exists (
      select 1 from public.products as product
      where product.id = product_variants.product_id and product.active
    )
  );
create policy "authenticated reads active variants and admins"
  on public.product_variants for select to authenticated
  using (
    (active and exists (
      select 1 from public.products as product
      where product.id = product_variants.product_id and product.active
    )) or exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid()) and profile.role = 'admin'
    )
  );
