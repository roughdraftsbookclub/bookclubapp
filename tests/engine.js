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
  grab(/function parseAttendance\([\s\S]*?\r?\n\}/,'parseAttendance'),
].join('\n')+`
return {CONFIG,seedBooks,runIRV,approvalTally,computeShortlist,buildArchiveQueue,parseAttendance};`;
const A=new Function('STORE','M','book',code)(STORE,M,book);
const {CONFIG,seedBooks,runIRV,approvalTally,computeShortlist,buildArchiveQueue,parseAttendance}=A;
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

// ---- C. archiving: 0-1 votes cull same-night; the streak rules cover ----
// ---- books with modest-but-insufficient support instead -----------------
// Organizer decision, 2026-09-03: a single 0-1-vote night is now enough to
// archive a book (was: 4 consecutive zero-vote meetings). d0/d1 are the
// shortlist (1 vote each, from ballot x) — must never be queued even though
// they'd otherwise qualify. d2 gets 2 votes (ballots y+z) and a clean
// history, so it should survive on the old streak rules. d3 gets exactly 1
// vote and isn't shortlisted, so it should be queued immediately.
STORE.meeting=newMeeting();
M().approvalBallots={ x:[d[0],d[1]], y:[d[2],d[3]], z:[d[2]] };
M().shortlistIds=[d[0],d[1]];
const q=buildArchiveQueue();
console.log('\nC. Archive queue: '+q.length+' of '+M().candidateIds.length+' books');
check('C1 every entry cites a threshold actually reached',
  q.every(a=>/no votes|only 1 vote/i.test(a.reason)
    ||a.zeros>=CONFIG.zeroVoteStreakToArchive||a.misses>=CONFIG.shortlistMissesToArchive));
check('C2 a book with 0 or 1 votes is archived on its very first bad night',
  q.some(a=>a.id===d[3]&&/only 1 vote/i.test(a.reason))
    && q.some(a=>approvalTally()[a.id]===0&&/no votes/i.test(a.reason)&&a.zeros===1));
check('C3 shortlisted books are never queued', q.every(a=>!M().shortlistIds.includes(a.id)));
check('C4 a book with 2+ votes and a clean history survives the night',
  !q.some(a=>a.id===d[2]));
console.log('   archived: '+q.length);
q.slice(0,3).forEach(a=>console.log('     '+book(a.id).title+' — '+a.reason));

// ---- C5. a deleted candidate must not take the meeting down -------------
// Caught live two days before a real meeting: candidate_ids still listed five
// books the organizer had since deleted, so book(id) was undefined. Both the
// approval grid and this function dereferenced it and threw, which blanks the
// ballot for every member and later blocks publishing.
STORE.meeting=newMeeting();
M().candidateIds=[...M().candidateIds,'bk-deleted-since'];
M().approvalBallots={ x:[d[0],d[1]] };
M().shortlistIds=[d[0],d[1]];
let threw=null, q2=[];
try { q2=buildArchiveQueue(); } catch(e){ threw=e; }
check('C5 buildArchiveQueue survives a candidate whose book was deleted',
  !threw, threw && threw.message);
check('C5b the deleted candidate is not queued for archiving',
  !q2.some(a=>a.id==='bk-deleted-since'));

// ---- E. typed attendance ------------------------------------------------
// The organizer types the headcount before the vote; it drives every
// "x of y voted" counter on every phone, so a bad parse is visible all night.
// null means "don't write anything, put the old number back".
console.log('');
check('E1 a typed number is accepted', parseAttendance('12', 11) === 12);
check('E2 whitespace is tolerated', parseAttendance('  9 ', 11) === 9);
check('E3 above the range clamps to 30', parseAttendance('99', 11) === 30);
check('E4 below the range clamps to 1', parseAttendance('0', 11) === 1);
check('E5 negatives clamp rather than invert', parseAttendance('-4', 11) === 1);
check('E6 blank is a no-op, not a zero', parseAttendance('', 11) === null);
check('E7 letters are a no-op, not NaN', parseAttendance('abc', 11) === null);
check('E8 null draft is a no-op', parseAttendance(null, 11) === null);
check('E9 re-entering the same number writes nothing', parseAttendance('11', 11) === null);
check('E10 a clamped value equal to current still writes nothing',
  parseAttendance('50', 30) === null);

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
