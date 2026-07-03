import { useState, useRef } from 'react';
import { StatCard, SectionHeader, ConfirmModal, EmptyState } from '../components/UI.jsx';
import StaffModal         from '../components/StaffModal.jsx';
import AttModal           from '../components/AttModal.jsx';
import LoanModal          from '../components/LoanModal.jsx';
import SalaryBreakupModal from '../components/SalaryBreakupModal.jsx';
import { calcSalary, todayStr, monthKey, inr, formatMonth, clone } from '../utils/helpers.js';
import { ATT_STATUSES, ATT_LABELS, BRANCHES } from '../utils/constants.js';

const ATT_BG  = { P:'#d4edda', PL:'var(--b100)', UL:'var(--a100)', A:'var(--r100)' };
const ATT_COL = { P:'#1a6b35', PL:'var(--b600)', UL:'var(--a600)', A:'var(--r600)' };

function buildWhatsApp(s, sal, savings, loan, isConf, curMonth) {
  const [y,m] = curMonth.split('-');
  const ML = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const label = `${ML[Number(m)-1]} ${y}`;
  
  const loanTotal = Number(s.extraAdvance || 0);
  const loanMonthly = Number(s.monthlyRecovery || 0);
  const loanRemaining = Math.max(0, loanTotal - loanMonthly);

  return `Hi ${s.name},

📋 *Attendance & Salary — ${label}*
━━━━━━━━━━━━━━━━━━━━━
*Attendance*
Present       : ${sal.daysPresent}
Paid Leave    : ${sal.daysPL}
Unpaid Leave  : ${sal.daysUL}
Absent        : ${sal.daysAbsent}
Paid Days     : ${sal.paidDays}

*Salary*
Monthly Salary   : ${inr(s.salary)}
Daily Rate       : ${inr(sal.dailyRate)}
Till-date Salary : ${inr(sal.tillDateSalary)}
Fixed Cutting    : ${inr(sal.fixedCut)}
Advance Deducted : ${inr(sal.advanceCut)}
Loan Recovery    : ${inr(sal.loanCut)}
Commission       : ${inr(sal.commEarned)}
Net Payable      : ${inr(sal.netPayable)}

💰 *Savings*
Monthly Deduction : ${inr(s.fixedCutting)}
This Month        : ${isConf ? '✅ Confirmed' : '⏳ Pending'}
Total Savings     : ${inr(s.totalSavings)}

🏦 *Loan*
Total Loan       : ${inr(loanTotal)}
Monthly Recovery : ${inr(loanMonthly)}
Remaining        : ${inr(loanRemaining)}

— Vandana Shopping Mall Management`;
}

// ── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { key:'id',              label:'ID',               minWidth:60,  filterable:true,  sortable:true  },
  { key:'name',            label:'Name',             minWidth:160, filterable:true,  sortable:true  },
  { key:'__att__',         label:"Today's Att",      minWidth:175, filterable:false, sortable:false },
  { key:'designation',     label:'Designation',      minWidth:110, filterable:true,  sortable:true  },
  { key:'branch',          label:'Branch',           minWidth:150, filterable:true,  sortable:true  },
  { key:'phone',           label:'Phone',            minWidth:110, filterable:true,  sortable:false },
  { key:'altPhone',        label:'Alt Phone',        minWidth:110, filterable:true,  sortable:false },
  { key:'aadhar',          label:'Aadhar',           minWidth:150, filterable:true,  sortable:false },
  { key:'dob',             label:'DOB',              minWidth:100, filterable:true,  sortable:true  },
  { key:'salary',          label:'Monthly Salary',   minWidth:120, filterable:false, sortable:true  },
  { key:'fixedCutting',    label:'Fixed Cutting',    minWidth:110, filterable:false, sortable:true  },
  { key:'__comm__',        label:'Commission',       minWidth:110, filterable:false, sortable:false },
  { key:'advance',         label:'Advance',          minWidth:90,  filterable:false, sortable:true  },
  { key:'__extAdv__',      label:'Extra Advance',    minWidth:110, filterable:false, sortable:false },
  { key:'monthlyRecovery', label:'Loan Recovery',    minWidth:110, filterable:false, sortable:true  },
  { key:'totalOutstanding',label:'Outstanding',      minWidth:100, filterable:false, sortable:true  },
  { key:'__savConf__',     label:'Savings Confirm',  minWidth:120, filterable:false, sortable:false },
  { key:'totalSavings',    label:'Total Savings',    minWidth:100, filterable:false, sortable:true  },
  { key:'__present__',     label:'Present',          minWidth:70,  filterable:false, sortable:true  },
  { key:'__pl__',          label:'PL',               minWidth:55,  filterable:false, sortable:false },
  { key:'__ul__',          label:'UL',               minWidth:55,  filterable:false, sortable:false },
  { key:'__absent__',      label:'Absent',           minWidth:70,  filterable:false, sortable:true  },
  { key:'__tilldate__',    label:'Till-date Salary', minWidth:120, filterable:false, sortable:false },
  { key:'__net__',         label:'Net Payable',      minWidth:110, filterable:false, sortable:false },
  { key:'__actions__',     label:'Actions',          minWidth:140, filterable:false, sortable:false },
];

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) {
    return <i className="ti ti-selector" style={{ fontSize:10, color:'var(--border2)', marginLeft:3 }}/>;
  }
  return <i className={`ti ti-sort-${sortDir === 'asc' ? 'ascending' : 'descending'}-letters`}
    style={{ fontSize:10, color:'var(--g800)', marginLeft:3 }}/>;
}

