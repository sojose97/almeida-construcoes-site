(function(){
const sessionKey='almeida-customer-session';
document.querySelector('#orders')?.remove();
const account=document.querySelector('#account');
if(!account)return;
const cart=document.querySelector('#cart-button');
if(cart&&!cart.querySelector('.cart-symbol')){
  const count=cart.querySelector('#cart-count');
  cart.textContent='';
  cart.insertAdjacentHTML('afterbegin','<span class="cart-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H7"/><circle cx="10" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/></svg></span><span>Carrinho</span>');
  if(count)cart.appendChild(count);
  Object.assign(cart.style,{display:'inline-flex',alignItems:'center',gap:'6px'});
  Object.assign(cart.querySelector('.cart-symbol svg').style,{width:'18px',height:'18px',fill:'none',stroke:'#ffd026',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round'});
}

function renderAccountButton(){
  account.innerHTML='<span class="account-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8.7" r="3.2" class="account-symbol-cutout"/><path d="M5.5 19.2c1-3.2 3.1-4.9 6.5-4.9s5.5 1.7 6.5 4.9H5.5Z" class="account-symbol-cutout"/></svg></span><span class="account-copy"><span class="account-label">Minha Conta</span><small id="account-greeting" class="account-greeting" hidden></small></span>';
  Object.assign(account.style,{display:'inline-flex',alignItems:'center',gap:'8px',textAlign:'left',lineHeight:'1.05'});
}
renderAccountButton();
const greeting=account.querySelector('#account-greeting');
Object.assign(account.querySelector('.account-symbol').style,{display:'grid',placeItems:'center',width:'30px',height:'30px',flex:'0 0 30px'});
Object.assign(account.querySelector('.account-symbol svg').style,{width:'30px',height:'30px',fill:'#ffd026'});
Object.assign(account.querySelector('.account-symbol-cutout').style,{fill:'#191919'});
Object.assign(account.querySelector('.account-copy').style,{display:'flex',flexDirection:'column',gap:'3px'});
Object.assign(greeting.style,{display:'block',color:'#ffd026',fontSize:'11px',lineHeight:'1',fontWeight:'900',whiteSpace:'nowrap',textTransform:'uppercase'});

account.onclick=()=>{location.href='conta.html'};

// auth-storefront updates the button text after login/logout. Restore the two-line layout.
const buttonObserver=new MutationObserver(()=>{if(!account.querySelector('.account-label')){renderAccountButton();loadGreeting()}});
buttonObserver.observe(account,{childList:true,characterData:true});

function getSession(){try{return JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{return null}}
function getFirstName(value){const name=String(value||'').trim();return name?name.split(/\s+/)[0]:''}

async function loadGreeting(){
  const session=getSession();
  if(!session?.access_token){greeting.hidden=true;greeting.textContent='';return false}
  try{
    const headers={apikey:ALMEIDA_SUPABASE_KEY,Authorization:'Bearer '+session.access_token};
    const userResponse=await fetch(ALMEIDA_SUPABASE_URL+'/auth/v1/user',{headers});
    if(!userResponse.ok)throw new Error('session');
    const user=await userResponse.json();
    let name=user.user_metadata?.full_name||user.email?.split('@')[0]||'';
    if(user.id){
      const profileResponse=await fetch(ALMEIDA_SUPABASE_URL+'/rest/v1/profiles?select=full_name&id=eq.'+encodeURIComponent(user.id),{headers});
      if(profileResponse.ok){const rows=await profileResponse.json();name=rows?.[0]?.full_name||name}
    }
    const first=getFirstName(name);
    if(!first){greeting.hidden=true;greeting.textContent='';return true}
    greeting.textContent='Olá, '+first;
    greeting.hidden=false;
    return true;
  }catch{
    greeting.hidden=true;
    greeting.textContent='';
    return false;
  }
}

window.refreshAccountGreeting=loadGreeting;
loadGreeting();
// Login happens in the modal without a page reload; check briefly for the new session.
let checks=0;
const timer=setInterval(async()=>{if(await loadGreeting()||++checks>=20)clearInterval(timer)},500);
})();

