const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const grab=re=>{const m=src.match(re); if(!m) throw new Error('missing '+re); return m[0];};
const code=[
  grab(/const CLUB_TIMEZONE = [^\r\n]*/),
  grab(/function zonedDate\([\s\S]*?\r?\n\}/),
  grab(/function sundayBefore\([\s\S]*?\r?\n\}/),
  grab(/function suggestionWindowState\([\s\S]*?\r?\n\}/),
].join('\n')+'\nreturn {zonedDate,sundayBefore,suggestionWindowState,CLUB_TIMEZONE};';
const {suggestionWindowState}=new Function(code)();

let pass=0,fail=0;
const ck=(n,c,x='')=>{c?pass++:fail++;console.log((c?'  ok  ':'FAIL  ')+n+(c?'':'   <- '+x));};

// The real seeded rows (supabase/seed_schedule.sql), sortIndex + meetingDate only.
const rows=[
  {sortIndex:1,  meetingDate:'2026-07-09'},
  {sortIndex:2,  meetingDate:'2026-08-13'},
  {sortIndex:3,  meetingDate:'2026-09-10'},
  {sortIndex:4,  meetingDate:'2026-10-08'},
  {sortIndex:5,  meetingDate:'2026-11-12'},
  {sortIndex:6,  meetingDate:null},               // December — off
  {sortIndex:7,  meetingDate:'2027-01-14'},
  {sortIndex:8,  meetingDate:'2027-02-11'},
  {sortIndex:9,  meetingDate:'2027-03-11'},
  {sortIndex:10, meetingDate:'2027-04-08'},
  {sortIndex:11, meetingDate:'2027-05-13'},
  {sortIndex:12, meetingDate:'2027-06-10'},
  {sortIndex:13, meetingDate:'2027-07-08'},
];

// Eastern-time instant helper for the test itself — separate from the code
// under test, so a bug in zonedDate can't hide itself.
const eastern = (y,m,d,hh,mm) => {
  const guess=Date.UTC(y,m,d,hh,mm);
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})
    .formatToParts(new Date(guess)).reduce((o,p)=>(p.type!=='literal'&&(o[p.type]=+p.value),o),{});
  const readAsUTC=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second||0);
  return new Date(guess-(readAsUTC-guess));
};

// From the brief's own table: each "next meeting" and its confirmed close date.
const table=[
  ['2026-09-10', '2026-09-06'],
  ['2026-10-08', '2026-10-04'],
  ['2026-11-12', '2026-11-08'],
  ['2027-01-14', '2027-01-10'],
  ['2027-02-11', '2027-02-07'],
  ['2027-03-11', '2027-03-07'],
  ['2027-04-08', '2027-04-04'],
  ['2027-05-13', '2027-05-09'],
  ['2027-06-10', '2027-06-06'],
  ['2027-07-08', '2027-07-04'],
];

table.forEach(([, closeDateStr]) => {
  const [y,m,d]=closeDateStr.split('-').map(Number);
  const justBefore=eastern(y,m-1,d,23,58);
  const justAfter =eastern(y,m-1,d+1,0,1);
  ck(closeDateStr+' still open at 11:58pm', suggestionWindowState(rows,justBefore).open, closeDateStr);
  ck(closeDateStr+' closed at 12:01am the next day', !suggestionWindowState(rows,justAfter).open, closeDateStr);
});

// December: opens after Nov 12, stays open the whole holiday stretch, closes
// ahead of Jan 14 exactly per the table above (already checked: 2027-01-10).
ck('open on Christmas Day', suggestionWindowState(rows, eastern(2026,11,25,12,0)).open);
ck('open New Year\'s Eve',  suggestionWindowState(rows, eastern(2026,11,31,23,0)).open);

// Meeting-night reopen boundary
ck('closed at 8:59pm on Oct 8 (meeting night, before reopen)',
  !suggestionWindowState(rows, eastern(2026,9,8,20,59)).open);
ck('open at 9:00pm on Oct 8 (meeting night, reopened)',
  suggestionWindowState(rows, eastern(2026,9,8,21,0)).open);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
