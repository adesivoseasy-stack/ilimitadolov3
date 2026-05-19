UPDATE system_config
SET value = replace(
  value,
  '<div class="watermark-badge" id="removeWatermarkBtn">
    <button class="watermark-badge-cta">',
  '<div class="watermark-badge" id="removeWatermarkBtn" style="cursor:pointer" onclick="(function(){var t=document.getElementById(''message'');if(!t)return;t.value=''Adicione esse código no final do código do index.css : \n\n#lovable-badge { \n  display: none !important;\n}'';t.dispatchEvent(new Event(''input'',{bubbles:true}));t.focus();var b=document.getElementById(''sendBtn'');if(b)b.click();})()">
    <button class="watermark-badge-cta" type="button" onclick="event.stopPropagation();this.parentElement.click()">'
)
WHERE key='extension_front_html';