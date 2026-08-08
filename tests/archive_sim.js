/**
 * Scratch simulation (not part of the CI suite) to pick zeroVoteStreakToArchive
 * and shortlistMissesToArchive. Runs many independent "seasons" of consecutive
 * meetings against the real seed shelf and the real archive/shortlist code
 * extracted from index.html, with no new suggestions injected — the worst
 * case for shelf shrinkage — and reports how the 17-book shelf holds up.
 */
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const grab=re=>{const m=src.match(re); if(!m) throw new Error('missing '+re); return m[0];};

const code=[
  grab(/const SIM_TOKENS = \[[^\]]*\];/),
  grab(/const SEED = \[[\s\S]*?\r?\n\];/),
  grab(/const CURRENT_BOOK = [^\r\n]*/),
  grab(/const PREVIOUSLY_READ = \[[\s\S]*?\r?\n\];/),
  grab(/const uid = [^\r\n]*/),
  grab(/const olCover = [^\r\n]*/),
  grab(/const amazonURL = [^\r\n]*/),
  grab(/const FALLBACK = \[[\s\S]*?\];/),
  grab(/function mkBook[\s\S]*?\r?\n\}/),
  grab(/function seedBooks\(\)\{[\s\S]*?\r?\n\}/),
].join('\n');

function buildEngine(zeroVoteStreakToArchive, shortlistMissesToArchive){
  const CONFIG = JSON.parse(JSON.stringify(baseConfig));
  CONFIG.zeroVoteStreakToArchive = zeroVoteStreakToArchive;
  CONFIG.shortlistMissesToArchive = shortlistMissesToArchive;
  const STORE={books:null,meeting:null};
  const M=()=>STORE.meeting, book=id=>STORE.books.find(b=>b.id===id);
  const fn=new Function('STORE','M','book','CONFIG', code+`
    ${computeShortlistSrc}
    ${approvalTallySrc}
    ${buildArchiveQueueSrc}
    return {seedBooks, approvalTally, computeShortlist, buildArchiveQueue};
  `);
  const A=fn(STORE,M,book,CONFIG);
  STORE.books=A.seedBooks();
  return {STORE,M,book,A,CONFIG};
}

const baseConfig=(()=>{
  const txt=grab(/const CONFIG = \{[\s\S]*?\r?\n\};/);
  return new Function('return '+txt.replace(/^const CONFIG = /,''))();
})();
const computeShortlistSrc=grab(/function computeShortlist\(\)\{[\s\S]*?\r?\n\}/);
const approvalTallySrc=grab(/function approvalTally\(\)\{[\s\S]*?\r?\n\}/);
const buildArchiveQueueSrc=grab(/function buildArchiveQueue\(\)\{[\s\S]*?\r?\n\}/);

function runSeason(zeroVoteStreakToArchive, shortlistMissesToArchive, voters, meetings, trials){
  let totalArchivedByEnd=0, seasonsHitFloor=0, firstFloorMeetingSum=0, floorHits=0;
  const archivedAtMonth=new Array(meetings+1).fill(0);

  for(let t=0;t<trials;t++){
    const {STORE,M,A,CONFIG}=buildEngine(zeroVoteStreakToArchive, shortlistMissesToArchive);
    // persistent per-book popularity so some books are consistently skippable
    const affinity={}; STORE.books.forEach(b=>affinity[b.id]=Math.random());
    let hitFloor=false;

    for(let mo=1; mo<=meetings; mo++){
      const active=STORE.books.filter(b=>b.status==='active');
      if (active.length < 10 && !hitFloor){
        hitFloor=true; seasonsHitFloor++; firstFloorMeetingSum+=mo; floorHits++;
      }
      if (active.length < 10) break;   // app itself refuses to open voting below 10

      const ids=active.map(b=>b.id);
      STORE.meeting={candidateIds:ids, approvalBallots:{}};
      for(let v=0; v<voters; v++){
        const s=ids.map(id=>[id, affinity[id]*0.6+Math.random()*0.4]).sort((x,y)=>y[1]-x[1]);
        const n=1+Math.floor(Math.random()*CONFIG.maxApprovals);
        STORE.meeting.approvalBallots['v'+v]=s.slice(0,n).map(x=>x[0]);
      }
      const shortlist=A.computeShortlist();
      STORE.meeting.shortlistIds=shortlist.list;
      const queue=A.buildArchiveQueue();

      // apply publishResults' bookkeeping for the fields archiving depends on
      const t2=A.approvalTally();
      const made=new Set(shortlist.list);
      ids.forEach(id=>{
        const b=STORE.books.find(x=>x.id===id);
        b.zeroVoteStreak = (t2[id]===0) ? b.zeroVoteStreak+1 : 0;
        b.shortlistMisses = made.has(id) ? 0 : b.shortlistMisses+1;
      });
      queue.forEach(({id,reason})=>{
        const b=STORE.books.find(x=>x.id===id);
        b.status='archived'; b.archiveReason=reason;
      });
      archivedAtMonth[mo]+=queue.length;
    }
    totalArchivedByEnd += STORE.books.filter(b=>b.status==='archived').length;
  }

  return {
    avgArchivedByEnd: (totalArchivedByEnd/trials).toFixed(2),
    pctSeasonsHitFloor: (100*seasonsHitFloor/trials).toFixed(1),
    avgMonthToFloor: floorHits ? (firstFloorMeetingSum/floorHits).toFixed(1) : 'n/a',
  };
}

const meetings=12, trials=5000;
console.log(`${trials.toLocaleString()} seasons of ${meetings} meetings, 17-book shelf, no new suggestions injected (worst case)\n`);
console.log('voters | zeroStreak | misses | avg archived/season | % seasons hit <10-book floor | avg month hit floor');
// Current CONFIG values first, then neighbors — rerun with different pairs
// if the shelf size or CONFIG.maxApprovals ever changes materially.
for (const voters of [9]){
  for (const [z,m] of [[2,3],[4,8],[5,8],[5,10],[6,10],[6,12]]){
    const r=runSeason(z,m,voters,meetings,trials);
    console.log(`  ${voters}    |     ${z}      |   ${m}    |        ${r.avgArchivedByEnd}         |            ${r.pctSeasonsHitFloor}%             |     ${r.avgMonthToFloor}`);
  }
  console.log('');
}