// ── Column headers with sort + filter row ─────────────────────────────────────
function ColHeaders({ sortCol, sortDir, onSort, colFilters, setColFilters, allCheckedSavings, onToggleAllSavings }) {
  return (
    <>
      <tr>
        {COLS.map(col => (
          <th
            key={col.key}
            style={{ minWidth:col.minWidth, padding:'8px 10px', userSelect:'none',
              cursor: col.sortable ? 'pointer' : 'default', whiteSpace:'nowrap' }}
            onClick={() => col.sortable && onSort(col.key)}
          >
            <span style={{ display:'inline-flex', alignItems:'center', gap:2 }}>
              {col.label}
              {col.sortable && <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir}/>}
            </span>
          </th>
        ))}
      </tr>
      <tr style={{ background:'#f8faf7' }}>
        {COLS.map(col => (
          <th key={col.key} style={{ padding:'4px 6px', fontWeight:400, textAlign:'center' }}>
            {col.filterable
              ? <input
                  value={colFilters[col.key] || ''}
                  onChange={e => setColFilters(p => ({ ...p, [col.key]: e.target.value }))}
                  placeholder="Filter…"
                  style={{ width:'100%', padding:'3px 7px', fontSize:11, borderRadius:5,
                    border:'1px solid var(--border)', background:'var(--surface)',
                    fontFamily:'var(--font)', color:'var(--t1)' }}
                />
              : col.key === '__savConf__'
                ? <input
                    type="checkbox"
                    checked={allCheckedSavings}
                    onChange={e => onToggleAllSavings(e.target.checked)}
                    style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--g800)', marginTop:4 }}
                    title={allCheckedSavings ? "Unconfirm all savings" : "Confirm all savings"}
                  />
                : <div style={{ height:24 }}/>
            }
          </th>
        ))}
      </tr>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage({
  staff, allAtt, monthAtt, holidays, weeklyOff,
  curMonth, setCurMonth, curBranch, setCurBranch,
  allMonths,
  markAllPresent, markOne, addStaff, updateStaff, deleteStaff,
  getSavings, confirmSavings, confirmAllSavings, unconfirmSavings, unconfirmAllSavings,
  getLoan, setLoan, addLoanPayment,
  getCommission,
  undo, redo, canUndo, canRedo,
  pushHistoryDirect, snapshot, bulkSetStaff, importStaff, showToast,
  triggerImport,
  waConfig,
}) {
  const [bulkSending, setBulkSending] = useState(null);
  const cancelledRef = useRef(false);

  async function startBulkSend(targets, waCfg) {
    cancelledRef.current = false;
    setBulkSending(p => ({ ...p, status: 'sending', current: 0 }));

    let successes = 0;
    const failures = [];

    for (let i = 0; i < targets.length; i++) {
      if (cancelledRef.current) {
        setBulkSending(p => ({ ...p, status: 'cancelled' }));
        return;
      }

      const s = targets[i];
      setBulkSending(p => ({ ...p, current: i + 1 }));

      const sAtt = monthAtt[s.id] || {};
      const commEarned = getStaffCommission(s.id);
      const saved = getSavings(s.id);
      const isConf = saved.confirmed.includes(curMonth);
      const sal = calcSalary({ ...s, _commEarned: commEarned, _savingsConfirmed: isConf }, sAtt, curMonth, weeklyOff, holidays);
      const loan = getLoan(s.id);
      const msg = buildWhatsApp(s, sal, saved, loan, isConf, curMonth);

      try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${waCfg.phoneId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${waCfg.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: `91${s.phone}`, type: 'text', text: { body: msg } }),
        });
        const d = await res.json();
        if (res.ok && d.messages) {
          successes++;
        } else {
          failures.push({ name: s.name, error: d.error?.message || 'API error' });
        }
      } catch (err) {
        failures.push({ name: s.name, error: err.message || 'Network error' });
      }

      setBulkSending(p => p ? { ...p, successes, failures: [...failures] } : null);
      await new Promise(r => setTimeout(r, 200));
    }

    setBulkSending(p => p ? { ...p, status: 'complete' } : null);
  }

  function startFallbackSend(targets) {
    setBulkSending(null);
    targets.forEach((s, idx) => {
      const sAtt = monthAtt[s.id] || {};
      const commEarned = getStaffCommission(s.id);
      const saved = getSavings(s.id);
      const isConf = saved.confirmed.includes(curMonth);
      const sal = calcSalary({ ...s, _commEarned: commEarned, _savingsConfirmed: isConf }, sAtt, curMonth, weeklyOff, holidays);
      const loan = getLoan(s.id);
      const msg = buildWhatsApp(s, sal, saved, loan, isConf, curMonth);
      setTimeout(() => {
        window.open(`https://wa.me/91${s.phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }, idx * 1000);
    });
    showToast(`Opening ${targets.length} WhatsApp Web tabs (check popup blocker)`, 'info');
  }

  function handleSendWaToAll() {
    const waCfg = waConfig || {};
    const targets = filtered.filter(s => s.phone);
    if (targets.length === 0) {
      showToast('No staff with phone numbers in the current list', 'warn');
      return;
    }

    if (!waCfg.token || !waCfg.phoneId) {
      setBulkSending({
        total: targets.length,
        current: 0,
        successes: 0,
        failures: [],
        status: 'confirm_fallback',
        targets
      });
      return;
    }

    setBulkSending({
      total: targets.length,
      current: 0,
      successes: 0,
      failures: [],
      status: 'confirm',
      targets
    });
  }

  async function handleConfirmAllSavings() {
    try {
      await confirmAllSavings(curMonth);
      showToast('All savings confirmed');
    } catch(err) {
      showToast('Failed to confirm all savings: ' + err.message, 'error');
    }
  }
  async function handleUnconfirmAllSavings() {
    try {
      await unconfirmAllSavings(curMonth);
      showToast('All savings unconfirmed');
    } catch(err) {
      showToast('Failed to unconfirm all savings: ' + err.message, 'error');
    }
  }
  const [search,       setSearch]       = useState('');
  const [addModal,     setAddModal]     = useState(false);
  const [editStaff,    setEditStaff]    = useState(null);
  const [attStaff,     setAttStaff]     = useState(null);
  const [loanStaff,    setLoanStaff]    = useState(null);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [breakupStaff, setBreakupStaff] = useState(null);
  const [filterAdv,    setFilterAdv]    = useState(false);
  const [filterLoan,   setFilterLoan]   = useState(false);
  const [filterDesig,  setFilterDesig]  = useState('ALL');
  const [colFilters,   setColFilters]   = useState({});
  const [sortCol,      setSortCol]      = useState(null);
  const [sortDir,      setSortDir]      = useState('asc');

  const todaySt    = todayStr();
  const isCurMonth = monthKey(todaySt) === curMonth;
  const months     = allMonths || [curMonth];

  // Commission for a staff member in this month
  function getStaffCommission(staffId) {
    const data = getCommission ? getCommission(curMonth) : [];
    
    const ownEntry = data.find(d => d.staffId === staffId);
    const ownShare = ownEntry ? (ownEntry.empComm || 0) : 0;

    const otherEntries = data.filter(d => d.staffId !== staffId);
    const N = staff.length;
    if (N <= 1) return ownShare;

    let helperShareSum = 0;
    otherEntries.forEach(d => {
      const helperPool = d.helpTotal || 0;
      helperShareSum += helperPool / (N - 1);
    });

    return Math.round(ownShare + helperShareSum);
  }

  // Branch + search + filter + sort
  const branchStaff = curBranch === 'ALL BRANCHES'
    ? staff
    : staff.filter(s => s.branch === curBranch);

  const filtered = (() => {
    let arr = branchStaff.filter(s => {
      const q = search.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !String(s.id).includes(q)) return false;
      if (filterAdv  && !(Number(s.advance) > 0))           return false;
      if (filterLoan && !(getLoan(s.id).remaining > 0))     return false;
      if (filterDesig !== 'ALL' && s.designation !== filterDesig) return false;
      return Object.entries(colFilters).every(([k, v]) =>
        !v || String(s[k]||'').toLowerCase().includes(v.toLowerCase())
      );
    });
    if (sortCol) {
      arr = [...arr].sort((a, b) => {
        let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
        if (!isNaN(Number(av)) && !isNaN(Number(bv))) { av = Number(av); bv = Number(bv); }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        return av < bv ? (sortDir==='asc'?-1:1) : av > bv ? (sortDir==='asc'?1:-1) : 0;
      });
    }
    return arr;
  })();

  // Summary counts
  const presentToday = branchStaff.filter(s => (monthAtt[s.id]||{})[todaySt]==='P').length;
  const plToday      = branchStaff.filter(s => (monthAtt[s.id]||{})[todaySt]==='PL').length;
  const absentToday  = branchStaff.filter(s => (monthAtt[s.id]||{})[todaySt]==='A').length;
  const unmarked     = isCurMonth ? branchStaff.filter(s=>!(monthAtt[s.id]||{})[todaySt]).length : 0;
  const withAdvance  = branchStaff.filter(s=>Number(s.advance)>0).length;
  const withLoan     = branchStaff.filter(s=>getLoan(s.id).remaining>0).length;

  // Excel import handled globally via triggerImport

  async function handleMarkAll() {
    try {
      const ok = await markAllPresent();
      if (ok) showToast(`All staff marked Present`);
      else    showToast('Current month only','warn');
    } catch(err) {
      showToast('Failed to mark all present: ' + err.message, 'error');
    }
  }

  async function handleMarkOne(staffId, date, status) {
    try {
      await markOne(staffId, date, status);
    } catch(err) {
      showToast('Failed to update attendance: ' + err.message, 'error');
    }
  }

  async function handleToggleSavings(sId, isConf) {
    try {
      if (isConf) {
        await unconfirmSavings(sId, curMonth);
        showToast('Savings unconfirmed');
      } else {
        await confirmSavings(sId, curMonth);
        showToast('Savings confirmed');
      }
    } catch(err) {
      showToast('Failed to update savings: ' + err.message, 'error');
    }
  }

  function sendWA(s, sal, saved, loan, isConf) {
    const msg = buildWhatsApp(s, sal, saved, loan, isConf, curMonth);
    const waCfg = waConfig || {};
    if (waCfg.token && waCfg.phoneId && s.phone) {
      fetch(`https://graph.facebook.com/v18.0/${waCfg.phoneId}/messages`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${waCfg.token}`, 'Content-Type':'application/json' },
        body:JSON.stringify({ messaging_product:'whatsapp', to:`91${s.phone}`, type:'text', text:{ body:msg } }),
      })
        .then(r=>r.json())
        .then(d=>{ if(d.messages) showToast(`Sent to ${s.name}`); else showToast('WA error: '+d.error?.message,'error'); })
        .catch(()=>showToast('Network error','error'));
    } else {
      window.open(`https://wa.me/91${s.phone}?text=${encodeURIComponent(msg)}`,'_blank');
      showToast('Opened WhatsApp Web');
    }
  }

  const handleSort = col => {
    if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:18 }}>
        <StatCard icon="ti-users"         label="Total Staff"    value={branchStaff.length} color="var(--g800)"  accent="var(--g50)"/>
        <StatCard icon="ti-user-check"    label="Present Today"  value={presentToday}        color="#1a6b35"      accent="#d4edda"/>
        <StatCard icon="ti-beach"         label="On Leave"       value={plToday}             color="var(--b600)"  accent="var(--b100)"/>
        <StatCard icon="ti-user-off"      label="Absent Today"   value={absentToday}         color="var(--r600)"  accent="var(--r100)"/>
        {isCurMonth && <StatCard icon="ti-clock-question" label="Unmarked" value={unmarked}  color="var(--a600)"  accent="var(--a100)"/>}
        <StatCard icon="ti-cash"          label="With Advance"   value={withAdvance}         color="var(--a600)"  accent="var(--a100)"
          onClick={()=>{ setFilterAdv(p=>!p); setFilterLoan(false); }}/>
        <StatCard icon="ti-credit-card"   label="Pending Loans"  value={withLoan}            color="var(--r600)"  accent="var(--r100)"
          onClick={()=>{ setFilterLoan(p=>!p); setFilterAdv(false); }}/>
      </div>

      {/* Active filter badge */}
      {(filterAdv||filterLoan) && (
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'6px 12px',background:'var(--a100)',borderRadius:8,width:'fit-content' }}>
          <i className="ti ti-filter" style={{ fontSize:13,color:'var(--a600)' }}/>
          <span style={{ fontSize:12,color:'var(--a600)',fontWeight:500 }}>
            Filtered: {filterAdv?'With Advance':'Pending Loans'}
          </span>
          <button className="btn btn-xs" onClick={()=>{ setFilterAdv(false); setFilterLoan(false); }}
            style={{ color:'var(--a600)',borderColor:'var(--a600)',marginLeft:4 }}>Clear</button>
        </div>
      )}

      {/* Controls */}
      <SectionHeader title={`Staff — ${formatMonth(curMonth)}${Object.values(colFilters).some(v=>v)||filterDesig!=='ALL'?' (Filtered)':''}`}>
        <div style={{ position:'relative' }}>
          <i className="ti ti-search" style={{ position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--t3)',fontSize:13,pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or ID…" style={{ paddingLeft:29,width:180 }}/>
        </div>
        <select value={curBranch} onChange={e=>setCurBranch(e.target.value)} style={{ width:'auto' }}>
          {BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterDesig} onChange={e=>setFilterDesig(e.target.value)} style={{ width:'auto' }}>
          <option value="ALL">All Designations</option>
          {[...new Set(staff.map(s=>s.designation).filter(Boolean))].sort().map(d=>(
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={curMonth} onChange={e=>setCurMonth(e.target.value)} style={{ width:'auto' }}>
          {months.map(m=><option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        {Object.values(colFilters).some(v=>v) && (
          <button className="btn btn-sm btn-danger" onClick={()=>setColFilters({})}>
            <i className="ti ti-filter-off"/> Clear Filters
          </button>
        )}
        {isCurMonth && (
          <button className="btn btn-sm btn-primary" onClick={handleMarkAll}>
            <i className="ti ti-checks"/> Mark All Present
          </button>
        )}
        <button className="btn btn-sm" onClick={()=>setAddModal(true)}>
          <i className="ti ti-user-plus"/> Add Staff
        </button>
        <button className="btn btn-sm" onClick={triggerImport}>
          <i className="ti ti-file-import"/> Import
        </button>
        <button className="btn btn-sm" onClick={handleSendWaToAll} style={{ color:'#25d366', borderColor:'#b2dfce', background:'#f0faf5' }}>
          <i className="ti ti-brand-whatsapp"/> Send WhatsApp to All
        </button>
        <div style={{ display:'flex',gap:3 }}>
          <button className="btn btn-sm btn-icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <i className="ti ti-arrow-back-up"/>
          </button>
          <button className="btn btn-sm btn-icon" onClick={redo} disabled={!canRedo} title="Redo">
            <i className="ti ti-arrow-forward-up"/>
          </button>
        </div>
      </SectionHeader>

      {/* Table */}
      <div className="card" style={{ overflow:'auto', maxHeight:'calc(100vh - 310px)' }}>
        {filtered.length === 0
          ? <EmptyState icon="ti-users" title="No staff found" sub="Adjust your search or filters."/>
          : (
          <table>
            <thead>
              <ColHeaders
                sortCol={sortCol} sortDir={sortDir}
                onSort={handleSort}
                colFilters={colFilters}
                setColFilters={setColFilters}
                allCheckedSavings={filtered.length > 0 && filtered.every(s => getSavings(s.id).confirmed.includes(curMonth))}
                onToggleAllSavings={checked => checked ? handleConfirmAllSavings() : handleUnconfirmAllSavings()}
              />
            </thead>
            <tbody>
              {filtered.map(s => {
                const sAtt       = monthAtt[s.id] || {};
                const commEarned = getStaffCommission(s.id);
                const saved      = getSavings(s.id);
                const isConf     = saved.confirmed.includes(curMonth);
                const sal        = calcSalary({ ...s, _commEarned:commEarned, _savingsConfirmed:isConf }, sAtt, curMonth, weeklyOff, holidays);
                const loan       = getLoan(s.id);
                const todayStat  = sAtt[todaySt];
                return (
                  <tr key={s.id}>
                    {/* ID */}
                    <td style={{ color:'var(--t3)',fontSize:11,fontWeight:500 }}>{s.id}</td>
                    {/* Name */}
                    <td style={{ fontWeight:600 }}>{s.name}</td>
                    {/* Today's Attendance */}
                    <td>
                      {isCurMonth
                        ? <div style={{ display:'flex',gap:3 }}>
                            {ATT_STATUSES.map(st => (
                              <button key={st} onClick={()=>handleMarkOne(s.id,todaySt,st)} className="btn btn-xs"
                                style={{ background:todayStat===st?ATT_BG[st]:'var(--s2)',
                                  borderColor:todayStat===st?ATT_COL[st]:'var(--border)',
                                  color:todayStat===st?ATT_COL[st]:'var(--t3)',
                                  fontWeight:600,minWidth:30,justifyContent:'center' }}
                                title={ATT_LABELS[st]}>{st}
                              </button>
                            ))}
                          </div>
                        : <span style={{ color:'var(--t3)',fontSize:12 }}>Past month</span>
                      }
                    </td>
                    {/* Identity */}
                    <td style={{ fontSize:12,color:'var(--t2)' }}>{s.designation||'—'}</td>
                    <td>
                      <span style={{ fontSize:11,padding:'2px 7px',borderRadius:99,background:'var(--g50)',
                        color:'var(--g800)',fontWeight:500,border:'1px solid var(--g100)',whiteSpace:'nowrap' }}>
                        {s.branch||'—'}
                      </span>
                    </td>
                    <td style={{ fontSize:12,color:'var(--t2)' }}>{s.phone||'—'}</td>
                    <td style={{ fontSize:12,color:'var(--t3)' }}>{s.altPhone||'—'}</td>
                    <td style={{ fontSize:12,color:'var(--t3)',letterSpacing:'.01em' }}>{s.aadhar||'—'}</td>
                    <td style={{ fontSize:12,color:'var(--t2)' }}>{s.dob||'—'}</td>
                    {/* Financial */}
                    <td style={{ fontWeight:500 }}>{inr(s.salary)}</td>
                    <td style={{ color:'var(--b600)',fontWeight:500 }}>{inr(s.fixedCutting)}</td>
                    {/* Commission */}
                    <td>
                      <span style={{ fontWeight:600,
                        color:commEarned>0?'#1a6b35':'var(--t3)',
                        background:commEarned>0?'#d4edda':'var(--s2)',
                        padding:'2px 8px',borderRadius:99,fontSize:12 }}>
                        {commEarned>0 ? '+'+inr(commEarned) : '—'}
                      </span>
                    </td>
                    <td style={{ color:Number(s.advance)>0?'var(--a600)':'var(--t3)' }}>{inr(s.advance)}</td>
                    {/* Extra Advance (Loan) */}
                    <td>
                      <button onClick={()=>setLoanStaff(s)} className="btn btn-xs"
                        style={{ color:(loan.total > 0 ? loan.total : Number(s.extraAdvance || 0)) > 0 ? 'var(--r600)' : 'var(--t3)',
                          borderColor:(loan.total > 0 ? loan.total : Number(s.extraAdvance || 0)) > 0 ? 'var(--r100)' : 'var(--border)',
                          background:(loan.total > 0 ? loan.total : Number(s.extraAdvance || 0)) > 0 ? 'var(--r50)' : 'var(--s2)' }}>
                        {inr(loan.total > 0 ? loan.total : Number(s.extraAdvance || 0))}
                      </button>
                    </td>
                    <td style={{ color:'var(--r600)',fontWeight:500 }}>{inr(s.monthlyRecovery)}</td>
                    <td style={{ color:'var(--r600)' }}>
                      {inr(Math.max(0, Number(s.extraAdvance || 0) - Number(s.monthlyRecovery || 0)))}
                    </td>
                    {/* Savings confirm */}
                    <td>
                      <button
                        onClick={()=>handleToggleSavings(s.id,isConf)}
                        className="btn btn-xs"
                        style={{ background:isConf?'#d4edda':'var(--s2)',
                          borderColor:isConf?'#1a6b35':'var(--border)',
                          color:isConf?'#1a6b35':'var(--t2)' }}>
                        <i className={`ti ${isConf?'ti-check':'ti-clock'}`}/>
                        {isConf?'Confirmed':'Confirm'}
                      </button>
                    </td>
                    <td style={{ fontWeight:600,color:'var(--b600)' }}>{inr(s.totalSavings)}</td>
                    {/* Attendance counts */}
                    <td style={{ color:'#1a6b35',fontWeight:600 }}>{sal.daysPresent}</td>
                    <td style={{ color:'var(--b600)' }}>{sal.daysPL}</td>
                    <td style={{ color:'var(--a600)' }}>{sal.daysUL}</td>
                    <td style={{ color:'var(--r600)' }}>{sal.daysAbsent}</td>
                    {/* Salary */}
                    <td style={{ fontWeight:600,color:'var(--g800)' }}>{inr(sal.tillDateSalary)}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontWeight:700, color:sal.netPayable<0?'var(--r600)':'var(--t1)' }}>
                          {inr(sal.netPayable)}
                        </span>
                        <button className="btn btn-xs btn-ghost btn-icon" onClick={()=>setBreakupStaff(s)} title="View salary breakup">
                          <i className="ti ti-calculator" style={{ fontSize:12 }}/>
                        </button>
                      </div>
                    </td>
                    {/* Actions */}
                    <td>
                      <div style={{ display:'flex',gap:3 }}>
                        <button className="btn btn-xs btn-icon" onClick={()=>setAttStaff(s)} title="Attendance calendar">
                          <i className="ti ti-calendar"/>
                        </button>
                        <button className="btn btn-xs btn-icon" onClick={()=>setLoanStaff(s)} title="Loan details">
                          <i className="ti ti-credit-card"/>
                        </button>
                        <button className="btn btn-xs btn-icon" onClick={()=>setEditStaff(s)} title="Edit">
                          <i className="ti ti-edit"/>
                        </button>
                        <button className="btn btn-xs btn-icon" onClick={()=>sendWA(s,sal,saved,loan,isConf)}
                          title="Send WhatsApp" style={{ color:'#25d366',borderColor:'#b2dfce' }}>
                          <i className="ti ti-brand-whatsapp"/>
                        </button>
                        <button className="btn btn-xs btn-icon btn-danger" onClick={()=>setConfirmDel(s)} title="Delete">
                          <i className="ti ti-trash"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {addModal && (
        <StaffModal onSave={async d=>{
          try {
            await addStaff(d);
            showToast('Staff added');
            setAddModal(false);
          } catch(err) {
            showToast('Failed to add staff: ' + err.message, 'error');
          }
        }} onClose={()=>setAddModal(false)}/>
      )}
      {editStaff && (
        <StaffModal existing={editStaff} onSave={async d=>{
          try {
            await updateStaff(editStaff.id,d);
            showToast('Updated');
            setEditStaff(null);
          } catch(err) {
            showToast('Failed to update staff: ' + err.message, 'error');
          }
        }} onClose={()=>setEditStaff(null)}/>
      )}
      {attStaff && (
        <AttModal staffName={attStaff.name} staffId={attStaff.id}
          sAtt={monthAtt[attStaff.id]||{}} curMonth={curMonth}
          weeklyOff={weeklyOff} holidays={holidays}
          onMark={handleMarkOne} onClose={()=>setAttStaff(null)}/>
      )}
      {loanStaff && (
        <LoanModal staff={loanStaff} loanData={getLoan(loanStaff.id)}
          onSave={async d=>{
            try {
              await setLoan(loanStaff.id,d);
              await updateStaff(loanStaff.id,{ extraAdvance:d.total, monthlyRecovery:d.monthly, totalOutstanding:d.remaining });
              showToast('Loan updated');
            } catch(err) {
              showToast('Failed to update loan: ' + err.message, 'error');
            }
          }}
          onPayment={async (amt,note)=>{
            try {
              await addLoanPayment(loanStaff.id,amt,note);
              showToast(`Payment of ${inr(amt)} recorded`);
            } catch(err) {
              showToast('Failed to record payment: ' + err.message, 'error');
            }
          }}
          onClose={()=>setLoanStaff(null)}/>
      )}
      {confirmDel && (
        <ConfirmModal title="Delete Staff Member"
          message={`Permanently delete ${confirmDel.name}? All their data will be removed.`}
          danger
          onConfirm={async ()=>{
            try {
              await deleteStaff(confirmDel.id);
              setConfirmDel(null);
              showToast(`${confirmDel.name} removed`);
            } catch(err) {
              showToast('Failed to delete staff: ' + err.message, 'error');
            }
          }}
          onCancel={()=>setConfirmDel(null)}/>
      )}
      {breakupStaff && (
        <SalaryBreakupModal
          staff={breakupStaff}
          sal={calcSalary({ ...breakupStaff, _commEarned: getStaffCommission(breakupStaff.id), _savingsConfirmed: getSavings(breakupStaff.id).confirmed.includes(curMonth) }, monthAtt[breakupStaff.id]||{}, curMonth, weeklyOff, holidays)}
          curMonth={curMonth}
          onClose={()=>setBreakupStaff(null)}
        />
      )}
      {bulkSending && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(15,23,42,0.4)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999
        }}>
          <div className="card" style={{ width:480, padding:25, display:'flex', flexDirection:'column', gap:15, boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            
            {bulkSending.status === 'confirm' && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#e8f8ef', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-brand-whatsapp" style={{ fontSize:20, color:'#25d366' }}/>
                  </div>
                  <div>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:600 }}>Send Payslips to All Staff</h3>
                    <p style={{ margin:0, fontSize:12, color:'var(--t3)' }}>Confirm bulk transmission</p>
                  </div>
                </div>
                <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.5 }}>
                  You are about to send monthly payslips and attendance records to <strong>{bulkSending.total} staff members</strong> via WhatsApp Business API.
                </p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:10 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setBulkSending(null)}>Cancel</button>
                  <button className="btn btn-sm btn-primary" style={{ background:'#25d366', borderColor:'#25d366' }} onClick={() => startBulkSend(bulkSending.targets, waConfig)}>
                    Yes, Send All
                  </button>
                </div>
              </>
            )}

            {bulkSending.status === 'confirm_fallback' && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#fff8e1', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize:20, color:'#f59e0b' }}/>
                  </div>
                  <div>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:600 }}>API Config Missing</h3>
                    <p style={{ margin:0, fontSize:12, color:'var(--t3)' }}>WhatsApp Business API not set up</p>
                  </div>
                </div>
                <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.5 }}>
                  WhatsApp Business API credentials are not configured. To send payslips to <strong>{bulkSending.total} staff</strong>, we must open individual WhatsApp Web tabs. 
                  <br/><br/>
                  <span style={{ color:'var(--r600)', fontWeight:500 }}>Warning:</span> Your browser may block these pop-ups, and you will have to manually click send on each screen.
                </p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:10 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setBulkSending(null)}>Cancel</button>
                  <button className="btn btn-sm btn-primary" onClick={() => startFallbackSend(bulkSending.targets)}>
                    Open Tabs (1s delay)
                  </button>
                </div>
              </>
            )}

            {['sending', 'complete', 'cancelled'].includes(bulkSending.status) && (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <h3 style={{ margin:0, fontSize:16, fontWeight:600 }}>
                    {bulkSending.status === 'sending' && 'Sending Messages...'}
                    {bulkSending.status === 'complete' && 'Sending Complete'}
                    {bulkSending.status === 'cancelled' && 'Sending Cancelled'}
                  </h3>
                  <span style={{ fontSize:12, fontWeight:500, color:'var(--t3)' }}>
                    {bulkSending.current} / {bulkSending.total}
                  </span>
                </div>

                <div style={{ width:'100%', height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{
                    width:`${(bulkSending.current / bulkSending.total) * 100}%`,
                    height:'100%',
                    background:bulkSending.status === 'cancelled' ? 'var(--r500)' : '#25d366',
                    transition:'width 0.2s ease'
                  }}/>
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'#1a6b35', fontWeight:500 }}>Success: {bulkSending.successes}</span>
                  <span style={{ color:'var(--r600)', fontWeight:500 }}>Failed: {bulkSending.failures.length}</span>
                </div>

                {bulkSending.failures.length > 0 && (
                  <div style={{
                    maxHeight:120, overflowY:'auto', background:'var(--s2)',
                    borderRadius:8, border:'1px solid var(--border)', padding:10,
                    display:'flex', flexDirection:'column', gap:4
                  }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'var(--t2)', marginBottom:4 }}>Errors:</span>
                    {bulkSending.failures.map((f, idx) => (
                      <div key={idx} style={{ fontSize:11, color:'var(--r600)', display:'flex', justifyContent:'space-between' }}>
                        <span>{f.name}</span>
                        <span>{f.error}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                  {bulkSending.status === 'sending' ? (
                    <button className="btn btn-sm btn-danger" onClick={() => { cancelledRef.current = true; }}>
                      Cancel Sending
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-primary" onClick={() => setBulkSending(null)}>
                      Close
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
