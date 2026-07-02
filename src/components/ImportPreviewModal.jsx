import { useState } from 'react';
import { Modal } from './UI.jsx';
import { inr } from '../utils/helpers.js';

const MERGE_ELIGIBLE = ['advance','extraAdvance','totalSavings'];
const NUMERIC = ['salary','fixedCutting','advance','extraAdvance','monthlyRecovery','totalOutstanding','totalSavings'];
const LABELS = {
  name:'Name', designation:'Designation', branch:'Branch', aadhar:'Aadhar',
  phone:'Phone', altPhone:'Alt Phone', dob:'DOB', salary:'Salary',
  fixedCutting:'Fixed Cutting', advance:'Advance', extraAdvance:'Extra Advance',
  monthlyRecovery:'Monthly Recovery', totalOutstanding:'Total Outstanding', totalSavings:'Total Savings',
};

function fmt(field, val) {
  if (val === undefined || val === null || val === '') return '—';
  return NUMERIC.includes(field) ? inr(val) : String(val);
}

export default function ImportPreviewModal({ changes, onConfirm, onCancel }) {
  const [checked, setChecked] = useState(() => {
    const initChecked = {};
    changes.forEach((c, idx) => {
      if (c.type === 'add') {
        initChecked[`${c.id}-${idx}|__add__`] = true;
      } else if (c.type === 'delete') {
        initChecked[`${c.id}-${idx}|__delete__`] = true;
      } else {
        (c.diffs || []).forEach(d => {
          const key = `${c.id}-${idx}|${d.field}`;
          initChecked[key] = true;
        });
      }
    });
    return initChecked;
  });

  const [mergeMode, setMergeMode] = useState(() => {
    const initMerge = {};
    changes.forEach((c, idx) => {
      if (c.type === 'update') {
        (c.diffs || []).forEach(d => {
          const key = `${c.id}-${idx}|${d.field}`;
          if (MERGE_ELIGIBLE.includes(d.field)) initMerge[key] = 'merge';
        });
      }
    });
    return initMerge;
  });

  function toggleCheck(key) {
    setChecked(p => ({ ...p, [key]: !p[key] }));
  }
  function toggleMerge(key) {
    setMergeMode(p => ({ ...p, [key]: p[key] === 'merge' ? 'replace' : 'merge' }));
  }
  function toggleAll(c, idx) {
    const newChecked = { ...checked };
    if (c.type === 'add') {
      const addKey = `${c.id}-${idx}|__add__`;
      newChecked[addKey] = !checked[addKey];
    } else if (c.type === 'delete') {
      const delKey = `${c.id}-${idx}|__delete__`;
      newChecked[delKey] = !checked[delKey];
    } else {
      const keys = (c.diffs||[]).map(d => `${c.id}-${idx}|${d.field}`);
      const allOn = keys.every(k => checked[k]);
      keys.forEach(k => { newChecked[k] = !allOn; });
    }
    setChecked(newChecked);
  }

  function checkAll(val) {
    const newChecked = {};
    changes.forEach((c, idx) => {
      if (c.type === 'add') {
        newChecked[`${c.id}-${idx}|__add__`] = val;
      } else if (c.type === 'delete') {
        newChecked[`${c.id}-${idx}|__delete__`] = val;
      } else {
        (c.diffs || []).forEach(d => {
          newChecked[`${c.id}-${idx}|${d.field}`] = val;
        });
      }
    });
    setChecked(newChecked);
  }

  // Count selected
  const selectedCount = changes.reduce((acc, c, idx) => {
    if (c.type === 'add') return acc + (checked[`${c.id}-${idx}|__add__`] ? 1 : 0);
    if (c.type === 'delete') return acc + (checked[`${c.id}-${idx}|__delete__`] ? 1 : 0);
    return acc + (c.diffs||[]).filter(d => checked[`${c.id}-${idx}|${d.field}`]).length;
  }, 0);

  const updated = changes.filter(c => c.type === 'update');
  const added   = changes.filter(c => c.type === 'add');
  const deleted = changes.filter(c => c.type === 'delete');

  // Build final changes to pass up
  function buildFinal() {
    return changes.map((c, idx) => {
      if (c.type === 'add') {
        return checked[`${c.id}-${idx}|__add__`] ? c : null;
      }
      if (c.type === 'delete') {
        return checked[`${c.id}-${idx}|__delete__`] ? c : null;
      }
      const filteredDiffs = (c.diffs||[])
        .filter(d => checked[`${c.id}-${idx}|${d.field}`])
        .map(d => {
          const key = `${c.id}-${idx}|${d.field}`;
          const mode = mergeMode[key] || 'replace';
          const finalVal = (MERGE_ELIGIBLE.includes(d.field) && mode === 'merge')
            ? (Number(d.old)||0) + (Number(d.importedVal)||0)
            : d.importedVal;
          return { ...d, new: finalVal, mode };
        });
      if (!filteredDiffs.length) return null;
      return { ...c, diffs: filteredDiffs };
    }).filter(Boolean);
  }

  return (
    <Modal title="Import Preview — Review Changes" onClose={onCancel} width={700}>
      {/* Summary */}
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {[
          ['ti-refresh', 'Updates',   updated.length, 'var(--b100)', 'var(--b600)'],
          ['ti-plus',    'New Staff',  added.length,  '#d4edda',    '#1a6b35'],
          ['ti-trash',   'Removed',    deleted.length,'var(--r100)', 'var(--r600)'],
        ].map(([ic,lb,ct,bg,col]) => (
          <div key={lb} style={{ flex:1, padding:'10px 14px', background:bg, borderRadius:9, display:'flex', alignItems:'center', gap:10 }}>
            <i className={`ti ${ic}`} style={{ fontSize:18, color:col }}/>
            <div>
              <p style={{ fontSize:11, color:col, fontWeight:500 }}>{lb}</p>
              <p style={{ fontSize:20, fontWeight:700, color:col }}>{ct}</p>
            </div>
          </div>
        ))}
        <div style={{ flex:1, padding:'10px 14px', background:'var(--a100)', borderRadius:9, display:'flex', alignItems:'center', gap:10 }}>
          <i className="ti ti-checkbox" style={{ fontSize:18, color:'var(--a600)' }}/>
          <div>
            <p style={{ fontSize:11, color:'var(--a600)', fontWeight:500 }}>Selected Changes</p>
            <p style={{ fontSize:20, fontWeight:700, color:'var(--a600)' }}>{selectedCount}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:10, padding:'8px 12px', background:'var(--s2)', borderRadius:8, fontSize:11, color:'var(--t3)' }}>
        <span><i className="ti ti-checkbox" style={{ marginRight:4, color:'var(--g800)' }}/>Check/uncheck to include or skip each field</span>
        <span><span style={{ fontWeight:600, color:'var(--b600)' }}>MERGE</span> = old + new &nbsp;|&nbsp; <span style={{ fontWeight:600, color:'var(--a600)' }}>REPLACE</span> = overwrite with new value</span>
      </div>

      {/* Check/Uncheck All toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:12, paddingLeft:4 }}>
        <button className="btn btn-xs btn-primary" onClick={() => checkAll(true)}>
          <i className="ti ti-checkbox" style={{ marginRight:3 }}/>Select All Changes
        </button>
        <button className="btn btn-xs" onClick={() => checkAll(false)}>
          <i className="ti ti-square" style={{ marginRight:3 }}/>Deselect All Changes
        </button>
      </div>

      {/* Change cards */}
      <div style={{ maxHeight:420, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
        {changes.map((c, i) => {
          const isAdd = c.type === 'add';
          const isDel = c.type === 'delete';
          const addKey = `${c.id}-${i}|__add__`;
          const delKey = `${c.id}-${i}|__delete__`;
          const allFieldKeys = isAdd ? [addKey] : isDel ? [delKey] : (c.diffs||[]).map(d=>`${c.id}-${i}|${d.field}`);
          const allChecked = allFieldKeys.every(k => checked[k]);
          const someChecked = allFieldKeys.some(k => checked[k]);

          return (
            <div key={`${c.id}-${c.type}-${i}`} style={{ border:'1px solid var(--border)', borderRadius:10 }}>
              {/* Card header */}
              <div style={{
                padding:'9px 14px',
                background: isAdd ? '#d4edda' : isDel ? 'var(--r100)' : 'var(--s2)',
                display:'flex', alignItems:'center', gap:8
              }}>
                {/* Select-all checkbox for this employee */}
                <input type="checkbox"
                  checked={allChecked}
                  ref={el => { if(el) el.indeterminate = !allChecked && someChecked; }}
                  onChange={() => toggleAll(c, i)}
                  style={{ width:14, height:14, cursor:'pointer', accentColor: isDel ? 'var(--r600)' : 'var(--g800)', flexShrink:0 }}
                />
                <i className={`ti ${isAdd ? 'ti-user-plus' : isDel ? 'ti-user-minus' : 'ti-edit'}`}
                  style={{ fontSize:13, color: isAdd ? '#1a6b35' : isDel ? 'var(--r600)' : 'var(--b600)' }}/>
                <span style={{ fontWeight:600, fontSize:13 }}>{c.name}</span>
                <span style={{ fontSize:11, color:'var(--t3)' }}>ID: {c.id}</span>
                <span style={{
                  marginLeft:'auto', fontSize:11, padding:'1px 8px', borderRadius:99,
                  background: isAdd ? '#1a6b35' : isDel ? 'var(--r600)' : 'var(--b600)',
                  color:'#fff', fontWeight:600
                }}>
                  {isAdd ? 'NEW' : isDel ? 'REMOVE' : 'UPDATE'}
                </span>
              </div>

              {/* Field rows */}
              {!isAdd && !isDel && c.diffs && c.diffs.length > 0 && (
                <div style={{ padding:'4px 14px' }}>
                  {c.diffs.map((d, j) => {
                    const key       = `${c.id}-${i}|${d.field}`;
                    const isOn      = checked[key];
                    const isMerge   = MERGE_ELIGIBLE.includes(d.field);
                    const mode      = mergeMode[key] || 'replace';
                    const previewVal = isMerge && mode === 'merge'
                      ? (Number(d.old)||0) + (Number(d.importedVal)||0)
                      : d.importedVal;

                    return (
                      <div key={j} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'9px 0',
                        borderBottom: j < c.diffs.length-1 ? '1px solid var(--border)' : 'none',
                        opacity: isOn ? 1 : 0.4,
                        transition:'opacity .15s',
                      }}>
                        {/* Field checkbox */}
                        <input type="checkbox" checked={isOn} onChange={() => toggleCheck(key)}
                          style={{ width:14, height:14, cursor:'pointer', accentColor:'var(--g800)', flexShrink:0 }}/>

                        {/* Field label */}
                        <span style={{ fontSize:12, color:'var(--t3)', width:110, flexShrink:0 }}>
                          {LABELS[d.field] || d.field}
                        </span>

                        {/* Old value */}
                        <span style={{ fontSize:12, color:'var(--r600)', textDecoration:'line-through', minWidth:80 }}>
                          {fmt(d.field, d.old)}
                        </span>

                        <i className="ti ti-arrow-right" style={{ fontSize:11, color:'var(--t3)', flexShrink:0 }}/>

                        {/* New/preview value */}
                        <span style={{ fontSize:12, color:'#1a6b35', fontWeight:600, minWidth:80 }}>
                          {fmt(d.field, previewVal ?? d.new)}
                        </span>

                        {/* Merge / Replace toggle for financial fields */}
                        {isMerge && isOn && (
                          <div style={{ marginLeft:'auto', display:'flex', gap:0, borderRadius:6, overflow:'hidden', border:'1px solid var(--border)', flexShrink:0 }}>
                            <button
                              onClick={() => setMergeMode(p=>({...p,[key]:'merge'}))}
                              style={{
                                padding:'3px 10px', border:'none', cursor:'pointer', fontSize:11, fontWeight:600,
                                background: mode==='merge' ? 'var(--b600)' : 'var(--surface)',
                                color: mode==='merge' ? '#fff' : 'var(--t3)',
                                transition:'all .12s',
                              }}
                              title={`Merge: ${fmt(d.field,d.old)} + ${fmt(d.field,d.importedVal)} = ${fmt(d.field,(Number(d.old)||0)+(Number(d.importedVal)||0))}`}
                            >
                              <i className="ti ti-plus" style={{ fontSize:10, marginRight:3 }}/>Merge
                            </button>
                            <button
                              onClick={() => setMergeMode(p=>({...p,[key]:'replace'}))}
                              style={{
                                padding:'3px 10px', border:'none', cursor:'pointer', fontSize:11, fontWeight:600,
                                background: mode==='replace' ? 'var(--a600)' : 'var(--surface)',
                                color: mode==='replace' ? '#fff' : 'var(--t3)',
                                transition:'all .12s',
                              }}
                              title={`Replace: set to ${fmt(d.field,d.importedVal)}`}
                            >
                              <i className="ti ti-replace" style={{ fontSize:10, marginRight:3 }}/>Replace
                            </button>
                          </div>
                        )}

                        {/* Non-financial imported label */}
                        {!isMerge && (
                          <span style={{ marginLeft:'auto', fontSize:10, padding:'1px 7px', borderRadius:99, background:'var(--s2)', color:'var(--t3)', flexShrink:0 }}>
                            OVERWRITE
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New staff row */}
              {isAdd && (
                <div style={{ padding:'9px 14px 10px', fontSize:12, color:'var(--t3)' }}>
                  <input type="checkbox" checked={checked[addKey]} onChange={()=>toggleCheck(addKey)}
                    style={{ width:14, height:14, cursor:'pointer', accentColor:'var(--g800)', marginRight:8 }}/>
                  Include this new staff member in import
                </div>
              )}

              {/* Delete staff row */}
              {isDel && (
                <div style={{ padding:'9px 14px 10px', fontSize:12, color:'var(--t2)', background:'var(--r50)', borderTop:'1px solid var(--border)' }}>
                  <input type="checkbox" checked={checked[delKey]} onChange={()=>toggleCheck(delKey)}
                    style={{ width:14, height:14, cursor:'pointer', accentColor:'var(--r600)', marginRight:8 }}/>
                  Confirm removing this staff member (not in Excel file)
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="divider"/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ fontSize:12, color:'var(--t3)' }}>
          <i className="ti ti-info-circle" style={{ marginRight:4 }}/>
          {selectedCount} change{selectedCount!==1?'s':''} selected — unchecked fields will be skipped.
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={() => onConfirm(buildFinal())} disabled={selectedCount===0}>
            <i className="ti ti-check"/> Apply {selectedCount} Change{selectedCount!==1?'s':''}
          </button>
        </div>
      </div>
    </Modal>
  );
}
