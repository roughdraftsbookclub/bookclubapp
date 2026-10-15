const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=[src.match(/const olCover = [^\n]*/)[0],
            src.match(/const amazonURL = [^\n]*/)[0],
            src.match(/const amazonSearch = [\s\S]*?;\r?\n/)[0],
            src.match(/function isbn13to10\([\s\S]*?\r?\n\}/)[0],
            src.match(/function isbn10to13\([\s\S]*?\r?\n\}/)[0],
            src.match(/function parseAmazonISBN\([\s\S]*?\r?\n\}/)[0],
            src.match(/function buildAmazonLink\([\s\S]*?\r?\n\}/)[0],
            src.match(/const OL_HEADERS = [^\n]*/)[0],
            src.match(/async function lookupBook[\s\S]*?\r?\n\}(?=\r?\n)/)[0],
            src.match(/async function fetchEditionCandidates\([\s\S]*?\r?\n\}(?=\r?\n)/)[0],
            src.match(/async function fetchWorkDescription\([\s\S]*?\r?\n\}(?=\r?\n)/)[0],
            src.match(/const normWords = [\s\S]*?;\r?\n/)[0],
            src.match(/const ACCOLADE = [\s\S]*?;\r?\n/)[0],
            src.match(/function editDistance\([\s\S]*?\r?\n\}/)[0],
            src.match(/function surnameMatches\([\s\S]*?\r?\n\}/)[0],
            src.match(/function googleVolumeMatches\([\s\S]*?\r?\n\}/)[0],
            src.match(/function cleanGoogleDescription\([\s\S]*?\r?\n\}/)[0]].join('\n');
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
const fns=new Function(code+'\nreturn {lookupBook,fetchEditionCandidates,fetchWorkDescription,isbn13to10,isbn10to13,parseAmazonISBN,buildAmazonLink,surnameMatches,googleVolumeMatches,cleanGoogleDescription};')();
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

  // ---- isbn10to13 -----------------------------------------------------------
  // Computed, never read from Open Library's edition record: OL lists
  // 9780345539786 against Red Rising's 034553980X and 9781451621174 against
  // Catch-22's 1451626657, neither of which is that book's real ISBN-13.
  console.log('\nisbn10to13');
  [['0141439513','9780141439518'],['0061120081','9780061120084'],['0142000671','9780142000670'],
   ['0141393394','9780141393391'],['0385007515','9780385007511'],['034553980X','9780345539809'],
   ['1451626657','9781451626650'],['0679720200','9780679720201']]
    .forEach(([i10,i13]) => ck(i10+' -> '+i13, fns.isbn10to13(i10)===i13, fns.isbn10to13(i10)));
  ck('round-trips back through isbn13to10',
    fns.isbn13to10(fns.isbn10to13('0385007515'))==='0385007515');
  ck('an X check digit is accepted', fns.isbn10to13('034553980X')==='9780345539809');
  ck('garbage returns null', fns.isbn10to13('nope')===null);
  ck('null returns null', fns.isbn10to13(null)===null);
  ck('a 13-digit input returns null', fns.isbn10to13('9780141393391')===null);

  // ---- parseAmazonISBN ------------------------------------------------------
  console.log('\nparseAmazonISBN');
  ck('plain /dp/ link',
    fns.parseAmazonISBN('https://www.amazon.com/dp/0141393394')==='0141393394');
  ck('the long form with title slug and tracking junk',
    fns.parseAmazonISBN('https://www.amazon.com/Frankenstein-Penguin-Clothbound-Classics-Shelley/dp/0141393394/ref=tmm_hrd_swatch_0?_encoding=UTF8&qid=1790817042&sr=1-3')==='0141393394');
  ck('/gp/product/ form',
    fns.parseAmazonISBN('https://www.amazon.com/gp/product/0385007515')==='0385007515');
  ck('an X check digit survives',
    fns.parseAmazonISBN('https://www.amazon.com/Red-Rising/dp/034553980X/ref=x')==='034553980X');
  ck('lowercase x is normalised',
    fns.parseAmazonISBN('https://www.amazon.com/dp/034553980x')==='034553980X');
  // A Kindle or non-book ASIN is B0-prefixed and fails the checksum — this is
  // the guard that stops a meaningless identifier reaching the book record.
  ck('a Kindle/non-book ASIN is rejected',
    fns.parseAmazonISBN('https://www.amazon.com/dp/B0CJKTNJLM')===null);
  ck('a 10-char string that fails the checksum is rejected',
    fns.parseAmazonISBN('https://www.amazon.com/dp/0141393395')===null);
  ck('a non-Amazon URL returns null',
    fns.parseAmazonISBN('https://openlibrary.org/isbn/0141393394')===null);
  ck('empty returns null', fns.parseAmazonISBN('')===null);
  ck('null returns null', fns.parseAmazonISBN(null)===null);

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

  // ---- Google Books: picking the right volume -------------------------------
  // Google's ISBN index returns nothing (measured 2026-10-14), so the only way
  // in is a title/author search — which makes this guard the ONLY thing
  // standing between a member and a description for somebody else's book.
  console.log('\nGoogle Books - volume matching');
  const gm = fns.googleVolumeMatches;
  ck('exact title and author match',
     gm({title:'The Deerslayer',authors:['James Fenimore Cooper']},'The Deerslayer','James Fenimore Cooper'));
  ck('right title, wrong author -> reject',
     !gm({title:'1929',authors:['Fred Nobody']},'1929','Andrew Ross Sorkin'));
  ck('different book by the same author -> reject',
     !gm({title:'Crime and Punishment',authors:['Fyodor Dostoevsky']},'The Brothers Karamazov','Fyodor Dostoevsky'));
  ck('significant word missing from title -> reject',
     !gm({title:'Pompeii',authors:['Robert Harris']},'Pompeii Revisited','Robert Harris'));
  ck('subtitle supplies the match',
     gm({title:'The Rush',subtitle:'California Gold',authors:['Nathaniel Philbrick']},'The Rush California','Nathaniel Philbrick'));
  ck('no author known -> title alone decides',
     gm({title:'Pompeii',authors:['Robert Harris']},'Pompeii',''));
  ck('volume with no authors at all -> reject',
     !gm({title:'Pompeii'},'Pompeii','Robert Harris'));

  // Transliteration: Google files this one under "Dostoyevsky". Before the
  // surname tolerance existed, the book's own description was rejected.
  const sm = fns.surnameMatches;
  ck('Dostoevsky matches Dostoyevsky', sm('dostoevsky','fyodor dostoyevsky'));
  ck('Tolstoy matches Tolstoi', sm('tolstoy','leo tolstoi'));
  ck('Harris does NOT match Harrison', !sm('harris','robert harrison'));
  ck('short surnames need an exact match', !sm('king','kong'));
  ck('unrelated surnames stay unrelated', !sm('steinbeck','fyodor dostoyevsky'));

  // ---- Google Books: cleaning the blurb -------------------------------------
  // Publishers lead with prize citations; on a phone that IS the blurb. The
  // rules are deliberately narrow, so the tests that matter most are the ones
  // asserting real prose comes back unchanged.
  console.log('\nGoogle Books - description cleaning');
  const cd = fns.cleanGoogleDescription;
  ck('strips HTML tags',
     cd('<p>A novel about <b>the</b> sea and the men who sailed it for years.</p>')
       === 'A novel about the sea and the men who sailed it for years.');
  ck('decodes entities',
     cd('Tom &amp; Huck light out for the territory, and that is the whole of it.')
       === 'Tom & Huck light out for the territory, and that is the whole of it.');
  ck('drops a separator-delimited citation',
     cd('A New York Times Most Anticipated Book of 2026 \u00b7 In January 1848 a carpenter spotted gold in a stream.')
       === 'In January 1848 a carpenter spotted gold in a stream.');
  ck('drops a markdown-bolded prize line',
     cd('**Winner of the 2016 Pulitzer Prize** Surfing only looks like a sport, and that is the point of it.')
       === 'Surfing only looks like a sport, and that is the point of it.');
  ck('cuts to the title when a pull-quote runs into the text',
     cd('\u201cThe finest surf book ever written.\u201d \u2014The New York Times Barbarian Days is a memoir of an obsession.','Barbarian Days')
       === 'Barbarian Days is a memoir of an obsession.');
  ck('run-on citation stops at the capital, not mid-clause',
     cd('A Los Angeles Times Best Book of the Fall National Book Award winner Nathaniel Philbrick reveals the Gold Rush.')
       .startsWith('National Book Award winner'),
     'a case-folded lookahead would eat "National Book Award winner" too');
  ck('"finalist" is not the end-token "list"',
     !cd('A Los Angeles Times Best Book of the Fall National Book Award winner and Pulitzer Prize finalist Nathaniel Philbrick reveals the Gold Rush.')
       .startsWith('finalist'));
  ck('nothing but a citation -> null', cd('#1 NEW YORK TIMES BESTSELLER') === null);
  ck('too short to be a description -> null', cd('A novel.') === null);
  ck('null in -> null out', cd(null) === null);

  // Real prose must survive untouched. A cleaner that eats the opening
  // sentence is worse than one that leaves the puffery in place.
  [ 'In January 1848, a carpenter spotted flecks of gold in a shallow stream near the mill.',
    'WINSTON SMITH thought of the telescreen and the long corridors he walked each morning.',
    'Best friends since childhood, the two women drift apart across four decades in Naples.',
    'The Deerslayer, or The First Warpath (1841) was the last of the Leatherstocking tales written.',
    '\u201cCall me Ishmael.\u201d So begins the greatest of American novels, and the voyage of the Pequod.'
  ].forEach(function(prose,i){ ck('real prose '+(i+1)+' passes through unchanged', cd(prose) === prose); });

  console.log('\n'+pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
})();
