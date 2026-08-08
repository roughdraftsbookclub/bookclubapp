const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=[src.match(/const olCover = [^\n]*/)[0],
            src.match(/const amazonURL = [^\n]*/)[0],
            src.match(/const amazonSearch = [\s\S]*?;\r?\n/)[0],
            src.match(/async function lookupBook[\s\S]*?\r?\n\}(?=\r?\n)/)[0]].join('\n');
let SCENARIO='ok';
global.AbortController=class{constructor(){this.signal={}}abort(){}};
global.fetch=async()=>{
  if(SCENARIO==='down') throw new Error('network');
  if(SCENARIO==='500') return {ok:false,status:500,json:async()=>({})};
  if(SCENARIO==='apierror') return {ok:true,json:async()=>({error:{code:429}}),finally(f){f();return this}};
  if(SCENARIO==='empty') return {ok:true,json:async()=>({docs:[]}),finally(f){f();return this}};
  return {ok:true, finally(f){f();return this}, json:async()=>({docs:[
    {title:'Wager',author_name:['David Grann'],first_publish_year:2023,cover_i:13245246,
     number_of_pages_median:432,isbn:['9780593678251','0385534264','9780385534260']},
    {title:'Wager',author_name:['David Grann'],first_publish_year:2024,cover_i:99,isbn:['0385534264']}, // dup
    {title:'Summary of David Grann\'s the Wager',author_name:['Irb Media'],isbn:['9798350066036']},      // no cover
    {title:'No Isbn Book',author_name:['Someone'],cover_i:555,isbn:['9781234567897']},                   // 13 only
    {title:null,cover_i:1}
  ]})};
};
const fns=new Function(code+'\nreturn {lookupBook};')();
(async()=>{
  let pass=0,fail=0;const ck=(n,c,x='')=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n+(c?'':'  <- '+x));};
  let r=await fns.lookupBook('the wager','grann');
  r.forEach(h=>console.log('   ',h.title,'|',h.author,'|',h.year,'|',h.pages,'pp |',h.isbn||'(no isbn10)','|',h.buy.slice(0,46)));
  ck('returns results', r.length>0);
  ck('drops results with no jacket', !r.some(h=>/Summary of/.test(h.title)));
  ck('drops null titles', r.every(h=>h.title));
  ck('de-duplicates same title+author', r.filter(h=>h.title==='Wager').length===1);
  ck('picks the ISBN-10 for the Amazon link', r[0].isbn==='0385534264', r[0].isbn);
  ck('builds a /dp/ link from ISBN-10', r[0].buy==='https://www.amazon.com/dp/0385534264', r[0].buy);
  const noIsbn=r.find(h=>h.title==='No Isbn Book');
  ck('falls back to an Amazon search with no ISBN-10', noIsbn && noIsbn.buy.includes('/s?k='), noIsbn&&noIsbn.buy);
  ck('cover built from cover_i', r[0].cover.includes('/b/id/13245246'), r[0].cover);
  SCENARIO='empty'; r=await fns.lookupBook('zzzz','');
  ck('genuine no-match returns [] not null', Array.isArray(r)&&r.length===0);
  SCENARIO='apierror'; r=await fns.lookupBook('x','');
  ck('API error payload returns null, not a false "no match"', r===null);
  SCENARIO='500'; r=await fns.lookupBook('x','');
  ck('HTTP 500 returns null', r===null);
  SCENARIO='down'; r=await fns.lookupBook('x','');
  ck('offline returns null', r===null);
  console.log('\n'+pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
})();
