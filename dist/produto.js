const money=cents=>(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const productId=Number(new URLSearchParams(location.search).get('id'));
const container=document.querySelector('#product-page-content');
function escapeHtml(value){const box=document.createElement('div');box.textContent=value??'';return box.innerHTML}
const OFFICIAL_PRODUCT_VIDEOS=Object.freeze({
  'nobrecar|viper':{id:'o9LbABOuOuI',channel:'Nobrecar'},
  'nobrecar|feroz':{id:'pBxAHFD9Cjs',channel:'Nobrecar'},
  'nobrecar|ceramic coating 7h':{id:'uOKh6Kw0Ldw',channel:'Nobrecar'},
  'nobrecar|creamyx wax':{id:'cuPUgavf3TQ',channel:'Nobrecar'},
  'nobrecar|apc orange':{id:'6X44X21HhfY',channel:'Nobrecar'},
  'nobrecar|aroma':{id:'BI36RCoK1WI',channel:'Nobrecar'},
  'nobrecar|boina de espuma branca refino':{id:'_S71zFV6mjA',channel:'Nobrecar'},
  'nobrecar|boina de espuma laranja corte':{id:'_S71zFV6mjA',channel:'Nobrecar'},
  'nobrecar|boina la gold roto orbital':{id:'7HP_yo62ENU',channel:'Nobrecar'},
  'nobrecar|boina la hibrida rotativa':{id:'7HP_yo62ENU',channel:'Nobrecar'},
  'nobrecar|boina la hibrida roto orbital':{id:'7HP_yo62ENU',channel:'Nobrecar'},
  'nobrecar|carnauba plastic':{id:'wRLjY_zs2q4',channel:'Nobrecar'},
  'nobrecar|clay bar':{id:'-icC1gBvcL8',channel:'Nobrecar'},
  'nobrecar|couro premium':{id:'SIWEQpRjboo',channel:'Nobrecar'},
  'nobrecar|cristal flex':{id:'OxjBuRH05x8',channel:'Nobrecar'},
  'nobrecar|detail finish':{id:'Lj4QxTY0hmE',channel:'Nobrecar'},
  'nobrecar|dropper':{id:'8slQzct69Lc',channel:'Nobrecar'},
  'nobrecar|espuma aplicadora':{id:'sxrMoKEaJZA',channel:'Nobrecar'},
  'nobrecar|gel car':{id:'GNYAnQg4ghA',channel:'Nobrecar'},
  'nobrecar|graphene coating 9h':{id:'qtmgc9mpCyg',channel:'Nobrecar'},
  'nobrecar|green removedor':{id:'DzDXkfOffEM',channel:'Nobrecar'},
  'nobrecar|plastic protection':{id:'gWFagw8somg',channel:'Nobrecar'},
  'nobrecar|nc solution':{id:'XGM4M4qqUZc',channel:'Nobrecar'},
  'nobrecar|nc fast':{id:'o_9R01E3S1U',channel:'Nobrecar'},
  'nobrecar|nc technology':{id:'soivvbdcX2k',channel:'Nobrecar'},
  'nobrecar|metal polish':{id:'xxF5Hri_iZg',channel:'Nobrecar'},
  'nobrecar|remox':{id:'Is0i4iYrivI',channel:'Nobrecar'},
  'nobrecar|off road cleaner':{id:'L6-cXcm44BQ',channel:'Nobrecar'},
  'nobrecar|nc cut select':{id:'DHbk_jJEOdc',channel:'Nobrecar'},
  'nobrecar|nc polish select':{id:'DHbk_jJEOdc',channel:'Nobrecar'},
  'nobrecar|boina la gold rotativa':{id:'DHbk_jJEOdc',channel:'Nobrecar'},
  'nobrecar|synthetic coating 5h':{id:'YkCVAgx9BV8',channel:'Nobrecar'},
  'nobrecar|vision':{id:'ZNwS48pyJb4',channel:'Nobrecar'},
  'nobrecar|restored plastic':{id:'VH1f_nG1zbU',channel:'Nobrecar'},
  'nobrecar|super pretinho':{id:'jgxqzCP61zo',channel:'Nobrecar'},
  'nobrecar|shampoo camaleao':{id:'0CFeM8qMc8Y',channel:'Nobrecar'},
  'nobrecar|sm condicionador de pneus':{id:'mY7Eoz-Gld8',channel:'Nobrecar'},
  'nobrecar|tira cola':{id:'c2N-yZl25po',channel:'Nobrecar'},
  'nobrecar|visible glass':{id:'j4X9UYeebQE',channel:'Nobrecar'},
  'lincoln|hcf':{id:'m3lT0hi-Hj8',channel:'Lincoln Polidores'},
  'lincoln|hgf':{id:'u765QW5SuWY',channel:'Lincoln Polidores'},
  'lincoln|hpf':{id:'QmE-A1UQqtc',channel:'Lincoln Polidores'},
  'lincoln|boina de la ninja corte pesado':{id:'FFnado-77mo',channel:'Lincoln Polidores'},
  'lincoln|luva de lavagem verde premium':{id:'8cfRK0uA7Oc',channel:'Lincoln Polidores'},
  'adelbras|fita crepe amarela 765':{id:'kHCr8GPsvRI',channel:'Adelbras Fitas Adesivas'},
  'adelbras|fita crepe verde 766':{id:'kHCr8GPsvRI',channel:'Adelbras Fitas Adesivas'},
  'lincoln|boina pirulito com interface corte pesado':{id:'tc3kWx8HWGA',channel:'Lincoln Polidores'},
  'lincoln|boina espuma corte laranja':{id:'tc3kWx8HWGA',channel:'Lincoln Polidores'}
});
function productVideoKey(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR')}
function renderOfficialProductVideo(product){
  const video=OFFICIAL_PRODUCT_VIDEOS[productVideoKey(product.marca)+'|'+productVideoKey(product.nome)];
  if(!video||!/^[A-Za-z0-9_-]{11}$/.test(video.id))return '';
  const watchUrl='https://www.youtube.com/watch?v='+video.id;
  return '<section class="product-video" aria-labelledby="product-video-title"><h2 id="product-video-title">Vídeo oficial do produto</h2><div class="product-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/'+video.id+'?rel=0" title="'+escapeHtml(product.nome+' · canal oficial '+video.channel)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p class="product-video-source"><a href="'+watchUrl+'" target="_blank" rel="noopener noreferrer">Assistir no canal oficial '+escapeHtml(video.channel)+' ↗</a></p></section>';
}
function productQuantityTiers(variant){
  return (Array.isArray(variant.quantity_prices)?variant.quantity_prices:[]).map(tier=>({min_quantity:Math.floor(Number(tier?.min_quantity)),card_price_cents:Math.round(Number(tier?.card_price_cents??tier?.price_cents)),cash_price_cents:Math.round(Number(tier?.cash_price_cents??tier?.price_cents))})).filter(tier=>tier.min_quantity>=2&&tier.card_price_cents>0&&tier.cash_price_cents>0).sort((a,b)=>a.min_quantity-b.min_quantity);
}
function productPrice(variant,quantity=1){
  const full=Math.max(0,Number(variant.preco)||0);
  const cash=Math.max(0,Number(variant.cash_preco??full)||full);
  const promoValue=Number(variant.promo_preco);
  const promo=Number.isFinite(promoValue)&&promoValue>0&&promoValue<cash?promoValue:null;
  let tier=null;
  for(const candidate of productQuantityTiers(variant))if(candidate.min_quantity<=quantity)tier=candidate;
  if(tier)return {full:tier.card_price_cents,cash:tier.cash_price_cents,promo:null,effectiveCash:tier.cash_price_cents,card:tier.card_price_cents,tier};
  const effectiveCash=promo??cash;
  const card=promo?Math.round(full*promo/cash):full;
  return {full,cash,promo,effectiveCash,card,tier:null};
}
function renderProduct(){
  const p=produtos[productId];
  if(!p){container.innerHTML='<section class="missing-product"><h1>Produto não encontrado</h1><p>Volte ao catálogo e escolha um produto.</p><a class="primary-link" href="index.html">Ver catálogo</a></section>';return}
  document.title=p.nome+' · Almeida Construções';
  const detail=productDetail(p);
  const videoSection=renderOfficialProductVideo(p);
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
  container.innerHTML='<article class="product-detail-page"><section class="product-visual">'+image+'</section><section class="product-content"><small>'+escapeHtml(String(p.marca||'').toUpperCase())+' · '+escapeHtml(String(p.grupo||'').toUpperCase())+'</small><h1>'+escapeHtml(p.nome)+'</h1>'+(p.descricao?'<p class="product-description">'+escapeHtml(p.descricao)+'</p>':'')+'<div class="product-information">'+(detail.d?'<section><h2>Durabilidade da aplicação</h2><p>'+escapeHtml(detail.d)+'</p></section>':'')+'<section><h2>Benefícios e funcionalidades</h2><ul>'+detail.b.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul></section><section><h2>Onde aplicar</h2><p>'+escapeHtml(detail.a)+'</p></section><section><h2>Como usar</h2><p>'+escapeHtml(detail.u)+'</p></section></div><label class="field">Escolha a variação<select id="product-variant">'+p.variacoes.map((v,index)=>'<option value="'+index+'">'+escapeHtml(v.nome)+' · '+money(v.preco)+'</option>').join('')+'</select></label><label class="field">Quantidade<input id="product-quantity" type="number" min="1" step="1" value="1" inputmode="numeric"></label><p id="product-bulk-notice" class="bulk-selection-notice" hidden></p><div id="product-price" class="product-price"></div><button id="product-add" class="primary">Adicionar ao carrinho</button>'+videoSection+'<p class="product-policy"></p>'+(p.fonte?'<a class="source-link" href="'+escapeHtml(p.fonte)+'" target="_blank" rel="noopener">Informações do fabricante ↗</a>':'')+'</section></article>';
  const update=()=>{
    const quantityInput=document.querySelector('#product-quantity'),quantity=Math.max(1,Math.floor(Number(quantityInput?.value)||1));
    if(quantityInput)quantityInput.value=quantity;
    const variant=p.variacoes[Number(document.querySelector('#product-variant').value)],d=productPrice(variant,quantity),price=document.querySelector('#product-price'),policy=document.querySelector('.product-policy'),bulkNotice=document.querySelector('#product-bulk-notice');
    price.innerHTML=d.tier?'<strong>'+money(d.card)+'</strong><span>'+money(d.effectiveCash)+' no PIX ou dinheiro</span>':d.promo?'<strong>'+money(d.promo)+'</strong><span>'+money(d.promo)+' no PIX ou dinheiro</span><small>Cartão: '+money(d.card)+' em até 4x sem juros</small>':'<strong>'+money(d.full)+'</strong><span>'+money(d.cash)+' no PIX ou dinheiro</span><small>Cartão: '+money(d.card)+' em até 4x sem juros</small>';
    const tiers=productQuantityTiers(variant);
    if(bulkNotice){bulkNotice.innerHTML=tiers.length?tiers.map(tier=>'A partir de '+tier.min_quantity+' unidades · cartão '+money(tier.card_price_cents)+' · PIX/dinheiro '+money(tier.cash_price_cents)).join(' · '):'';bulkNotice.hidden=!tiers.length;}
    policy.textContent=d.tier?'A quantidade selecionada ativou a venda múltipla a partir de '+d.tier.min_quantity+' unidades.':d.promo?'Promoção aplicada no PIX/dinheiro. No cartão, o valor é recalculado proporcionalmente.':d.cash<d.full?'Preço especial no PIX/dinheiro. No cartão, é aplicado o preço cheio.':'Preço à vista definido pela loja. No cartão, o valor cheio é mantido.';
  };
  AlmeidaImageCleanup.watch(container);
  document.querySelector('#product-variant').onchange=update;
  document.querySelector('#product-quantity').oninput=update;
  update();
  document.querySelector('#product-add').onclick=()=>{const selected=Number(document.querySelector('#product-variant').value),quantity=Math.max(1,Math.floor(Number(document.querySelector('#product-quantity').value)||1)),cart=JSON.parse(sessionStorage.getItem('almeida-cart')||'[]'),item=cart.find(i=>i.id===productId&&i.vi===selected);if(item)item.qty+=quantity;else cart.push({id:productId,vi:selected,qty:quantity});sessionStorage.setItem('almeida-cart',JSON.stringify(cart));location.href='index.html?cart=1'};
}
async function loadProductFromSupabase(){
  try{
    const response=await fetch(ALMEIDA_SUPABASE_URL+'/rest/v1/products?active=eq.true&select=brand,name,subcategory,description,image_url,image_override_url,source_url,product_variants(id,name,price_cents,cash_price_cents,promo_price_cents,quantity_prices,active)&order=name.asc',{headers:{apikey:ALMEIDA_SUPABASE_KEY}});
    if(!response.ok)throw new Error('Catalog status '+response.status);
    const remote=await response.json();
    const normalized=remote.map((p,id)=>({id,marca:p.brand,nome:p.name,grupo:p.subcategory,descricao:p.description,imagem:p.image_override_url||localProductImage(p.brand,p.name,p.image_url),fonte:p.source_url,variacoes:(p.product_variants||[]).filter(v=>v.active).map(v=>({id:v.id,nome:v.name,preco:v.price_cents,cash_preco:v.cash_price_cents,promo_preco:v.promo_price_cents,quantity_prices:v.quantity_prices||[]}))})).filter(p=>p.variacoes.length);
    if(normalized.length){produtos=normalized;renderProduct()}
  }catch(error){console.info('Detalhes locais usados enquanto o banco não está disponível.',error)}
}
renderProduct();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');

