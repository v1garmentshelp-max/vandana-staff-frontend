// ── Date ──────────────────────────────────────────────────────────────────────
export const todayStr  = () => new Date().toISOString().slice(0,10);
export const monthKey  = (d=todayStr()) => d.slice(0,7);
export const daysInMonth = ym => { const [y,m]=ym.split('-').map(Number); return new Date(y,m,0).getDate(); };
export const dateRange = ym => Array.from({length:daysInMonth(ym)},(_,i)=>`${ym}-${String(i+1).padStart(2,'0')}`);
export const getDOW    = d  => new Date(d+'T00:00:00').getDay();
export const isWeeklyOff = (d,wkOff) => getDOW(d)===wkOff;
export const isHoliday   = (d,hols)  => hols.includes(d);
export const getFirstDOW = ym => new Date(ym+'-01T00:00:00').getDay();

export function formatMonth(ym) {
  const [y,m]=ym.split('-').map(Number);
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m-1]+' '+y;
}
export function formatDate(d) {
  return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
export const DAY_ABBR = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── Salary ────────────────────────────────────────────────────────────────────
export function calcSalary(emp, sAtt={}, ym, weeklyOff, holidays, upTo=todayStr()) {
  const range       = dateRange(ym);
  const N           = range.length; // Number of days in the month (e.g. 30, 31, 28, 29)
  
  // Determine standard weekoffs and workdays
  const stdWeekoffs = N === 28 ? 4 : 5;
  const stdWorkdays = N - stdWeekoffs;
  
  let daysPresent=0, daysPL=0, daysUL=0, daysAbsent=0, daysHoliday=0;

  const hasImportedDays = (emp.daysPresent !== undefined && emp.daysPresent !== null && emp.daysPresent !== '') ||
                          (emp.daysAbsent !== undefined && emp.daysAbsent !== null && emp.daysAbsent !== '');

  if (hasImportedDays) {
    daysPresent = Number(emp.daysPresent || 0);
    daysAbsent = Number(emp.daysAbsent || 0);
  } else {
    range.forEach(d=>{
      const future = d>upTo;
      const off    = isWeeklyOff(d,weeklyOff);
      const hol    = isHoliday(d,holidays);
      const st     = sAtt[d];
      if (off || future) return;
      if (hol) {
        if (st !== 'A') daysHoliday++;
        else daysAbsent++;
        return;
      }
      if(st==='P')  daysPresent++;
      else if(st==='PL') daysPL++;
      else if(st==='UL') daysUL++;
      else if(st==='A')  daysAbsent++;
    });
  }

  // Work days to compare against standard workdays (present + paid leaves + holidays)
  const workDays = hasImportedDays ? daysPresent : (daysPresent + daysPL + daysHoliday);

  let paidDays = 0;
  if (workDays >= stdWorkdays) {
    // Standard paid days (N) + extra days worked beyond standard workdays
    paidDays = N + (workDays - stdWorkdays);
  } else {
    // Present days + cancelled weekoff penalty (stdWeekoffs - 1)
    paidDays = workDays + (stdWeekoffs - 1);
  }

  const dailyRate      = N > 0 ? emp.salary / N : 0;
  const tillDateSalary = Math.round(paidDays * dailyRate);
  const fixedCut       = Number(emp.fixedCutting||0);
  const advanceCut     = Number(emp.advance||0);
  const loanCut        = Number(emp.monthlyRecovery||0);
  const commEarned     = Number(emp._commEarned||0);   // injected per-render from commission data
  const netPayable     = Math.max(0, tillDateSalary - fixedCut - advanceCut - loanCut + commEarned);

  return { allWorkDays: stdWorkdays, dailyRate: Math.round(dailyRate), daysPresent, daysPL, daysUL, daysAbsent, paidDays, tillDateSalary, fixedCut, advanceCut, loanCut, commEarned, netPayable };
}

// ── Storage ───────────────────────────────────────────────────────────────────
export const lsGet = (k,fb) => { try{ const v=localStorage.getItem(k); return v!==null?JSON.parse(v):fb; }catch{ return fb; } };
export const lsSet = (k,v)  => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };

// ── Formatting ────────────────────────────────────────────────────────────────
export const inr   = n => '₹'+Number(n||0).toLocaleString('en-IN');
export const genId = (p='VM') => p+String(Date.now()).slice(-5);

// ── Deep clone ────────────────────────────────────────────────────────────────
export const clone = o => JSON.parse(JSON.stringify(o));

// ── Excel column normaliser ───────────────────────────────────────────────────
export const normKey = k => String(k).toLowerCase().replace(/[\s_\-()+.]+/g,'');
