const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=[src.match(/const olCover = [^\n]*/)[0],
            src.match(/const amazonURL = [^\n]*/)[0],
            src.match(/const amazonSearch = [\s\S]*?;\r?\n/)[0],
            src.match(/function isbn13to10\([\s\S]*?\r?\n\}/)[0],
            src.match(/function buildAmazonLink\([\s\S]*?\r?\n\}/)[0],
            src.match(/const OL_HEADERS = [^\n]*/)[0],
            src.match(/async function lookupBook[\s\S]*?\r?\n\}(?=\r?\n)/)[0],
            src.match(/async function fetchEditionCandidates\([\s\S]*?\r?\n\}(?=\r?\n)/)[0],
            src.match(/async function fetchWorkDescription\([\s\S]*?\r?\n\}(?=\r?\n)/)[0]].join('\n');
global.AbortController=class{constructor(){this.signal={}}abort(){}};

let pass=0,fail=0;const ck=(n,c,x='')=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n+(c?'':'  <- '+x));};

// ---- lookupBook -----------------------------------------------------------
let SCENARIO='ok';
global.fetch=async()=>{
  if(SCENARIO==='down') throw new Error('network');
  if(SCENARIO==='500') return {ok:false,status:500,json:async()=>({})};
  if(SCENARIO==='apierror') return {ok:true,json:async()=>({error:{code:429}}),finally(f){f();return this}};
  if(SCENARIO==='empty') return {ok:true,json:async()=>({docs:[]}),finally(f){f();return this}};
  return {ok:true, finally(f){f();return this}, json:async()=>({docs:[
    {key:'/works/OL1234W',title:'Wager',author_name:['David Grann'],first_publish_year:2023,cover_i:13245246,
     number_of_pages_median:432,isbn:['9780593678251','0385534264','9780385534260']},
    {key:'/works/OL1234W',title:'Wager',author_name:['David Grann'],first_publish_year:2024,cover_i:99,isbn:['0385534264']}, // dup
    {title:'Summary of David Grann\'s the Wager',author_name:['Irb Media'],isbn:['9798350066036']},      // no cover
    {title:'No Isbn Book',author_name:['Someone'],cover_i:555,isbn:['9781234567897']},                   // 13 only
    {title:null,cover_i:1}
  ]})};
};
const fns=new Function(code+'\nreturn {lookupBook,fetchEditionCandidates,fetchWorkDescription,isbn13to10,buildAmazonLink};')();
(async()=>{
  let r=await fns.lookupBook('the wager','grann');
  r.forEach(h=>console.log('   ',h.title,'|',h.author,'|',h.year,'|',h.pages,'pp |',h.isbn||'(no isbn10)','|',h.buy.slice(0,46)));
  ck('returns results', r.length>0);
  ck('drops results with no jacket', !r.some(h=>/Summary of/.test(h.title)));
  ck('drops null titles', r.every(h=>h.title));
  ck('de-duplicates same title+author', r.filter(h=>h.title==='Wager').length===1);
  ck('picks the ISBN-10 for the Amazon link', r[0].isbn==='0385534264', r[0].isbn);
  ck('builds a /dp/ link from ISBN-10', r[0].buy==='https://www.amazon.com/dp/0385534264', r[0].buy);
  ck('carries the work key through', r[0].workKey==='/works/OL1234W', r[0].workKey);
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

  // ---- isbn13to10 -----------------------------------------------------------
  console.log('\nisbn13to10');
  const pairs=[['9780141439518','0141439513'],['9780061120084','0061120081'],['9780142000670','0142000671']];
  pairs.forEach(([i13,i10])=>ck(i13+' -> '+i10, fns.isbn13to10(i13)===i10, fns.isbn13to10(i13)));
  ck('979-prefixed (no ISBN-10 exists) returns null', fns.isbn13to10('9791234567896')===null);
  ck('garbage input returns null', fns.isbn13to10('not-an-isbn')===null);
  ck('null input returns null', fns.isbn13to10(null)===null);

  // ---- buildAmazonLink --------------------------------------------------
  console.log('\nbuildAmazonLink');
  ck('ISBN-10 present -> direct /dp/ link',
    fns.buildAmazonLink('0141439513', null, 'T', 'A')==='https://www.amazon.com/dp/0141439513');
  ck('no ISBN-10, convertible ISBN-13 -> converted /dp/ link',
    fns.buildAmazonLink(null, '9780141439518', 'T', 'A')==='https://www.amazon.com/dp/0141439513');
  ck('979-prefixed ISBN-13, no ISBN-10 -> falls back to search',
    fns.buildAmazonLink(null, '9791234567896', 'T', 'A').includes('/s?k='));
  ck('no ISBN at all -> falls back to search, never a bare title',
    fns.buildAmazonLink(null, null, 'T', 'A').startsWith('https://www.amazon.com/s?k='));

  // ---- fetchEditionCandidates ---------------------------------------------
  // Real shape observed live against East of Eden's editions.json: mixed
  // languages, missing covers/ISBNs, and a 1-page graded-reader "edition".
  console.log('\nfetchEditionCandidates');
  global.fetch=async()=>({ok:true, json:async()=>({entries:[
    {title:"La valle dell'Eden", publishers:['Bompiani'], publish_date:'2014', isbn_13:['9788845274060'], covers:[15125610], number_of_pages:784},
    {title:'伊甸之東', languages:[{key:'/languages/chi'}], publishers:['RMWX'], publish_date:'1986', number_of_pages:357},
    {title:'Level 6', languages:[{key:'/languages/eng'}], publishers:['Pearson'], publish_date:'2011', isbn_13:['9781408271155'], number_of_pages:1},
    {title:'East of Eden', languages:[{key:'/languages/eng'}], publishers:['Pan Books'], publish_date:'1963', number_of_pages:578}, // no isbn, no cover
    {title:'East of Eden', languages:[{key:'/languages/eng'}], publishers:['Longman'], publish_date:'2001', isbn_10:['058243470X'], isbn_13:['9780582434707'], covers:[1288662], number_of_pages:112},
    {title:'East of Eden', languages:[{key:'/languages/eng'}], publishers:['Viking'], publish_date:'1952', covers:[14950084], number_of_pages:602}, // no isbn
    {title:'East of Eden', languages:[{key:'/languages/eng'}], publishers:['Penguin'], publish_date:'1992', isbn_10:['0142004235'], isbn_13:['9780142004234'], covers:[9999], number_of_pages:602},
  ]})});
  const editions=await fns.fetchEditionCandidates('/works/OL23166W', 'East of Eden');
  editions.forEach(e=>console.log('   ',e.publisher,'|',e.year,'|',e.pages,'pp |',e.isbn10||e.isbn13||'(no isbn)'));
  ck('drops non-English editions', !editions.some(e=>e.publisher==='RMWX'));
  ck('drops a foreign edition with no languages tag at all, by title mismatch',
    !editions.some(e=>e.publisher==='Bompiani'));
  ck('drops editions with no cover', !editions.some(e=>e.publisher==='Pan Books'));
  ck('drops editions with no ISBN', !editions.some(e=>e.publisher==='Viking'));
  ck('drops the 1-page graded-reader artifact', !editions.some(e=>e.publisher==='Pearson'));
  ck('keeps genuinely plausible English editions', editions.some(e=>e.publisher==='Longman') && editions.some(e=>e.publisher==='Penguin'));
  ck('returns at most 4', editions.length<=4);
  ck('newest first', editions.length<2 || Number(editions[0].year)>=Number(editions[1].year));
  const noWorkKey=await fns.fetchEditionCandidates(null);
  ck('no work key -> empty, not an error', Array.isArray(noWorkKey)&&noWorkKey.length===0);
  global.fetch=async()=>{throw new Error('offline')};
  const offlineEditions=await fns.fetchEditionCandidates('/works/OL1W');
  ck('offline -> empty, never blocks the flow', Array.isArray(offlineEditions)&&offlineEditions.length===0);

  // ---- fetchWorkDescription -------------------------------------------------
  console.log('\nfetchWorkDescription');
  global.fetch=async()=>({ok:true, json:async()=>({description:{type:'/type/text',value:'A saga.'}})});
  ck('handles {type,value} shape', await fns.fetchWorkDescription('/works/OL1W')==='A saga.');
  global.fetch=async()=>({ok:true, json:async()=>({description:'A plain string.'})});
  ck('handles plain string shape', await fns.fetchWorkDescription('/works/OL1W')==='A plain string.');
  global.fetch=async()=>({ok:true, json:async()=>({})});
  ck('missing description -> null', await fns.fetchWorkDescription('/works/OL1W')===null);
  global.fetch=async()=>{throw new Error('offline')};
  ck('offline -> null, never blocks the flow', await fns.fetchWorkDescription('/works/OL1W')===null);
  ck('no work key -> null', await fns.fetchWorkDescription(null)===null);

  console.log('\n'+pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
})();
