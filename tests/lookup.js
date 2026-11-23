const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const code=[src.match(/const olCover = [^\n]*/)[0],
            src.match(/const amazonURL = [^\n]*/)[0],
            src.match(/const amazonSearch = [\s\S]*?;\r?\n/)[0],
            src.match(/function isbn13to10\([\s\S]*?\r?\n\}/)[0],
            src.match(/function isbn10to13\([\s\S]*?\r?\n\}/)[0],
            src.match(/function parseAmazonISBN\([\s\S]*?\r?\n\}/)[0],
            src.match(/function classifyAmazonLink\([\s\S]*?\r?\n\}/)[0],
            src.match(/const amazonCover = [\s\S]*?;\r?\n/)[0],
            src.match(/const SLUG_NOISE = [\s\S]*?;\r?\n/)[0],
            src.match(/function amazonTitleSlug\([\s\S]*?\r?\n\}/)[0],
            src.match(/const TITLE_STOPWORDS = [^\n]*/)[0],
            src.match(/function slugVolumeMatches\([\s\S]*?\r?\n\}/)[0],
            src.match(/function preferredTitle\([\s\S]*?\r?\n\}/)[0],
            src.match(/function googleImageURL\([\s\S]*?\r?\n\}/)[0],
            src.match(/const GOOGLE_PLACEHOLDER_DIMS = [^\n]*/)[0],
            src.match(/function coverLooksReal\([\s\S]*?\r?\n\}/)[0],
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
const fns=new Function(code+'\nreturn {lookupBook,fetchEditionCandidates,fetchWorkDescription,isbn13to10,isbn10to13,parseAmazonISBN,classifyAmazonLink,amazonCover,amazonTitleSlug,slugVolumeMatches,preferredTitle,googleImageURL,coverLooksReal,buildAmazonLink,normWords,surnameMatches,googleVolumeMatches,cleanGoogleDescription};')();
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

  // ---- classifyAmazonLink ---------------------------------------------------
  // Decides WHICH explanation a member sees when a pasted link yields no book.
  // Reported live: Submit stayed greyed out for a.co and Kindle links and the
  // member got no reason at all, because the branch that explained it could
  // not be reached. Sending someone to the wrong remedy is the failure mode
  // these cover.
  console.log('\nclassifyAmazonLink');
  const cl = fns.classifyAmazonLink;
  ck('a real print /dp/ link is ok',        cl('https://www.amazon.com/dp/0141393394')==='ok');
  ck('/gp/product/ is ok',                  cl('https://www.amazon.com/gp/product/0385007515')==='ok');
  ck('empty is empty',                      cl('')==='empty');
  ck('whitespace only is empty',            cl('   ')==='empty');
  ck('null is empty',                       cl(null)==='empty');
  // The two shapes that actually caused the bug report.
  ck('a.co share link -> shortened',        cl('https://a.co/d/9XpZ8qT')==='shortened');
  ck('a.co without protocol -> shortened',  cl('a.co/d/9XpZ8qT')==='shortened');
  ck('amzn.to -> shortened',                cl('https://amzn.to/3xYzAbc')==='shortened');
  ck('amzn.eu -> shortened',                cl('https://amzn.eu/d/abc1234')==='shortened');
  ck('Kindle B0 ASIN -> kindle',            cl('https://www.amazon.com/dp/B0CJKTNJLM')==='kindle');
  ck('Kindle via /gp/product -> kindle',    cl('https://www.amazon.com/gp/product/B0CJKTNJLM')==='kindle');
  ck('Kindle with slug and junk -> kindle',
    cl('https://www.amazon.com/Shogun-Novel-James-Clavell/dp/B0CJKTNJLM/ref=sr_1_1?crid=X')==='kindle');
  // Amazon, but not one book's page.
  ck('amazon search page -> amazonother',   cl('https://www.amazon.com/s?k=shogun')==='amazonother');
  ck('amazon home -> amazonother',          cl('https://www.amazon.com/')==='amazonother');
  ck('amazon.co.uk book-ish -> amazonother',cl('https://www.amazon.co.uk/gp/bestsellers/books')==='amazonother');
  ck('smile subdomain still amazon',        cl('https://smile.amazon.com/s?k=dune')==='amazonother');
  // Not Amazon at all.
  ck('goodreads -> notamazon',              cl('https://www.goodreads.com/book/show/4099.The_Godfather')==='notamazon');
  ck('bare words -> notamazon',             cl('lonesome dove')==='notamazon');
  // The trap: a lookalike host must not be read as Amazon.
  ck('notamazon.com is NOT amazon',         cl('https://notamazon.com/dp/B0CJKTNJLM')==='notamazon');
  ck('www.notamazon.com is NOT amazon',     cl('https://www.notamazon.com/x')==='notamazon');
  ck('amazon in a path is NOT amazon',      cl('https://evil.test/amazon.com/dp/B0CJKTNJLM')==='notamazon');
  // A 10-char ASIN that merely fails the checksum isn't Kindle — it's a
  // mistyped ISBN on a real book page, so it must not claim "that's Kindle".
  ck('bad-checksum ISBN is not called Kindle',
    cl('https://www.amazon.com/dp/0141393395')==='amazonother');
  // Ordering guard: a parseable ISBN wins even on a shortener host.
  ck('shortener carrying a real ISBN is ok',
    cl('https://amzn.to/dp/0141393394')==='ok');

  // ---- googleImageURL + coverLooksReal ------------------------------------
  // Google answers 200 with a placeholder jacket instead of 404ing, so a book
  // with no cover was showing a grey "no cover" graphic as if it were its own
  // artwork. Measured across all 43 shelf ISBNs on 2026-11-22: two distinct
  // placeholders (128x170 PNG, 128x184 JPEG), 36 real covers at 192-229 tall.
  console.log('\ngoogleImageURL');
  const gi = fns.googleImageURL;
  ck('null when there are no imageLinks', gi(undefined)===null && gi(null)===null && gi({})===null);
  ck('prefers thumbnail over smallThumbnail',
    gi({thumbnail:'https://x/t.jpg', smallThumbnail:'https://x/s.jpg'})==='https://x/t.jpg');
  ck('falls back to smallThumbnail',
    gi({smallThumbnail:'https://x/s.jpg'})==='https://x/s.jpg');
  // http:// would be blocked as mixed content on the https site — the jacket
  // would silently never appear.
  ck('upgrades http to https',
    gi({thumbnail:'http://books.google.com/books/content?id=A'})
      ==='https://books.google.com/books/content?id=A');
  ck('strips the fake page-curl edge',
    gi({thumbnail:'https://books.google.com/books/content?id=A&edge=curl&zoom=1'})
      ==='https://books.google.com/books/content?id=A&zoom=1');
  ck('upgrades and strips together',
    gi({thumbnail:'http://x/c?id=A&edge=curl'})==='https://x/c?id=A');
  ck('leaves an already-clean https URL alone',
    gi({thumbnail:'https://x/c?id=A&zoom=1'})==='https://x/c?id=A&zoom=1');
  // Raising the zoom for a bigger jacket is a trap: The Road gives a proper
  // 575x883 at zoom=3, but a Google-digitized scan like The Track of the Cat
  // gives a 575x92 sliver. zoom must survive untouched.
  ck('does NOT rewrite the zoom parameter',
    gi({thumbnail:'https://books.google.com/books/content?id=A&img=1&zoom=1&source=gbs_api'})
      ==='https://books.google.com/books/content?id=A&img=1&zoom=1&source=gbs_api');

  // ---- amazonTitleSlug ------------------------------------------------------
  // The only usable thing in a Kindle URL: the ASIN is Amazon-internal, the
  // slug carries the title and usually the author.
  console.log('\namazonTitleSlug');
  const slug = fns.amazonTitleSlug;
  ck('pulls the slug and drops "ebook"',
    slug('https://www.amazon.com/Hundred-Solitude-Gabriel-Garc%C3%ADa-M%C3%A1rquez-ebook/dp/B0BFK4THKQ/ref=sr_1_3')
      === 'Hundred Solitude Gabriel García Márquez');
  ck('percent-encoding is decoded',
    slug('https://www.amazon.com/Garc%C3%ADa-M%C3%A1rquez/dp/B0X1234567').includes('García'));
  ck('works on a print /dp/ too',
    slug('https://www.amazon.com/Sound-Fury-Corrected-Text/dp/0679732241/ref=tmm_pap_swatch_0')
      === 'Sound Fury Corrected Text');
  // The trap: with no slug segment the HOST must not be returned.
  ck('bare /dp/ has no slug',        slug('https://www.amazon.com/dp/B0BFK4THKQ') === '');
  ck('bare /dp/ no protocol',        slug('www.amazon.com/dp/B0BFK4THKQ') === '');
  ck('/gp/product/ has no slug',     slug('https://www.amazon.com/gp/product/0385007515') === '');
  ck('non-Amazon URL yields nothing useful',
    slug('https://example.com/dp/0141393394') === '' || !slug('https://example.com/dp/0141393394').includes('example'));
  ck('garbage is empty',             slug('not a url') === '');
  ck('empty/null are empty',         slug('') === '' && slug(null) === '');
  ck('kindle/paperback noise words dropped',
    slug('https://www.amazon.com/Dune-paperback-novel-Frank-Herbert-kindle/dp/B0X1234567')
      === 'Dune Frank Herbert');

  // ---- slugVolumeMatches ----------------------------------------------------
  // A study guide's TITLE repeats the book title AND the author, so title
  // overlap alone picks Gale. This guard is what keeps a companion volume's
  // ISBN from being shipped to the club as the book itself.
  console.log('\nslugVolumeMatches');
  const words = s => fns.normWords(s).split(' ').filter(Boolean);
  const solitude = words('Hundred Solitude Gabriel García Márquez');
  const svm = fns.slugVolumeMatches;
  ck('the real book matches on its author',
    svm({ title:'One Hundred Years of Solitude', authors:['Gabriel García Márquez'] }, solitude));
  ck('accent-folded author still matches',
    svm({ title:'One Hundred Years of Solitude', authors:['Gabriel Garcia Marquez'] }, solitude));
  ck('Gale study guide REJECTED',
    !svm({ title:"A Study Guide for Gabriel Garcia Marquez's One Hundred Years of Solitude",
           authors:['Gale, Cengage Learning'] }, solitude));
  ck('Bright Summaries REJECTED',
    !svm({ title:'One Hundred Years of Solitude by Gabriel García Márquez (Book Analysis)',
           authors:['Bright Summaries'] }, solitude));
  ck('Harold Bloom companion REJECTED',
    !svm({ title:'One Hundred Years of Solitude - Gabriel Garcia Marquez',
           authors:['Harold Bloom'] }, solitude));
  // Signal (b): a title-only slug, where there is no author to match on.
  const fury = words('Sound Fury Corrected Text');
  ck('title-only slug matches on title subset',
    svm({ title:'The Sound and the Fury', authors:['William Faulkner'] }, fury));
  ck('companion rejected against a title-only slug',
    !svm({ title:'A Study Guide for William Faulkner\'s The Sound and the Fury',
           authors:['Gale'] }, fury));
  ck('a different book entirely is rejected',
    !svm({ title:'Light in August', authors:['William Faulkner'] }, fury));
  ck('no title and no author is rejected', !svm({}, solitude));

  // ---- preferredTitle -------------------------------------------------------
  // OL's work record is catalogued in the original language, so a translated
  // novel's WORK title is foreign while the English EDITION title is the one
  // members recognise. Caught live: a correctly-resolved English edition of
  // Solitude offered "Cien años de soledad" to put on the shelf.
  console.log('\npreferredTitle');
  const pt = fns.preferredTitle;
  ck('Spanish work title loses to the English edition',
    pt('Cien años de soledad', 'One hundred years of solitude') === 'One hundred years of solitude');
  ck("Camus: L'étranger loses to The Stranger",
    pt("L'étranger", 'The Stranger') === 'The Stranger');
  ck('Michener: Bahía de Chesapeake loses to Chesapeake',
    pt('Bahía de Chesapeake', 'Chesapeake') === 'Chesapeake');
  // The case the work-title preference existed for in the first place.
  ck('work title kept over an edition subtitle',
    pt('Frankenstein', 'Frankenstein; or, The Modern Prometheus') === 'Frankenstein');
  ck('work title kept when titles agree',
    pt('The Road', 'The Road') === 'The Road');
  ck('stopword-only overlap is not a match',
    pt('The Hobbit', 'The Silmarillion') === 'The Silmarillion');
  ck('missing edition title falls back to work', pt('Dune', '') === 'Dune');
  ck('missing work title falls back to edition', pt('', 'Dune') === 'Dune');
  ck('both missing is empty', pt('', '') === '' && pt(null, null) === '');

  console.log('\namazonCover');
  // Amazon's ISBN-keyed image CDN. Measured 2026-11-23: 333x500 typical and
  // usable for 42 of 44 shelf ISBNs, against Google's 128x192 and 36 of 43.
  // When Amazon has no image it serves a 43-byte 1x1 GIF, which
  // coverLooksReal() rejects on size — no placeholder-shape matching needed.
  ck('builds the ISBN-keyed CDN path',
    fns.amazonCover('006112009X')
      === 'https://images-na.ssl-images-amazon.com/images/P/006112009X.01.LZZZZZZZ.jpg');
  ck('an X check digit is kept verbatim',
    fns.amazonCover('034553980X').includes('/P/034553980X.01.'));
  ck('always https', fns.amazonCover('0141393394').startsWith('https://'));
  ck('a 1x1 blank is not a real cover',
    !fns.coverLooksReal({ naturalWidth:1, naturalHeight:1 }));

  console.log('\ncoverLooksReal');
  const px = (w,h) => ({ naturalWidth:w, naturalHeight:h });
  ck('null/undefined is not real', !fns.coverLooksReal(null) && !fns.coverLooksReal(undefined));
  ck('128x170 PNG placeholder rejected',  !fns.coverLooksReal(px(128,170)));
  ck('128x184 JPEG placeholder rejected', !fns.coverLooksReal(px(128,184)));
  ck('128x192 real cover accepted',  fns.coverLooksReal(px(128,192)));
  ck('128x193 real cover accepted',  fns.coverLooksReal(px(128,193)));
  ck('128x196 real cover accepted',  fns.coverLooksReal(px(128,196)));
  ck('128x229 real cover accepted',  fns.coverLooksReal(px(128,229)));
  // The placeholder match must be exact, not a height band: a real jacket
  // one pixel either side of a placeholder shape is still a real jacket.
  ck('128x183 accepted (off by one)', fns.coverLooksReal(px(128,183)));
  ck('128x185 accepted (off by one)', fns.coverLooksReal(px(128,185)));
  ck('170 tall at another width accepted', fns.coverLooksReal(px(200,170)));
  ck('tiny images still rejected', !fns.coverLooksReal(px(1,1)) && !fns.coverLooksReal(px(60,99)));

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

  // Accents. This is a real bug that shipped: without a Unicode-decomposing
  // pass, [^a-z0-9] turns the macron in "Shōgun" into a SPACE, giving
  // "sh gun", which does not contain "shogun" — so every correctly-spelled
  // Google result was rejected and the four best descriptions discarded.
  // Both spellings below occur in Google's own data, precomposed and
  // decomposed, and both must normalise to the same word.
  ck('precomposed "Shōgun" normalises to shogun', fns.normWords('Shōgun') === 'shogun');
  ck('decomposed "Shōgun" normalises to shogun', fns.normWords('Shōgun') === 'shogun');
  ck("accented title normalises (L'étranger)", fns.normWords("L'étranger") === 'l etranger');
  ck('accents do not split a word into two',
     fns.normWords('Shōgun').split(' ').length === 1);
  ck('ASCII title still matches the accented volume',
     gm({title:'Shōgun',authors:['James Clavell']},'Shogun','James Clavell'),
     'the macron must not be treated as a word break');
  ck('accented author still matches',
     gm({title:'Cien anos',authors:['Gabriel García Márquez']},'Cien anos','Gabriel Garcia Marquez'));

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
