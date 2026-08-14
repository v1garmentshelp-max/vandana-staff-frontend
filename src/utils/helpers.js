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
  const calendarDays = range.length;
  const divisor     = (calendarDays === 31 || calendarDays === 30) ? 30 : calendarDays;
  
  // Determine standard weekoffs and workdays based on actual calendar days
  const stdWeekoffs = 4;
  const stdWorkdays = divisor - stdWeekoffs;
  
  let daysPresent=0, daysPL=0, daysUL=0, daysAbsent=0, daysHoliday=0, weekoffsWorked=0;

  const hasCalendarAtt = sAtt && Object.keys(sAtt).length > 0;
  const hasImportedDays = emp.importMonth === ym || (!hasCalendarAtt && (
    (emp.daysPresent !== undefined && emp.daysPresent !== null && emp.daysPresent !== '') ||
    (emp.daysAbsent !== undefined && emp.daysAbsent !== null && emp.daysAbsent !== '')
  ));

  if (hasImportedDays) {
    const rawPresent = Number(emp.daysPresent || 0);
    daysAbsent = Number(emp.daysAbsent || 0);
    daysPresent = Math.min(stdWorkdays, rawPresent);
    weekoffsWorked = Math.max(0, rawPresent - stdWorkdays);
  } else {
    range.forEach(d=>{
      const future = d>upTo;
      if (future) return;
      const off    = isWeeklyOff(d,weeklyOff);
      const hol    = isHoliday(d,holidays);
      const st     = sAtt[d];
      if (off) {
        if (st==='P') weekoffsWorked += 1;
        else if (st==='HD') weekoffsWorked += 0.5;
        return;
      }
      if (hol) {
        if (st !== 'A' && st !== 'UL') daysHoliday++;
        else daysAbsent++;
        return;
      }
      if(st==='P')  daysPresent++;
      else if(st==='PL') daysPL++;
      else if(st==='UL') { daysUL++; daysAbsent++; }
      else if(st==='A')  daysAbsent++;
    });
  }

  // Work days to compare against standard workdays (present + paid leaves + holidays)
  const workDays = hasImportedDays ? daysPresent : (daysPresent + daysPL + daysHoliday);

  let paidWeekoffs = 0;
  if (workDays >= 16) {
    paidWeekoffs = stdWeekoffs;
  } else if (workDays > 0) {
    paidWeekoffs = Math.min(stdWeekoffs, Math.floor(workDays / 5));
  }
  const paidDays = workDays + paidWeekoffs + weekoffsWorked;

  const dailyRate      = divisor > 0 ? emp.salary / divisor : 0;
  const tillDateSalary = Math.round(paidDays * dailyRate);
  const fixedCut       = emp._savingsConfirmed ? Number(emp.fixedCutting||0) : 0;
  const advanceCut     = Number(emp.advance||0);
  const loanCut        = Number(emp.monthlyRecovery||0);
  const commEarned     = Number(emp._commEarned||0);   // injected per-render from commission data
  const netPayable     = Math.max(0, tillDateSalary - fixedCut - advanceCut - loanCut + commEarned);

  return { divisor, allWorkDays: stdWorkdays, stdWeekoffs, workDays, paidWeekoffs, weekoffsWorked, dailyRate: Math.round(dailyRate), daysPresent, daysPL, daysUL, daysAbsent, paidDays, tillDateSalary, fixedCut, advanceCut, loanCut, commEarned, netPayable };
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
