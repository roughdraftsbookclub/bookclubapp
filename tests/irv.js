const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const fn=src.match(/function runIRV[\s\S]*?\r?\n\}/)[0];
eval(fn);

let pass=0, fail=0;
const check=(name,cond,extra='')=>{ cond?pass++:fail++;
  console.log((cond?'  ok  ':'FAIL  ')+name+(cond?'':'   <-- '+extra)); };

// ---- T1: the 9-ballot case I hand-traced -------------------------------
const B=['A','B','C','D','E','F'];
const t1=[['A','B','C'],['A','C','B'],['B','A','D'],['B','D','A'],['C','E','F'],
          ['D','E','F'],['E','F','D'],['F','E','D'],['A','D','B']];
let r=runIRV(t1,B);
console.log('\nT1 nine ballots, rank-3-of-6');
r.rounds.forEach((rd,i)=>console.log('  R'+(i+1),JSON.stringify(rd.tally),
  'active='+rd.active,'thr='+rd.threshold,'exh='+rd.exhausted,
  'out=['+rd.eliminated+']'+(rd.tiebreak?' TIEBREAK':'')));
console.log('  winner:',r.winner);
check('T1 terminates with a winner', !!r.winner);
check('T1 never eliminates >1 unless provably safe',
  r.rounds.every(rd=>{
    if(rd.eliminated.length<2) return true;
    const vals=Object.entries(rd.tally);
    const min=Math.min(...vals.map(v=>v[1]));
    const above=vals.filter(([,v])=>v>min).map(([,v])=>v).sort((a,b)=>a-b)[0];
    return above===undefined || min*rd.eliminated.length<above;
  }),'unsafe batch elimination');
check('T1 winner has majority of active ballots in final round',
  (()=>{const f=r.rounds[r.rounds.length-1];return f.tally[r.winner]>=f.threshold||Object.keys(f.tally).length<=1;})());

// ---- T2: exhausted ballots must leave the denominator -------------------
const t2=[['A'],['A'],['B'],['B'],['C'],['C'],['D','A'],['D','A'],['D','A']];
r=runIRV(t2,['A','B','C','D']);
console.log('\nT2 truncated/exhausting ballots');
r.rounds.forEach((rd,i)=>console.log('  R'+(i+1),JSON.stringify(rd.tally),
  'active='+rd.active,'thr='+rd.threshold,'exh='+rd.exhausted,'out=['+rd.eliminated+']'));
console.log('  winner:',r.winner);
check('T2 active+exhausted == total ballots every round',
  r.rounds.every(rd=>rd.active+rd.exhausted===9));
check('T2 threshold shrinks as ballots exhaust',
  r.rounds[r.rounds.length-1].threshold<=r.rounds[0].threshold);

// ---- T3: outright first-round majority ---------------------------------
r=runIRV([['A','B'],['A','B'],['A','C'],['B','A'],['C','A']],['A','B','C']);
check('T3 first-round majority ends in one round', r.rounds.length===1&&r.winner==='A',
  'rounds='+r.rounds.length+' winner='+r.winner);

// ---- T4: total tie must not hang or crash ------------------------------
r=runIRV([['A'],['B'],['C']],['A','B','C']);
check('T4 dead-level field returns without hanging', r.rounds.length<40&&!!r.winner);
check('T4 reports the tie', r.tied.length===3, 'tied='+JSON.stringify(r.tied));
check('T4 winner is one of the tied candidates, not an arbitrary pick outside it',
  r.tied.includes(r.winner), 'winner='+r.winner+' tied='+JSON.stringify(r.tied));

// ---- T4b: a genuine tie for the win, not just a dead-level field --------
// Two candidates end up level with a majority-equivalent outcome (both
// eliminated everyone else); the winner must still be picked deterministically
// (countback) rather than an implementation-detail-dependent arbitrary one,
// and it must be reported as tied so the results screen can say so.
const t4b=[['A','B'],['B','A'],['C','A'],['C','B']];
let winners4b=new Set(), tiedFlag=true;
for(let i=0;i<300;i++){
  const rb=runIRV(t4b.map(b=>[...b]),['A','B','C']);
  winners4b.add(rb.winner);
  if(!(rb.tied&&rb.tied.length>1)) tiedFlag=false;
}
check('T4b winner-tie deterministic across 300 runs', winners4b.size===1, 'got '+[...winners4b]);
check('T4b winner-tie reported as tied', tiedFlag);

// ---- T5: determinism -- same ballots, same winner ----------------------
const shuf=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]);
const winners=new Set();
for(let i=0;i<300;i++) winners.add(runIRV(shuf(t1.map(b=>[...b])),shuf([...B])).winner);
check('T5 deterministic across 300 shuffles', winners.size===1, 'got '+[...winners]);

// ---- T6: no ballots at all ---------------------------------------------
r=runIRV([],['A','B']);
check('T6 empty election does not throw', r.rounds.length>=1);

// ---- T7: fuzz -- never hangs, never returns a non-candidate ------------
let bad=0;
for(let i=0;i<4000;i++){
  const c=['A','B','C','D','E','F'].slice(0,2+Math.floor(Math.random()*5));
  const bs=Array.from({length:1+Math.floor(Math.random()*12)},()=>
    shuf([...c]).slice(0,1+Math.floor(Math.random()*3)));
  const out=runIRV(bs,c);
  if(out.rounds.length>=40) bad++;
  if(out.winner&&!c.includes(out.winner)) bad++;
  if(out.rounds.some(rd=>rd.active+rd.exhausted!==bs.length)) bad++;
}
check('T7 fuzz 4000 elections: no hangs, valid winners, ballots conserved', bad===0, bad+' bad');

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
