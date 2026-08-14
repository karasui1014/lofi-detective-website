(function(){
  var n=0,t=0;
  document.addEventListener('DOMContentLoaded',function(){
    var el=document.querySelector('h1');
    if(!el)return;
    el.addEventListener('click',function(){
      var now=Date.now();
      n=(now-t<1500)?n+1:1;
      t=now;
      if(n>=5){
        n=0;
        var b=document.createElement('div');
        b.textContent='© karasui1014 ／ AI音楽部 Studio 提供ツール ／ '+new Date().toLocaleString('ja-JP');
        b.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;background:#161616;color:#fff;padding:12px 16px;border-radius:10px;font:12px/1.6 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:260px;';
        document.body.appendChild(b);
        setTimeout(function(){b.remove();},6000);
      }
    });
  });
})();
