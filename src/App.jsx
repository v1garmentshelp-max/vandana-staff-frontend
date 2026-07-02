import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { lsGet, lsSet, todayStr, monthKey, normKey, formatMonth } from './utils/helpers.js';
import { useAppState }    from './hooks/useAppState.js';
import { Toast, Modal }          from './components/UI.jsx';
import LoginPage          from './pages/LoginPage.jsx';
import DashboardPage      from './pages/DashboardPage.jsx';
import SheetPage          from './pages/SheetPage.jsx';
import CommissionPage     from './pages/CommissionPage.jsx';
import SettingsPage       from './pages/SettingsPage.jsx';
import AuditPage          from './pages/AuditPage.jsx';
import ImportPreviewModal from './components/ImportPreviewModal.jsx';

const NAV = [
  ['dashboard', 'ti-layout-dashboard', 'Dashboard'],
  ['sheet',     'ti-table',            'Sheet'],
  ['commission','ti-target',           'Commission'],
  ['audit',     'ti-shield-check',     'Audit Log'],
  ['settings',  'ti-settings',         'Settings'],
];

function NavBtn({ id, icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:6,
      padding:'6px 12px', borderRadius:7, border:'none',
      background: active ? 'var(--g50)' : 'transparent',
      color:      active ? 'var(--g800)' : 'var(--t2)',
      fontFamily:'var(--font)', fontSize:13,
      fontWeight: active ? 600 : 400,
      cursor:'pointer', transition:'all .13s',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize:15 }}/>
      {label}
    </button>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => lsGet('vm_authed', false));
  const [page,   setPage]   = useState('dashboard');
  const [toast,  setToast]  = useState(null);

  useEffect(() => lsSet('vm_authed', authed), [authed]);

  const showToast = useCallback((message, type='success') => setToast({ message, type }), []);

  const A = useAppState(showToast);

  const [importChanges, setImportChanges] = useState(null);
  const [importMonthModal, setImportMonthModal] = useState(false);
  const [selectedImportMonth, setSelectedImportMonth] = useState(A.curMonth);
  const [viewYear, setViewYear] = useState(() => Number(A.curMonth.split('-')[0]));
  const importRef = useRef();

  useEffect(() => {
    setSelectedImportMonth(A.curMonth);
    setViewYear(Number(A.curMonth.split('-')[0]));
  }, [A.curMonth]);

  function handleImportFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb   = XLSX.read(evt.target.result, { type:'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval:'' });
        const MERGE = ['advance','extraAdvance','totalSavings'];
        const NUM   = ['salary','fixedCutting','advance','extraAdvance','monthlyRecovery','totalOutstanding','totalSavings','daysPresent','daysAbsent'];
        const FIELD_MAP = {
          'id':['id','empid','employeeid'],
          'name':['name','fullname','staffname','employeename'],
          'designation':['designation','role','position'],
          'branch':['branch','branchname'],
          'aadhar':['aadhar','aadharnumber','aadharno'],
          'phone':['phone','phoneno','mobile','mobileno'],
          'altPhone':['alternatemobileno','altmobile','altphone','phone2'],
          'dob':['dob','dateofbirth','birthdate'],
          'salary':['salary','monthlysalary','ctc'],
          'fixedCutting':['fixedcutting','fixedcut','savings','savingspermonth'],
          'advance':['advance','advancetaken','advanceamount'],
          'extraAdvance':['extraadvance','loan','loanamount','extraadvanceamount','loanoutstanding','totalloan'],
          'monthlyRecovery':['monthlyrecovery','loanrecovery','emiamount','loanemi','emi','monthlyrecoveryamount','loanrecoveryamount','loanrecoveryemi'],
          'totalOutstanding':['totaloutstanding','remainingloan','loanbalance','outstanding','totaloutstandingamount','outstandingamount'],
          'totalSavings':['totalsavings','totalsaving','accumulatedsavings','totalsavingsamount'],
          'daysPresent':['dayspresent','presentdays','noofdayspresent','present','dayspresentcount'],
          'daysAbsent':['daysabsent','absentdays','noofdaysabsent','absent','daysabsentcount'],
        };
        const changes = [];
        const excelIds = new Set();
        const excelNames = new Set();

        rows.forEach(row => {
          const r = {};
          Object.keys(row).forEach(k => { r[normKey(k)] = row[k]; });
          const mapped = {};
          Object.entries(FIELD_MAP).forEach(([ourKey, aliases]) => {
            for (const alias of aliases) {
              const v = r[alias];
              if (v !== undefined && v !== '') {
                let strVal = String(v).trim();
                if (ourKey === 'dob') {
                  if (!isNaN(Number(v)) && Number(v) > 10000) {
                    const dateObj = new Date((Number(v) - 25569) * 86400 * 1000);
                    if (!isNaN(dateObj.getTime())) {
                      strVal = dateObj.toISOString().slice(0, 10);
                    }
                  } else {
                    const parts = strVal.split(/[\/\-]/);
                    if (parts.length === 3) {
                      if (parts[2].length === 4) {
                        strVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      } else if (parts[0].length === 4) {
                        strVal = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                      }
                    }
                  }
                }
                mapped[ourKey] = strVal;
                return;
              }
            }
          });
          NUM.forEach(k => { if (mapped[k] !== undefined) mapped[k] = Number(mapped[k]) || 0; });
          const rowId   = String(mapped.id||'').trim();
          const rowName = String(mapped.name||'').trim().toUpperCase();
          if (!rowId && !rowName) return;

          if (rowId) excelIds.add(rowId);
          if (rowName) excelNames.add(rowName);

          const exist = A.staff.find(s =>
            (rowId   && String(s.id) === rowId) ||
            (rowName && s.name.toUpperCase() === rowName)
          );

          if (exist) {
            const diffs = [];
            Object.entries(mapped).forEach(([k, newV]) => {
              if (k==='id'||k==='name') return;
              let finalV = newV;
              if (MERGE.includes(k)) finalV = (Number(exist[k])||0) + (Number(newV)||0);
              
              let isDiff = false;
              if (NUM.includes(k)) {
                const oldNum = Number(exist[k]) || 0;
                const newNum = Number(finalV) || 0;
                if (oldNum !== newNum) isDiff = true;
              } else {
                const oldStr = String(exist[k] || '').trim();
                const newStr = String(finalV || '').trim();
                if (oldStr !== newStr) isDiff = true;
              }

              if (isDiff) {
                diffs.push({ field:k, old:exist[k], new:finalV, importedVal:newV });
              }
            });
            if (diffs.length) changes.push({ type:'update', id:exist.id, name:exist.name, diffs, mapped });
          } else if (rowName) {
            const genId = `VM${Date.now()}${Math.floor(Math.random()*1000)}`;
            changes.push({ type:'add', id:rowId||genId, name:rowName, diffs:[], mapped });
          }
        });

        // Find removed staff
        A.staff.forEach(s => {
          const sName = s.name.toUpperCase();
          const sId = String(s.id);
          const inExcel = excelIds.has(sId) || excelNames.has(sName);
          if (!inExcel) {
            changes.push({ type:'delete', id:s.id, name:s.name, diffs:[], mapped:{} });
          }
        });

        if (!changes.length) { showToast('No changes detected','info'); return; }
        setImportChanges(changes);
      } catch(err) { showToast('Import failed: '+err.message,'error'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }

  async function applyImport(finalChanges) {
    const toApply = finalChanges || importChanges;
    try {
      await A.importStaff(toApply);
      setImportChanges(null);
      const upd = toApply.filter(c=>c.type==='update').length;
      const add = toApply.filter(c=>c.type==='add').length;
      showToast(`Import applied — ${upd} updated, ${add} added`);
    } catch(err) {
      showToast('Import failed to save to database: ' + err.message, 'error');
    }
  }

  const triggerImport = useCallback(() => {
    setSelectedImportMonth(A.curMonth);
    setViewYear(Number(A.curMonth.split('-')[0]));
    setImportMonthModal(true);
  }, [A.curMonth]);

  // Global keyboard shortcuts
  useEffect(() => {
    function kh(e) {
      if ((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); A.undo(); showToast('Undone','info'); }
      if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.key==='z'&&e.shiftKey))) { e.preventDefault(); A.redo(); showToast('Redone','info'); }
    }
    window.addEventListener('keydown', kh);
    return () => window.removeEventListener('keydown', kh);
  }, [A, showToast]);

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  if (A.loading) return (
    <div style={{minHeight:'100vh',background:'var(--g900)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:48,height:48,borderRadius:12,background:'var(--g800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🛒</div>
      <div style={{color:'#fff',fontFamily:'var(--font-display)',fontSize:22}}>Vandana Mall</div>
      <div style={{color:'rgba(255,255,255,.5)',fontSize:13}}>Connecting to database…</div>
      <div style={{width:200,height:3,background:'rgba(255,255,255,.1)',borderRadius:99,overflow:'hidden',marginTop:8}}>
        <div style={{height:'100%',background:'var(--g600)',borderRadius:99,animation:'loadbar 1.5s ease-in-out infinite'}}/>
      </div>
      <style>{`@keyframes loadbar{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}`}</style>
    </div>
  );

  if (A.error) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:24}}>
      <i className="ti ti-database-off" style={{fontSize:48,color:'var(--r600)'}}/>
      <h2 style={{fontSize:20,fontWeight:600}}>Database Connection Failed</h2>
      <p style={{fontSize:14,color:'var(--t2)',maxWidth:400,textAlign:'center'}}>{A.error}</p>
      <p style={{fontSize:12,color:'var(--t3)',textAlign:'center'}}>Make sure the backend is running on port 4000 and your Neon database is accessible.</p>
      <button className="btn btn-primary" onClick={A.reload}><i className="ti ti-refresh"/> Retry Connection</button>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* Topbar */}
      <header style={{
        position:'sticky', top:0, zIndex:100,
        background:'var(--surface)', borderBottom:'1px solid var(--border)',
        height:'var(--topbar)', display:'flex', alignItems:'center',
        padding:'0 20px', gap:12, boxShadow:'var(--sh-sm)',
      }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0, marginRight:4 }}>
          <div style={{ width:32,height:32,borderRadius:8,background:'var(--g800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17 }}>🛒</div>
          <div>
            <div style={{ fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:'var(--g800)',lineHeight:1 }}>Vandana Mall</div>
            <div style={{ fontSize:10,color:'var(--t3)',lineHeight:1,marginTop:1 }}>Staff Manager</div>
          </div>
        </div>

        <div style={{ width:1,height:26,background:'var(--border)',flexShrink:0 }}/>

        {/* Nav */}
        <nav style={{ display:'flex', gap:2, flex:1, overflowX:'auto' }}>
          {NAV.map(([id,icon,label]) => (
            <NavBtn key={id} id={id} icon={icon} label={label} active={page===id} onClick={()=>setPage(id)}/>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          <button className="btn btn-sm btn-ghost btn-icon" onClick={()=>{ A.undo(); showToast('Undone','info'); }} disabled={!A.canUndo} title="Undo (Ctrl+Z)">
            <i className="ti ti-arrow-back-up" style={{ fontSize:15 }}/>
          </button>
          <button className="btn btn-sm btn-ghost btn-icon" onClick={()=>{ A.redo(); showToast('Redone','info'); }} disabled={!A.canRedo} title="Redo (Ctrl+Y)">
            <i className="ti ti-arrow-forward-up" style={{ fontSize:15 }}/>
          </button>
          <div style={{ width:1,height:22,background:'var(--border)' }}/>
          {/* Branch badge */}
          <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:7,background:'var(--g50)',border:'1px solid var(--g100)' }}>
            <i className="ti ti-building-store" style={{ fontSize:13,color:'var(--g800)' }}/>
            <span style={{ fontSize:11,fontWeight:500,color:'var(--g800)',maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
              {A.curBranch}
            </span>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={()=>{ setAuthed(false); setPage('dashboard'); }} style={{ color:'var(--t3)' }}>
            <i className="ti ti-logout" style={{ fontSize:14 }}/> Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ padding:'18px 22px', maxWidth:1800, margin:'0 auto' }}>
        {page==='dashboard' && (
          <DashboardPage
            staff={A.staff} allAtt={A.allAtt} monthAtt={A.monthAtt}
            holidays={A.holidays} weeklyOff={A.weeklyOff}
            curMonth={A.curMonth} setCurMonth={A.setCurMonth} allMonths={A.allMonths}
            curBranch={A.curBranch} setCurBranch={A.setCurBranch}
            markAllPresent={A.markAllPresent} markOne={A.markOne}
            addStaff={A.addStaff} updateStaff={A.updateStaff} deleteStaff={A.deleteStaff}
            getSavings={A.getSavings} confirmSavings={A.confirmSavings} unconfirmSavings={A.unconfirmSavings}
            getLoan={A.getLoan} setLoan={A.setLoan} addLoanPayment={A.addLoanPayment}
            getCommission={A.getCommission}
            undo={A.undo} redo={A.redo} canUndo={A.canUndo} canRedo={A.canRedo}
            pushHistoryDirect={A.pushHistoryDirect} snapshot={A.snapshot}
            bulkSetStaff={A.bulkSetStaff} importStaff={A.importStaff}
            showToast={showToast}
            triggerImport={triggerImport}
          />
        )}
        {page==='sheet' && (
          <SheetPage
            staff={A.staff} updateStaff={A.updateStaff}
            allAtt={A.allAtt} markOne={A.markOne}
            weeklyOff={A.weeklyOff} holidays={A.holidays}
            curMonth={A.curMonth} setCurMonth={A.setCurMonth} allMonths={A.allMonths}
            getCommission={A.getCommission}
            getSavings={A.getSavings}
            pushHistoryDirect={A.pushHistoryDirect} snapshot={A.snapshot}
            undo={A.undo} redo={A.redo} canUndo={A.canUndo} canRedo={A.canRedo}
            showToast={showToast}
            triggerImport={triggerImport}
          />
        )}
        {page==='commission' && (
          <CommissionPage
            staff={A.staff} curMonth={A.curMonth} setCurMonth={A.setCurMonth} allMonths={A.allMonths}
            getCommission={A.getCommission} setCommissionForMonth={A.setCommissionForMonth}
            allAtt={A.allAtt} showToast={showToast}
          />
        )}
        {page==='audit' && (
          <AuditPage auditLog={A.auditLog} staff={A.staff}/>
        )}
        {page==='settings' && (
          <SettingsPage
            holidays={A.holidays} weeklyOff={A.weeklyOff}
            setWeeklyOff={A.setWeeklyOff}
            addHoliday={A.addHoliday} removeHoliday={A.removeHoliday}
            waConfig={A.waConfig} setWaConfig={A.setWaConfig}
            showToast={showToast}
          />
        )}
      </main>

      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={handleImportFile}/>

      {importChanges && (
        <ImportPreviewModal changes={importChanges}
          onConfirm={final=>applyImport(final)}
          onCancel={()=>setImportChanges(null)}/>
      )}

      {importMonthModal && (
        <Modal title="Select Target Month for Import" onClose={()=>setImportMonthModal(false)} width={420}>
          <div style={{ display:'flex', flexDirection:'column', gap:15, padding:'5px 0' }}>
            <p style={{ fontSize:13, color:'var(--t2)', margin:0 }}>
              Choose the month to apply the imported data. The salary rules (30/31-day plans) will adjust automatically.
            </p>
            
            {/* Year Selector */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 10px', background:'var(--s2)', borderRadius:8, height:40 }}>
              <button className="btn btn-sm btn-ghost btn-icon" onClick={()=>setViewYear(y=>y-1)} style={{ border:'none' }}>
                <i className="ti ti-chevron-left" style={{ fontSize:16 }}/>
              </button>
              <span style={{ fontSize:15, fontWeight:700, color:'var(--g800)' }}>{viewYear}</span>
              <button className="btn btn-sm btn-ghost btn-icon" onClick={()=>setViewYear(y=>y+1)} style={{ border:'none' }}>
                <i className="ti ti-chevron-right" style={{ fontSize:16 }}/>
              </button>
            </div>

            {/* Months Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((label, idx) => {
                const mStr = `${viewYear}-${String(idx+1).padStart(2, '0')}`;
                const isActive = selectedImportMonth === mStr;
                return (
                  <button
                    key={label}
                    onClick={() => setSelectedImportMonth(mStr)}
                    style={{
                      padding: '12px 0',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: isActive ? 'var(--g800)' : 'var(--border)',
                      background: isActive ? 'var(--g800)' : 'var(--surface)',
                      color: isActive ? '#fff' : 'var(--t1)',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.12s'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, borderTop:'1px solid var(--border)', paddingTop:12 }}>
              <span style={{ fontSize:12, color:'var(--t3)', fontWeight:500 }}>
                Selected: <span style={{ color:'var(--g800)', fontWeight:700 }}>{formatMonth(selectedImportMonth)}</span>
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-sm" onClick={()=>setImportMonthModal(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary" onClick={()=>{
                  A.setCurMonth(selectedImportMonth);
                  setImportMonthModal(false);
                  setTimeout(()=>importRef.current?.click(), 100);
                }}>
                  Proceed to Upload
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
