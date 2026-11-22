/* Rough Drafts — taste analysis.
 *
 *   node scripts/taste_analysis.js
 *
 * Reads the live Supabase project read-only with the same public anon key the
 * app ships, and reports what the club's four completed meetings say about
 * what the group actually picks. Writes nothing.
 *
 * The fiction/non-fiction and genre labels below are hand-assigned, not
 * derived from any field in the database — Open Library has no usable subject
 * data for half this shelf (see CLAUDE.md). They are the one subjective input
 * here; everything downstream is counted from real ballots. Edit the table if
 * you disagree with a call, and the whole report re-derives.
 *
 * Every rate is per OPPORTUNITY, never a raw count. A book that sat on four
 * ballots has four times the chance to collect approvals as one that sat on
 * one, and the shelf churns enough that raw totals mostly measure seniority.
 */
const URL  = 'https://xshhhizeotzfcgfioezq.supabase.co';
const KEY  = 'sb_publishable_-PCcYrW19CpQV9HBVrnctA_eCocpxtD';

// ---------------------------------------------------------------------------
// Hand-assigned classification. fic: true = fiction.
// ---------------------------------------------------------------------------
const CLASS = {
  bk2rsjr22: { fic: 1, genre: 'horror',     tags: [] },
  bkt4r9x2w: { fic: 0, genre: 'history',    tags: [] },
  bk10:      { fic: 1, genre: 'sff',        tags: ['dystopian'] },
  bkxmm3ah1: { fic: 1, genre: 'sff',        tags: [] },
  bk18:      { fic: 0, genre: 'memoir',     tags: ['adventure'] },
  bk99jbkpd: { fic: 0, genre: 'memoir',     tags: [] },
  bkbw12juh: { fic: 1, genre: 'war',        tags: ['satire'] },
  bk19:      { fic: 1, genre: 'historical', tags: ['war'] },
  bkr241ze7: { fic: 1, genre: 'litfic',     tags: [] },
  bkz8c4n6t: { fic: 1, genre: 'horror',     tags: ['classic'] },
  bk13:      { fic: 1, genre: 'sff',        tags: [] },
  bk8b2gq52: { fic: 1, genre: 'sff',        tags: [] },
  bk15:      { fic: 1, genre: 'litfic',     tags: [] },
  bkq7v3m2x: { fic: 1, genre: 'horror',     tags: ['classic'] },
  bkmnl9wq7: { fic: 1, genre: 'sff',        tags: [] },
  bk4:       { fic: 0, genre: 'adventure',  tags: ['history'] },
  bk12:      { fic: 1, genre: 'western',    tags: [] },
  bk17:      { fic: 0, genre: 'memoir',     tags: ['philosophy'] },
  bk7:       { fic: 1, genre: 'historical', tags: ['naval'] },
  bk16:      { fic: 0, genre: 'philosophy', tags: ['classic'] },
  bkqpuetqu: { fic: 1, genre: 'crime',      tags: ['western'] },
  bkhtszsb2: { fic: 1, genre: 'historical', tags: ['thriller'] },
  bk8u0zhia: { fic: 1, genre: 'sff',        tags: [] },
  bkv6m3p8k: { fic: 1, genre: 'historical', tags: [] },
  bkyo9soic: { fic: 1, genre: 'crime',      tags: ['spy'] },
  bk9:       { fic: 1, genre: 'litfic',     tags: ['fable'] },
  bkl0hve4j: { fic: 1, genre: 'litfic',     tags: ['classic'] },
  bkwgf3per: { fic: 1, genre: 'western',    tags: ['classic'] },
  bk5:       { fic: 0, genre: 'truecrime',  tags: [] },
  bk11:      { fic: 1, genre: 'crime',      tags: [] },
  bk3:       { fic: 1, genre: 'litfic',     tags: [] },
  bk6:       { fic: 1, genre: 'sff',        tags: ['satire'] },
  bkx5fsr2q: { fic: 1, genre: 'sff',        tags: [] },
  bk1:       { fic: 1, genre: 'sff',        tags: [] },
  bk2:       { fic: 1, genre: 'litfic',     tags: [] },
  bkm8rmcvh: { fic: 1, genre: 'litfic',     tags: ['dystopian'] },
  bk80ve2ia: { fic: 0, genre: 'history',    tags: [] },
  bkfld9dhf: { fic: 1, genre: 'crime',      tags: ['thriller'] },
  bkktactrr: { fic: 1, genre: 'historical', tags: ['myth'] },
  bkdaofwga: { fic: 1, genre: 'litfic',     tags: ['classic'] },
  bk8:       { fic: 0, genre: 'adventure',  tags: [] },
  bk0qvapxi: { fic: 1, genre: 'litfic',     tags: [] },
  bk14:      { fic: 0, genre: 'memoir',     tags: ['adventure'] },
};

