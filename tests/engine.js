const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const grab=(re,l)=>{const m=src.match(re); if(!m) throw new Error('missing '+l); return m[0];};

const STORE={books:null,currentBookId:null,meeting:null};
const M=()=>STORE.meeting;
const book=id=>STORE.books.find(b=>b.id===id);

// Load the page's pure engine into a real scope so its consts survive.
const code=[
  grab(/const CONFIG = \{[\s\S]*?\r?\n\};/,'CONFIG'),
  grab(/const SEED = \[[\s\S]*?\r?\n\];/,'SEED'),
  grab(/const CURRENT_BOOK = [^\r\n]*/,'CURRENT_BOOK'),
  grab(/const PREVIOUSLY_READ = \[[\s\S]*?\r?\n\];/,'PREVIOUSLY_READ'),
  grab(/const uid = [^\r\n]*/,'uid'),
  grab(/const olCover = [^\r\n]*/,'olCover'),
  grab(/const amazonURL = [^\r\n]*/,'amazonURL'),
  grab(/const FALLBACK = \[[\s\S]*?\];/,'FALLBACK'),
  grab(/function mkBook[\s\S]*?\r?\n\}/,'mkBook'),
  grab(/function seedBooks\(\)\{[\s\S]*?\r?\n\}/,'seedBooks'),
  grab(/function runIRV[\s\S]*?\r?\n\}(?=\r?\n)/,'runIRV'),
  grab(/function approvalTally\(\)\{[\s\S]*?\r?\n\}/,'approvalTally'),
  grab(/function computeShortlist\(\)\{[\s\S]*?\r?\n\}/,'computeShortlist'),
  grab(/function buildArchiveQueue\(\)\{[\s\S]*?\r?\n\}/,'buildArchiveQueue'),
].join('\n')+`
return {CONFIG,seedBooks,runIRV,approvalTally,computeShortlist,buildArchiveQueue};`;
const A=new Function('STORE','M','book',code)(STORE,M,book);
const {CONFIG,seedBooks,runIRV,approvalTally,computeShortlist,buildArchiveQueue}=A;
STORE.books=seedBooks();

const newMeeting=()=>({id:'mt1',date:'2026-08-08',isPractice:false,phase:'lobby',
  candidateIds:STORE.books.filter(b=>b.status==='active').map(b=>b.id),
  approvalBallots:{},rankBallots:{},shortlistIds:null,tie:null,
  result:null,archiveQueue:null,expectedVoters:9});

let pass=0,fail=0;
const check=(n,c,x='')=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n+(c?'':'   <-- '+x));};

// (shortlist-policy checks live in /tmp/shortlist.js)

// ---- B. clean cutoff, no tie ------------------------------------------
STORE.meeting=newMeeting();
const d=M().candidateIds;
Object.assign(M().approvalBallots,{
  a:[d[0],d[1],d[2],d[3]], b:[d[0],d[1],d[2],d[4]], c:[d[0],d[1],d[3],d[4]],
  e:[d[0],d[2],d[3],d[5]], f:[d[1],d[2],d[4],d[5]], h:[d[0],d[1],d[5],d[6]],
});
sl=computeShortlist();
check('B1 clean cutoff yields no tie', !sl.tie);
check('B2 shortlist lands inside the window',
  sl.list.length>=CONFIG.shortlistFloor&&sl.list.length<=CONFIG.shortlistMax, 'got '+sl.list.length);

// ---- C. archiving respects the 2-strike rule ---------------------------
STORE.meeting=newMeeting();
M().approvalBallots={ x:[d[0],d[1]] };          // every other book scores zero
M().shortlistIds=[d[0],d[1]];
const q=buildArchiveQueue();
console.log('\nC. Archive queue: '+q.length+' of '+M().candidateIds.length+' books');
check('C1 every entry cites a threshold actually reached',
  q.every(a=>a.zeros>=CONFIG.zeroVoteStreakToArchive||a.misses>=CONFIG.shortlistMissesToArchive));
check('C2 a book on its FIRST bad night is never archived for zero votes',
  q.filter(a=>/No interest/.test(a.reason)).every(a=>a.zeros>=2));
check('C3 shortlisted books are never queued', q.every(a=>!M().shortlistIds.includes(a.id)));
const spared=M().candidateIds.filter(id=>!q.some(a=>a.id===id)&&approvalTally()[id]===0);
check('C4 zero-vote books with a clean history survive the night', spared.length>0,
  'nothing spared — rule is too aggressive');
console.log('   archived: '+q.length+', spared despite zero votes: '+spared.length);
q.slice(0,3).forEach(a=>console.log('     '+book(a.id).title+' — '+a.reason));

// ---- D. end to end -----------------------------------------------------
STORE.meeting=newMeeting();
let seed=7; const rnd=()=>(seed=(seed*1103515245+12345)>>>0)/4294967296;
['t1','t2','t3','t4','t5','t6','t7','t8','t9'].forEach(n=>{
  const pool=[...M().candidateIds].sort(()=>rnd()-0.5);
  M().approvalBallots[n]=pool.slice(0,1+Math.floor(rnd()*CONFIG.maxApprovals));
});
sl=computeShortlist();
const shortlist=sl.list;
M().shortlistIds=shortlist;
const rb=['t1','t2','t3','t4','t5','t6','t7','t8','t9'].map(()=>[...shortlist].sort(()=>rnd()-0.5).slice(0,CONFIG.rankDepth));
const res=runIRV(rb,shortlist);
console.log('\nD. 9 approval ballots -> '+shortlist.length+'-book shortlist -> 9 rankings -> '+
  res.rounds.length+' rounds -> "'+book(res.winner).title+'"');
check('D1 shortlist is a sane size', shortlist.length>=CONFIG.shortlistFloor&&shortlist.length<=CONFIG.shortlistMax,'got '+shortlist.length);
check('D2 nobody ranks deeper than configured', rb.every(b=>b.length<=CONFIG.rankDepth));
check('D3 winner came from the shortlist', shortlist.includes(res.winner));
check('D4 ballots conserved in every round',
  res.rounds.every(r=>r.active+r.exhausted===rb.length));

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
