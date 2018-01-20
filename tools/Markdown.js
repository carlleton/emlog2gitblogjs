var toMarkdown=function(string){
  var ELEMENTS=[
    {patterns:'p',replacement:function(str,attrs,innerHTML){return innerHTML?'\n\n'+innerHTML+'\n':'';}},
    {patterns:'br',isvoid:true,replacement:'\n'},
    {patterns:'h([1-6])',replacement:function(str,hLevel,attrs,innerHTML){var hPrefix='';for(var i=0;i<hLevel;i++){hPrefix+='#';}return'\n\n'+hPrefix+' '+innerHTML+'\n';}},
    {patterns:'hr',isvoid:true,replacement:'\n\n* * *\n'},
    {patterns:'a',replacement:function(str,attrs,innerHTML){var href=attrs.match(attrRegExp('href')),title=attrs.match(attrRegExp('title'));return href?'['+innerHTML+']'+'('+href[1]+(title&&title[1]?' "'+title[1]+'"':'')+')':str;}},
    {patterns:['b','strong'],replacement:function(str,attrs,innerHTML){return innerHTML?'**'+innerHTML+'**':'';}},
    {patterns:['i','em'],replacement:function(str,attrs,innerHTML){return innerHTML?'_'+innerHTML+'_':'';}},
    {patterns:'code',replacement:function(str,attrs,innerHTML){return innerHTML?'`'+innerHTML.replace(/<.*?>/ig,'')+'`':'';}},
    {patterns:'table',replacement:function(str,attrs,innerHTML){
      innerHTML=innerHTML.replace(/\r?\n/g,'').replace(/<\/tr>/ig,'\n').replace(/<tr(\s[^>]+)?>/ig,'|').replace(/<\/t[hd]>/ig,'|').replace(/<t[hd](\s[^>]+)?>/ig,'').replace(/<\/?tbody[^>]*?>/ig,'').replace(/<\/?thead[^>]*?>/ig,'').replace(/^(.*?)\n/,function(all,b){
        return b+'\n'+b.replace(/[^|]+/g,'--')+'\n';
      });
      return '\n'+innerHTML+'\n';
    }},
    //{patterns:['font','span','div','section','article','aside','div','div','div','span'],replacement:function(str,attrs,innerHTML){return innerHTML;}},
    {patterns:'pre',replacement:function(str,attrs,innerHTML){return innerHTML?'```\n'+innerHTML+'\n```\n':''}},
    {patterns:'img',isvoid:true,replacement:function(str,attrs,innerHTML){
      var src=attrs.match(attrRegExp('src')),alt=attrs.match(attrRegExp('alt')),title=attrs.match(attrRegExp('title'));
      return'!['+(alt&&alt[1]?alt[1]:'')+']'+'('+src[1]+(title&&title[1]?' "'+title[1]+'"':'')+')';}
    }
  ];
  for(var i=0,len=ELEMENTS.length;i<len;i++){
    if(typeof ELEMENTS[i].patterns==='string'){
      string=replaceEls(string,{tag:ELEMENTS[i].patterns,replacement:ELEMENTS[i].replacement,type:ELEMENTS[i].type});
    }else{
      for(var j=0,pLen=ELEMENTS[i].patterns.length;j<pLen;j++){
        string=replaceEls(string,{tag:ELEMENTS[i].patterns[j],replacement:ELEMENTS[i].replacement,type:ELEMENTS[i].type});
      }
    }
  }
  string=string.replace(/<.*?>/ig,'');
  function replaceEls(html,elProperties){
    var pattern=elProperties.isvoid?'<'+elProperties.tag+'\\b([^>]*)\\/?>':'<'+elProperties.tag+'\\b([^>]*)>([\\s\\S]*?)<\\/'+elProperties.tag+'>',regex=new RegExp(pattern,'gi'),markdown='';
    if(typeof elProperties.replacement==='string'){
      markdown=html.replace(regex,elProperties.replacement);
    }else{
      markdown=html.replace(regex,function(str,p1,p2,p3){
        return elProperties.replacement.call(this,str,p1,p2,p3);
      });
    }
    return markdown;
  }
  function attrRegExp(attr){
    return new RegExp(attr+'\\s*=\\s*["\']?([^"\']*)["\']?','i');
    }
  string=string.replace(/<pre\b[^>]*>`([\s\S]*)`<\/pre>/gi,function(str,innerHTML){
    innerHTML=innerHTML.replace(/^\t+/g,'  ');
    innerHTML=innerHTML.replace(/\n/g,'\n  ');
    return'\n\n  '+innerHTML+'\n';
    });
  string=string.replace(/^(\s{0,3}\d+)\. /g,'$1\\. ');
  var noChildrenRegex=/<(ul|ol)\b[^>]*>(?:(?!<ul|<ol)[\s\S])*?<\/\1>/gi;
  while(string.match(noChildrenRegex)){
    string=string.replace(noChildrenRegex,function(str){return replaceLists(str);});
  }
  function replaceLists(html){
    html=html.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi,function(str,listType,innerHTML){
      var lis=innerHTML.split('</li>');
      lis.splice(lis.length-1,1);
      for(i=0,len=lis.length;i<len;i++){
        if(lis[i]){
          var prefix=(listType==='ol')?(i+1)+".  ":"*   ";
          lis[i]=lis[i].replace(/\s*<li[^>]*>([\s\S]*)/i,function(str,innerHTML){
            innerHTML=innerHTML.replace(/^\s+/,'');
            innerHTML=innerHTML.replace(/\n\n/g,'\n\n  ');
            innerHTML=innerHTML.replace(/\n([ ]*)+(\*|\d+\.) /g,'\n$1  $2 ');
            return prefix+innerHTML;
            });
          }
        }
      return lis.join('\n');
      });
    return'\n\n'+html.replace(/[ \t]+\n|\s+$/g,'');
  }
  var deepest=/<blockquote\b[^>]*>((?:(?!<blockquote)[\s\S])*?)<\/blockquote>/gi;
  while(string.match(deepest)){
    string=string.replace(deepest,function(str){return replaceBlockquotes(str);});
  }
  function replaceBlockquotes(html){
    html=html.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi,function(str,inner){
      inner=inner.replace(/^\s+|\s+$/g,'');
      inner=cleanUp(inner);
      inner=inner.replace(/^/gm,'> ');
      inner=inner.replace(/^(>([ \t]{2,}>)+)/gm,'> >');
      return inner;
      });
    return html;
    }
  function cleanUp(string){
    string=string.replace(/^[\t\r\n]+|[\t\r\n]+$/g,'');
    string=string.replace(/\n\s+\n/g,'\n\n');
    string=string.replace(/\n{3,}/g,'\n\n');
    return string;
  }
  return cleanUp(string);
};
if(typeof exports==='object'){exports.toMarkdown=toMarkdown;}