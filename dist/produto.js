const money=cents=>(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const productId=Number(new URLSearchParams(location.search).get('id'));
const container=document.querySelector('#product-page-content');
function escapeHtml(value){const box=document.createElement('div');box.textContent=value??'';return box.innerHTML}
function productPrice(variant){
  const full=Math.max(0,Number(variant.preco)||0);
  const cash=Math.max(0,Number(variant.cash_preco??full)||full);
  const promoValue=Number(variant.promo_preco);
  const promo=Number.isFinite(promoValue)&&promoValue>0&&promoValue<cash?promoValue:null;
  const effectiveCash=promo??cash;
  const card=promo?Math.round(full*promo/cash):full;
  return {full,cash,promo,effectiveCash,card};
}
function renderProduct(){
  const p=produtos[productId];
  if(!p){container.innerHTML='<section class="missing-product"><h1>Produto não encontrado</h1><p>Volte ao catálogo e escolha um produto.</p><a class="primary-link" href="index.html">Ver catálogo</a></section>';return}
  document.title=p.nome+' · Almeida Construções';
  const detail=productDetail(p);
  const durabilityByProduct={
    'Aroma':'A fragrância permanece no ambiente por até 12 horas.',
    'Ceramic Coating 7H':'Proteção e resistência por até 2 anos sobre a pintura.',
    'Graphene Coating 9H':'Proteção de até 3 anos sobre a pintura.',
    'Synthetic Coating 5H':'A proteção pode durar até 12 meses, conforme a ficha comercial do produto.',
    'Plastic Protection':'Até 90 dias em áreas externas e até 60 dias no interior do veículo.',
    'Restored Plastic':'De 6 a 12 meses, podendo chegar a 12 meses conforme as condições de uso.',
    'SM Condicionador de Pneus':'Proteção e aspecto renovado por até 20 dias.',
    'Dropper':'Até 4 meses de resistência na pintura.',
    'Creamyx Wax':'Proteção eficiente por até 20 dias.',
    'Detail Finish':'A proteção pode durar até 20 dias.'
  };
  detail.d=durabilityByProduct[p.nome]||detail.d;
  const image=p.imagem?'<img class="product-image processing" data-clean-image src="'+escapeHtml(p.imagem)+'" alt="'+escapeHtml(p.nome)+'">':'<div class="product-image product-placeholder" aria-hidden="true">'+escapeHtml(p.marca?.[0])+'</div>';
  container.innerHTML='<article class="product-detail-page"><section class="product-visual">'+image+'</section><section class="product-content"><small>'+escapeHtml(String(p.marca||'').toUpperCase())+' · '+escapeHtml(String(p.grupo||'').toUpperCase())+'</small><h1>'+escapeHtml(p.nome)+'</h1><p class="product-description">'+escapeHtml(p.descricao||('Produto '+p.marca+' da categoria '+p.grupo+'. Selecione a variação desejada para consultar o valor da Almeida Construções.'))+'</p><div class="product-information">'+(detail.d?'<section><h2>Durabilidade da aplicação</h2><p>'+escapeHtml(detail.d)+'</p></section>':'')+'<section><h2>Benefícios e funcionalidades</h2><ul>'+detail.b.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul></section><section><h2>Onde aplicar</h2><p>'+escapeHtml(detail.a)+'</p></section><section><h2>Como usar</h2><p>'+escapeHtml(detail.u)+'</p></section></div><label class="field">Escolha a variação<select id="product-variant">'+p.variacoes.map((v,index)=>'<option value="'+index+'">'+escapeHtml(v.nome)+' · '+money(v.preco)+'</option>').join('')+'</select></label><div id="product-price" class="product-price"></div><button id="product-add" class="primary">Adicionar ao carrinho</button><p class="product-policy"></p>'+(p.fonte?'<a class="source-link" href="'+escapeHtml(p.fonte)+'" target="_blank" rel="noopener">Informações do fabricante ↗</a>':'')+'</section></article>';
  const update=()=>{
    const variant=p.variacoes[Number(document.querySelector('#product-variant').value)],d=productPrice(variant),price=document.querySelector('#product-price'),policy=document.querySelector('.product-policy');
    price.innerHTML=d.promo?'<strong>'+money(d.promo)+'</strong><span>'+money(d.promo)+' no PIX ou dinheiro</span><small>Cartão: '+money(d.card)+' em até 4x sem juros</small>':'<strong>'+money(d.full)+'</strong><span>'+money(d.cash)+' no PIX ou dinheiro</span><small>Cartão: '+money(d.card)+' em até 4x sem juros</small>';
    policy.textContent=d.promo?'Promoção aplicada no PIX/dinheiro. No cartão, o valor é recalculado proporcionalmente.':d.cash<d.full?'Preço especial no PIX/dinheiro. No cartão, é aplicado o preço cheio.':'Preço à vista definido pela loja. No cartão, o valor cheio é mantido.';
  };
  AlmeidaImageCleanup.watch(container);
  document.querySelector('#product-variant').onchange=update;
  update();
  document.querySelector('#product-add').onclick=()=>{const selected=Number(document.querySelector('#product-variant').value),cart=JSON.parse(sessionStorage.getItem('almeida-cart')||'[]'),item=cart.find(i=>i.id===productId&&i.vi===selected);if(item)item.qty++;else cart.push({id:productId,vi:selected,qty:1});sessionStorage.setItem('almeida-cart',JSON.stringify(cart));location.href='index.html?cart=1'};
}
async function loadProductFromSupabase(){
  try{
    const response=await fetch(ALMEIDA_SUPABASE_URL+'/rest/v1/products?active=eq.true&select=brand,name,subcategory,description,image_url,image_override_url,source_url,product_variants(id,name,price_cents,cash_price_cents,promo_price_cents,active)&order=name.asc',{headers:{apikey:ALMEIDA_SUPABASE_KEY,Authorization:'Bearer '+ALMEIDA_SUPABASE_KEY}});
    if(!response.ok)throw new Error('Catalog status '+response.status);
    const remote=await response.json();
    const normalized=remote.map((p,id)=>({id,marca:p.brand,nome:p.name,grupo:p.subcategory,descricao:p.description,imagem:p.image_override_url||localProductImage(p.brand,p.name,p.image_url),fonte:p.source_url,variacoes:(p.product_variants||[]).filter(v=>v.active).map(v=>({id:v.id,nome:v.name,preco:v.price_cents,cash_preco:v.cash_price_cents,promo_preco:v.promo_price_cents}))})).filter(p=>p.variacoes.length);
    if(normalized.length){produtos=normalized;renderProduct()}
  }catch(error){console.info('Detalhes locais usados enquanto o banco não está disponível.',error)}
}
renderProduct();
loadProductFromSupabase();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');