const get = async t => {
  const r = await fetch(`${URL}/rest/v1/${t}?select=*`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${t}: HTTP ${r.status}`);
  return r.json();
};

const pct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : '  –';
const bar = (n, d, w = 24) => '#'.repeat(Math.round(w * (d ? n / d : 0)));
const rule = s => '\n' + s + '\n' + '='.repeat(s.length);

(async () => {
  const [books, meetings, ballots] = await Promise.all(
    ['books', 'meetings', 'ballots'].map(get));

  const B = Object.fromEntries(books.map(b => [b.id, b]));
  const unclassified = books.filter(b => !CLASS[b.id]);
  if (unclassified.length) {
    console.log('*** UNCLASSIFIED BOOKS — add them to CLASS and re-run:');
    unclassified.forEach(b => console.log('    ' + b.id + '  ' + b.title));
    console.log('    (they are excluded from every figure below)\n');
  }
  const cls = id => CLASS[id];
  const label = id => (B[id] ? B[id].title : id);

  // Completed meetings only: a result means the night actually finished.
  const done = meetings.filter(m => m.result && m.result.approval)
                       .sort((a, b) => a.date.localeCompare(b.date));

  const App = m => ballots.filter(b => b.meeting_id === m.id && b.phase === 'approval');
  const Rnk = m => ballots.filter(b => b.meeting_id === m.id && b.phase === 'ranked');

  /* ---- per-book accumulators -------------------------------------------
     cand   : times the book was on a ballot
     opp    : ballots it could have been approved on (candidate x voters)
     appr   : approvals received
     slOpp  : times it was a candidate (chance to make the shortlist)
     sl     : times it made the shortlist
     r1Opp  : ranked ballots it could have been anybody's #1 (shortlisted x rankers)
     r1     : times it was somebody's #1
     won    : times it won                                                */
  const S = {};
  const touch = id => (S[id] = S[id] ||
    { cand: 0, opp: 0, appr: 0, slOpp: 0, sl: 0, r1Opp: 0, r1: 0, won: 0 });

  for (const m of done) {
    const appBallots = App(m), rnkBallots = Rnk(m);
    const shortlist = m.shortlist_ids || [];
    for (const id of m.candidate_ids) {
      if (!B[id] || !cls(id)) continue;          // deleted book, or unlabelled
      const s = touch(id);
      s.cand++; s.slOpp++;
      s.opp += appBallots.length;
      s.appr += appBallots.filter(b => (b.book_ids || []).includes(id)).length;
      if (shortlist.includes(id)) {
        s.sl++;
        s.r1Opp += rnkBallots.length;
        s.r1 += rnkBallots.filter(b => (b.book_ids || [])[0] === id).length;
      }
    }
    const w = m.result.winnerId;
    if (w && B[w] && cls(w)) touch(w).won++;
  }

  const tracked = Object.keys(S);

  // ---- helper: roll a set of book ids into one summary row ---------------
  const roll = ids => ids.reduce((a, id) => {
    const s = S[id]; if (!s) return a;
    a.books++; a.cand += s.cand; a.opp += s.opp; a.appr += s.appr;
    a.slOpp += s.slOpp; a.sl += s.sl; a.r1Opp += s.r1Opp; a.r1 += s.r1;
    a.won += s.won; return a;
  }, { books: 0, cand: 0, opp: 0, appr: 0, slOpp: 0, sl: 0, r1Opp: 0, r1: 0, won: 0 });

  // =======================================================================
  console.log(rule('ROUGH DRAFTS — WHAT THE CLUB ACTUALLY PICKS'));
  console.log(`${done.length} completed meetings: ${done.map(m => m.date).join(', ')}`);
  console.log(`${books.length} books ever on the shelf; ${tracked.length} have reached at least one ballot.`);
  console.log(`${ballots.length} ballots cast in total.`);

  // ---- 1. the shelf ------------------------------------------------------
  console.log(rule('1. THE SHELF AS SUBMITTED'));
  const allF = books.filter(b => cls(b.id) && cls(b.id).fic).map(b => b.id);
  const allN = books.filter(b => cls(b.id) && !cls(b.id).fic).map(b => b.id);
  console.log(`  Fiction      ${String(allF.length).padStart(2)} of ${books.length}  ${pct(allF.length, books.length).padStart(4)}  ${bar(allF.length, books.length)}`);
  console.log(`  Non-fiction  ${String(allN.length).padStart(2)} of ${books.length}  ${pct(allN.length, books.length).padStart(4)}  ${bar(allN.length, books.length)}`);
  console.log('\n  Non-fiction titles:');
  allN.forEach(id => console.log(`    ${label(id)} — ${B[id].author}`));

  // seeded vs member-suggested
  const seeded = books.filter(b => !b.by_token), member = books.filter(b => b.by_token);
  const share = set => {
    const n = set.filter(b => cls(b.id) && !cls(b.id).fic).length;
    return `${n}/${set.length} non-fiction (${pct(n, set.length)})`;
  };
  console.log(`\n  Seeded at launch   : ${share(seeded)}`);
  console.log(`  Member-suggested   : ${share(member)}`);

  // ---- 2. the funnel ----------------------------------------------------
  console.log(rule('2. THE FUNNEL — FICTION vs NON-FICTION'));
  console.log('  Rates are per opportunity, so seniority on the shelf cannot flatter a book.\n');
  const F = roll(tracked.filter(id => cls(id).fic));
  const N = roll(tracked.filter(id => !cls(id).fic));
  const row = (name, r) => {
    console.log(`  ${name}`);
    console.log(`    books that reached a ballot      ${String(r.books).padStart(3)}`);
    console.log(`    approval rate                    ${pct(r.appr, r.opp).padStart(4)}   (${r.appr} approvals / ${r.opp} chances)`);
    console.log(`    reached round 2 (shortlisted)    ${pct(r.sl, r.slOpp).padStart(4)}   (${r.sl} of ${r.slOpp} appearances)`);
    console.log(`    was someone's #1 when ranked     ${pct(r.r1, r.r1Opp).padStart(4)}   (${r.r1} of ${r.r1Opp} ranked ballots)`);
    console.log(`    meetings won                     ${String(r.won).padStart(3)}`);
  };
  row('FICTION', F); console.log(); row('NON-FICTION', N);

  console.log('\n  Share of each stage held by non-fiction:');
  const stage = (nm, fv, nv) => console.log(`    ${nm.padEnd(26)} ${pct(nv, fv + nv).padStart(4)}  ${bar(nv, fv + nv)}`);
  stage('on the shelf', allF.length, allN.length);
  stage('ballot appearances', F.cand, N.cand);
  stage('approval votes', F.appr, N.appr);
  stage('round-2 slots', F.sl, N.sl);
  stage('first-choice ranks', F.r1, N.r1);
  stage('wins', F.won, N.won);

  // ---- 3. genre ---------------------------------------------------------
  console.log(rule('3. BY GENRE'));
  const genres = [...new Set(tracked.map(id => cls(id).genre))];
  const rows = genres.map(g => {
    const ids = tracked.filter(id => cls(id).genre === g);
    return { g, fic: cls(ids[0]).fic, n: ids.length, ...roll(ids) };
  }).sort((a, b) => (b.appr / b.opp || 0) - (a.appr / a.opp || 0));
  console.log('  genre         f/nf  books  approval   round 2   #1 picks   wins');
  console.log('  ------------  ----  -----  --------   -------   --------   ----');
  for (const r of rows)
    console.log(`  ${r.g.padEnd(12)}  ${r.fic ? 'fic ' : 'nonf'}  ${String(r.n).padStart(5)}  ${pct(r.appr, r.opp).padStart(8)}  ${pct(r.sl, r.slOpp).padStart(8)}  ${pct(r.r1, r.r1Opp).padStart(9)}  ${String(r.won).padStart(4)}`);

  // ---- 4. consensus vs champion -----------------------------------------
  console.log(rule('4. BROAD APPEAL vs PASSIONATE SUPPORT'));
  console.log('  Approval = "I would read this." A #1 rank = "this is the one I want."');
  console.log('  A book can be well-liked and nobody\'s favourite; that book never wins.\n');
  const sl = tracked.filter(id => S[id].sl > 0)
    .map(id => ({ id, a: S[id].appr / S[id].opp, r: S[id].r1 / S[id].r1Opp, s: S[id] }))
    .sort((a, b) => b.r - a.r);
  console.log('  book                                    f/nf  approval   #1 rate  won');
  console.log('  --------------------------------------  ----  --------   -------  ---');
  for (const x of sl)
    console.log(`  ${label(x.id).slice(0, 38).padEnd(38)}  ${cls(x.id).fic ? 'fic ' : 'nonf'}  ${pct(x.s.appr, x.s.opp).padStart(8)}  ${pct(x.s.r1, x.s.r1Opp).padStart(7)}  ${x.s.won ? ' *' : ''}`);

  // ---- 5. length and vintage -------------------------------------------
  console.log(rule('5. LENGTH AND VINTAGE'));
  const bucket = (name, test) => {
    const ids = tracked.filter(test);
    if (!ids.length) return;
    const r = roll(ids);
    console.log(`  ${name.padEnd(22)} ${String(r.books).padStart(2)} books   approval ${pct(r.appr, r.opp).padStart(4)}   round 2 ${pct(r.sl, r.slOpp).padStart(4)}   #1 ${pct(r.r1, r.r1Opp).padStart(4)}   wins ${r.won}`);
  };
  console.log('  By page count (as stored — the organizer corrected these by hand):');
  bucket('under 250pp', id => B[id].page_count && B[id].page_count < 250);
  bucket('250-449pp',   id => B[id].page_count >= 250 && B[id].page_count < 450);
  bucket('450-699pp',   id => B[id].page_count >= 450 && B[id].page_count < 700);
  bucket('700pp and up', id => B[id].page_count >= 700);
  console.log('\n  By first publication:');
  bucket('before 1950',  id => B[id].first_publish_year && B[id].first_publish_year < 1950);
  bucket('1950-1999',    id => B[id].first_publish_year >= 1950 && B[id].first_publish_year < 2000);
  bucket('2000-2014',    id => B[id].first_publish_year >= 2000 && B[id].first_publish_year < 2015);
  bucket('2015 or later', id => B[id].first_publish_year >= 2015);

  // ---- 6. anonymous ballot structure ------------------------------------
  console.log(rule('6. WHAT THE ANONYMOUS BALLOTS SHOW'));
  const tokensAll = new Set(ballots.map(b => b.token));
  console.log(`  ${tokensAll.size} distinct ballot tokens across ${done.length} meetings of ~11 voters.`);
  const seen = {};
  for (const m of done)
    for (const t of new Set(App(m).concat(Rnk(m)).map(b => b.token)))
      seen[t] = (seen[t] || 0) + 1;
  const hist = {};
  Object.values(seen).forEach(n => hist[n] = (hist[n] || 0) + 1);
  console.log('  tokens by number of meetings they appear in:');
  Object.keys(hist).sort().forEach(k =>
    console.log(`    ${k} meeting${k > 1 ? 's' : ''}: ${hist[k]} tokens`));
  console.log('  A token is a browser, not a person — clearing site data or switching');
  console.log('  phones mints a new one. Treat cross-meeting token identity as unreliable.');

  console.log('\n  Within each meeting, how much non-fiction each ballot approved:');
  for (const m of done) {
    const shares = App(m).map(b => {
      const ids = (b.book_ids || []).filter(i => cls(i));
      const nf = ids.filter(i => !cls(i).fic).length;
      return { n: ids.length, nf };
    }).filter(x => x.n);
    const allNone = shares.filter(x => x.nf === 0).length;
    const someNf  = shares.filter(x => x.nf > 0).length;
    const avail = m.candidate_ids.filter(i => cls(i) && !cls(i).fic).length;
    console.log(`    ${m.date}  ${avail} non-fiction of ${m.candidate_ids.length} on the ballot  |  ` +
      `${allNone} ballots picked none, ${someNf} picked at least one`);
  }

  console.log('\n  Repeat suggesters (by anonymous token, suggestions only):');
  const byTok = {};
  books.filter(b => b.by_token).forEach(b => (byTok[b.by_token] = byTok[b.by_token] || []).push(b.id));
  Object.entries(byTok).sort((a, b) => b[1].length - a[1].length).forEach(([t, ids]) => {
    const nf = ids.filter(i => cls(i) && !cls(i).fic).length;
    const r = roll(ids.filter(i => S[i]));
    console.log(`    ${t.slice(0, 10)}  ${String(ids.length).padStart(2)} book(s), ${nf} non-fiction` +
      (r.opp ? `, approval ${pct(r.appr, r.opp)}, ${r.sl} round-2 slot(s)` : ', never reached a ballot'));
  });

  // ---- 7. survival ------------------------------------------------------
  console.log(rule('7. WHAT GOT CULLED'))
  const arch = books.filter(b => b.status === 'archived' && cls(b.id));
  const af = arch.filter(b => cls(b.id).fic).length;
  console.log(`  ${arch.length} books archived: ${af} fiction, ${arch.length - af} non-fiction ` +
    `(${pct(arch.length - af, arch.length)} non-fiction).`);
  const liveIds = books.filter(b => ['active', 'current'].includes(b.status) && cls(b.id));
  const lf = liveIds.filter(b => cls(b.id).fic).length;
  console.log(`  ${liveIds.length} still live: ${lf} fiction, ${liveIds.length - lf} non-fiction ` +
    `(${pct(liveIds.length - lf, liveIds.length)} non-fiction).`);
  console.log('\n  Survival rate by genre (not archived, among books that reached a ballot):');
  for (const g of genres) {
    const ids = tracked.filter(id => cls(id).genre === g);
    const alive = ids.filter(id => B[id].status !== 'archived').length;
    console.log(`    ${g.padEnd(12)} ${String(alive).padStart(2)} of ${String(ids.length).padStart(2)} survive  ${pct(alive, ids.length).padStart(4)}  ${bar(alive, ids.length, 16)}`);
  }

  console.log('\n' + '-'.repeat(70));
  console.log('Sample size: 4 meetings, 44 approval ballots, 45 ranked ballots.');
  console.log('Differences of one or two votes are noise. Read the direction, not the decimal.');
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
