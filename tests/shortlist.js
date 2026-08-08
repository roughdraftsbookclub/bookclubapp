const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const grab=re=>{const m=src.match(re); if(!m) throw new Error('missing '+re); return m[0];};
const STORE={books:null,meeting:null};
const M=()=>STORE.meeting, book=id=>STORE.books.find(b=>b.id===id);
const A=new Function('STORE','M','book',[
  grab(/const CONFIG = \{[\s\S]*?\r?\n\};/),grab(/const SEED = \[[\s\S]*?\r?\n\];/),
  grab(/const CURRENT_BOOK = [^\r\n]*/),grab(/const PREVIOUSLY_READ = \[[\s\S]*?\r?\n\];/),
  grab(/const uid = [^\r\n]*/),grab(/const olCover = [^\r\n]*/),grab(/const amazonURL = [^\r\n]*/),
  grab(/const FALLBACK = \[[\s\S]*?\];/),grab(/function mkBook[\s\S]*?\r?\n\}/),
  grab(/function seedBooks\(\)\{[\s\S]*?\r?\n\}/),grab(/const CURRENT_ID = [^\r\n]*/),
  grab(/function approvalTally\(\)\{[\s\S]*?\r?\n\}/),grab(/function computeShortlist\(\)\{[\s\S]*?\r?\n\}/),
].join('\n')+'\nreturn {CONFIG,seedBooks,approvalTally,computeShortlist};')(STORE,M,book);
const C=A.CONFIG;
STORE.books=A.seedBooks();
const IDS=STORE.books.filter(b=>b.status==='active').map(b=>b.id);

let pass=0,fail=0;
const ck=(n,c,x='')=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n+(c?'':'   <- '+x));};

/** Force an exact vote distribution, then read back the shortlist. */
function withVotes(counts){
  STORE.meeting={candidateIds:IDS,approvalBallots:{}};
  counts.forEach((n,i)=>{ for(let v=0;v<n;v++){
    const k='v'+v; (STORE.meeting.approvalBallots[k] ||= []).push(IDS[i]); }});
  return A.computeShortlist();
}
const tallyOf=()=>A.approvalTally();

console.log('Shortlist policy — the organizer must never be asked to choose\n');

// 1. a clean gap in the window
let r=withVotes([8,7,6,5,4,3,1,1,0,0,0,0,0,0,0,0,0]);
ck('1 clean gap cuts normally', !r.tie && r.list.length>=C.shortlistMin && r.list.length<=C.shortlistMax,
   'len '+r.list.length);

// 2. no gap anywhere, but plenty above the pile -> cut short
r=withVotes([8,7,6,5,2,2,2,2,2,2,0,0,0,0,0,0,0]);
let t=tallyOf();
console.log('   scenario 2 -> shortlist of '+r.list.length+', dropped '+
            (r.cutShort?r.cutShort.dropped:0)+' tied on '+(r.cutShort?r.cutShort.droppedAt:'-'));
ck('2 never returns a tie for the organizer', !r.tie);
ck('2 cuts short rather than padding to target', r.list.length < C.shortlistTarget, 'len '+r.list.length);
ck('2 every survivor beat the tied count', r.list.every(id=>t[id]>r.cutShort.droppedAt));
ck('2 reports what was dropped', r.cutShort.dropped>0);

// 3. no gap and too few above -> fill deterministically, never ask
r=withVotes([6,6,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0]);
console.log('   scenario 3 -> shortlist of '+r.list.length+(r.cutShort&&r.cutShort.thin?' (thin, filled)':''));
ck('3 still never returns a tie', !r.tie);
ck('3 respects the floor', r.list.length>=C.shortlistFloor, 'len '+r.list.length);
ck('3 flags that it had to fill', !!(r.cutShort&&r.cutShort.thin));
const a=r.list.join(','), b=withVotes([6,6,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0]).list.join(',');
ck('3 fill is deterministic', a===b);

// 4. everyone tied at zero
r=withVotes(new Array(17).fill(0));
ck('4 nobody voted: no tie, no crash', !r.tie && r.list.length>=C.shortlistFloor, 'len '+r.list.length);

// 5. fuzz — the organizer must never see a tie, at any turnout
let ties=0,low=0,high=0,N=20000;
for(let i=0;i<N;i++){
  const voters=3+Math.floor(Math.random()*10);
  const ap={}; IDS.forEach(id=>ap[id]=Math.random());
  STORE.meeting={candidateIds:IDS,approvalBallots:{}};
  for(let v=0;v<voters;v++){
    const s=IDS.map(id=>[id,ap[id]*0.6+Math.random()*0.4]).sort((x,y)=>y[1]-x[1]);
    STORE.meeting.approvalBallots['v'+v]=s.slice(0,1+Math.floor(Math.random()*C.maxApprovals)).map(x=>x[0]);
  }
  const res=A.computeShortlist();
  if(res.tie) ties++;
  if(res.list.length<C.shortlistFloor) low++;
  if(res.list.length>C.shortlistMax) high++;
}
ck('5 fuzz '+N.toLocaleString()+' meetings, 3-12 voters: zero organizer decisions', ties===0, ties+' ties');
ck('5 never below the floor', low===0, low+' below');
ck('5 never above the max', high===0, high+' above');

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
