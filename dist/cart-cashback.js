(function(){
  const sessionKey='almeida-customer-session';
  const money=cents=>(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const getSession=()=>{try{return JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{return null}};
  const availableBalance=entries=>entries.reduce((total,entry)=>{
    const cents=Math.max(0,Number(entry.amount_cents)||0);
    if(entry.entry_type==='credit'||entry.entry_type==='release')return total+cents;
    if(entry.entry_type==='debit'||entry.entry_type==='reserve'||entry.entry_type==='reversal')return total-cents;
    return total;
  },0);
  async function loadBalance(){
    const current=getSession();
    if(!current?.access_token)return 0;
    const response=await fetch(ALMEIDA_SUPABASE_URL+'/rest/v1/wallet_entries?select=entry_type,amount_cents',{headers:{apikey:ALMEIDA_SUPABASE_KEY,Authorization:'Bearer '+current.access_token}});
    if(!response.ok)return 0;
    const entries=await response.json();
    return Math.max(0,availableBalance(entries));
  }
  async function enhanceCart(){
    const input=document.querySelector('#cashback-use');
    if(!input)return;
    let label=input.closest('label');
    let notice=document.querySelector('#cashback-available');
    if(!notice){
      notice=document.createElement('p');
      notice.id='cashback-available';
      notice.className='cashback-available';
      if(label)label.parentNode.insertBefore(notice,label.nextSibling);
    }
    notice.textContent='Consultando saldo de cashback...';
    input.disabled=true;
    try{
      const balance=await loadBalance();
      notice.innerHTML='Saldo de cashback disponível: <strong>'+money(balance)+'</strong>';
      input.disabled=balance<=0;
      input.max=(balance/100).toFixed(2);
      input.placeholder=balance>0?'Opcional':'Sem saldo disponível';
      if(balance<=0)input.value='0';
      input.oninput=()=>{
        const typed=Math.max(0,Number(input.value)||0);
        const limit=balance/100;
        if(typed>limit)input.value=limit.toFixed(2);
        if(typed<0)input.value='0';
      };
    }catch(error){
      notice.textContent='Saldo de cashback disponível: R$ 0,00';
      input.disabled=true;
      input.value='0';
    }
  }
  window.refreshCashbackField=enhanceCart;
  const cartButton=document.querySelector('#cart-button');
  if(cartButton)cartButton.addEventListener('click',()=>setTimeout(enhanceCart,0));
})();

