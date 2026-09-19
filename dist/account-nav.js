(function(){
const sessionKey='almeida-customer-session';
document.querySelector('#orders')?.remove();
const account=document.querySelector('#account');
if(!account)return;

// The greeting belongs directly below “Minha conta” in the main catalog navigation.
const parent=account.parentNode;
const wrap=document.createElement('span');
wrap.className='account-nav-wrap';
parent.insertBefore(wrap,account);
wrap.appendChild(account);
const greeting=document.createElement('small');
greeting.id='account-greeting';
greeting.className='account-greeting';
greeting.hidden=true;
wrap.appendChild(greeting);
Object.assign(wrap.style,{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:'2px'});
Object.assign(greeting.style,{display:'block',color:'#ffd21f',fontSize:'11px',lineHeight:'1.1',fontWeight:'700',whiteSpace:'nowrap'});

const openLogin=account.onclick;
account.onclick=()=>{try{const session=JSON.parse(localStorage.getItem(sessionKey)||'null');if(session?.access_token){location.href='conta.html';return}}catch{}if(openLogin)openLogin.call(account)};

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

