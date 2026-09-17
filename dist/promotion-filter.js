(function(){
if(!document.querySelector('#grid'))return;
const renderWithPromotion=()=>{
  const groups=['Todos','Promoção',...new Set(produtos.map(p=>p.grupo).filter(Boolean))];
  $('#filters').innerHTML=groups.map(g=>`<button class="${g===group?'active':''}" data-group="${g}">${g.toUpperCase()}</button>`).join('');
  const isPromo=p=>(p.variacoes||[]).some(v=>{const d=priceData(v);return d.promo>0&&d.promo<d.cash});
  const list=produtos.filter(p=>(group==='Todos'||(group==='Promoção'?isPromo(p):p.grupo===group))&&`${p.nome} ${p.marca}`.toLocaleLowerCase('pt-BR').includes(query));
  $('#result-count').textContent=`${list.length} produtos`;
  $('#grid').innerHTML=list.map(p=>`<article class="card" data-id="${p.id}"><a class="card-open" href="produto.html?id=${encodeURIComponent(p.id)}">${p.imagem?`<img class="card-image processing" data-clean-image src="${p.imagem}" alt="${p.nome}">`:`<div class="photo">${p.marca[0]}</div>`}<div class="card-content"><small>${p.marca.toUpperCase()} · ${p.grupo}</small><h3>${p.nome}</h3><div class="variant">${p.variacoes.length>1?`${p.variacoes.length} variações`:(p.variacoes[0].nome==='Padrão'?'':p.variacoes[0].nome)}</div><div class="card-price">${cardPrice(p,0)}</div></div></a><div class="quick-buy"><label>Variação<select data-variant>${p.variacoes.map((v,index)=>`<option value="${index}">${v.nome}</option>`).join('')}</select></label><label>Qtd.<input data-quantity type="number" min="1" value="1" inputmode="numeric"></label><button data-add class="quick-add">Adicionar</button></div></article>`).join('')||'<p class="notice">Nenhum produto em promoção no momento.</p>';
  $('#cart-count').textContent=cart.reduce((n,i)=>n+i.qty,0);AlmeidaImageCleanup.watch($('#grid'));
};
render=renderWithPromotion;render();
})();