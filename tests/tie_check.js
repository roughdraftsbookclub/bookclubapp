// One-off check (not part of the CI suite) for tonight's real numbers:
// 26 candidates, 11 voters. Measures how often runIRV hits a genuine
// dead-level winner tie (the UI currently does NOT surface this — see
// index.html's memberResults / adminMeeting results panel, which just
// reads result.irv.winner with no check of result.irv.tied), and how
// often round 1 specifically needs a countback tiebreak.
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const grab=re=>{const m=src.match(re); if(!m) throw new Error('missing '+re); return m[0];};
const STORE={books:null,meeting:null};
const M=()=>STORE.meeting, book=id=>STORE.books.find(b=>b.id===id);
const A=new Function('STORE','M','book',[
  grab(/const CONFIG = \{[\s\S]*?\r?\n\};/),
  grab(/function runIRV[\s\S]*?\r?\n\}(?=\r?\n)/),
  grab(/function approvalTally\(\)\{[\s\S]*?\r?\n\}/),
  grab(/function computeShortlist\(\)\{[\s\S]*?\r?\n\}/),
].join('\n')+'\nreturn {CONFIG,runIRV,approvalTally,computeShortlist};')(STORE,M,book);
const {CONFIG,runIRV,approvalTally,computeShortlist}=A;

const NUM_BOOKS=26, VOTERS=11, TRIALS=20000;
STORE.books=Array.from({length:NUM_BOOKS},(_,i)=>({id:'bk'+i,title:'bk'+i}));
const IDS=STORE.books.map(b=>b.id);

let winnerTies=0, anyTiebreak=0, round1Tiebreak=0, roundsHist={};
for(let i=0;i<TRIALS;i++){
  // Phase One: approval, same model as tests/shortlist.js's fuzz
  const ap={}; IDS.forEach(id=>ap[id]=Math.random());
  STORE.meeting={candidateIds:IDS,approvalBallots:{}};
  for(let v=0;v<VOTERS;v++){
    const s=IDS.map(id=>[id,ap[id]*0.6+Math.random()*0.4]).sort((x,y)=>y[1]-x[1]);
    STORE.meeting.approvalBallots['v'+v]=s.slice(0,1+Math.floor(Math.random()*CONFIG.maxApprovals)).map(x=>x[0]);
  }
  const sl=computeShortlist();
  const shortlist=sl.list;

  // Phase Two: rank top rankDepth of the shortlist, same affinity model
  const ballots=[];
  for(let v=0;v<VOTERS;v++){
    const s=shortlist.map(id=>[id,ap[id]*0.6+Math.random()*0.4]).sort((x,y)=>y[1]-x[1]);
    ballots.push(s.slice(0,CONFIG.rankDepth).map(x=>x[0]));
  }
  const irv=runIRV(ballots,shortlist);
  if(irv.tied.length>0) winnerTies++;
  if(irv.rounds.some(r=>r.tiebreak)) anyTiebreak++;
  if(irv.rounds[0] && irv.rounds[0].tiebreak) round1Tiebreak++;
  roundsHist[irv.rounds.length]=(roundsHist[irv.rounds.length]||0)+1;
}

console.log(`${TRIALS.toLocaleString()} simulated meetings — ${NUM_BOOKS} candidates, ${VOTERS} voters, maxApprovals=${CONFIG.maxApprovals}, rankDepth=${CONFIG.rankDepth}\n`);
console.log('genuine dead-level WINNER tie (irv.tied.length>0):', winnerTies, `(${(100*winnerTies/TRIALS).toFixed(2)}%)`);
console.log('any round needed a countback tiebreak:          ', anyTiebreak, `(${(100*anyTiebreak/TRIALS).toFixed(2)}%)`);
console.log('round 1 specifically needed a countback tiebreak:', round1Tiebreak, `(${(100*round1Tiebreak/TRIALS).toFixed(2)}%)`);
console.log('\nrounds-to-winner distribution:');
Object.keys(roundsHist).sort((a,b)=>a-b).forEach(n=>
  console.log(`  ${n} round${n>1?'s':' '}: ${roundsHist[n]} (${(100*roundsHist[n]/TRIALS).toFixed(1)}%)`));
