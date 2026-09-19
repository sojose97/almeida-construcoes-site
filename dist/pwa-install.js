(function(){
  const button=document.querySelector('#install-app');
  if(!button)return;
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    button.hidden=false;
  });
  button.addEventListener('click',async()=>{
    if(!deferredPrompt)return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
    button.hidden=true;
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;button.hidden=true});
})();

