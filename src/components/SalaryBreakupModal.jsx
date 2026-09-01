import { Modal } from './UI.jsx';
import { formatMonth, inr } from '../utils/helpers.js';

export default function SalaryBreakupModal({ staff, sal, curMonth, onClose }) {
  const baseSalary = Number(staff.salary || 0);
  const totalDays = Number(sal.paidDays + sal.daysAbsent + sal.daysUL); // total month days roughly
  
  // Custom plan details
  const calendarDays = sal.allWorkDays + sal.stdWeekoffs;
  const planLabel = `${calendarDays}-Day Plan (${sal.allWorkDays} Workdays, ${sal.stdWeekoffs} Weekoffs)`;
  
  return (
    <Modal title="Salary Breakup & Calculations" onClose={onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'var(--font)' }}>
        
        {/* Payslip Header Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--g800)' }}>{staff.name}</h4>
            <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0 }}>ID: {staff.id} | {staff.designation || 'Staff'}</p>
            <p style={{ fontSize: 12, color: 'var(--t3)', margin: '2px 0 0 0' }}>Branch: {staff.branch || '—'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 99, background: 'var(--g50)', color: 'var(--g800)', fontWeight: 600 }}>
              {formatMonth(curMonth)}
            </span>
            <p style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600, margin: '8px 0 0 0' }}>Base: {inr(baseSalary)}</p>
          </div>
        </div>

        {/* Plan & Calculations Breakdown */}
        <div style={{ padding: 12, background: 'var(--s2)', borderRadius: 8, fontSize: 12, color: 'var(--t2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontWeight: 600, color: 'var(--t1)', margin: '0 0 4px 0' }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }}/> Salary Plan Details
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Plan Applied:</span>
            <span style={{ fontWeight: 600 }}>{sal.allWorkDays} Workdays & {sal.stdWeekoffs} Weekoffs Plan</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Daily Rate Calculation:</span>
            <span style={{ fontWeight: 600 }}>{inr(baseSalary)} ÷ {sal.divisor || 30} days = {inr(sal.dailyRate)}/day</span>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

          <p style={{ fontWeight: 600, color: 'var(--t1)', margin: '4px 0 2px 0' }}>Attendance Summary</p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Workdays Attended (Present + PL + Hol):</span>
            <span>{sal.workDays} days</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Standard Paid Weekoffs:</span>
            <span>{sal.paidWeekoffs} days</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Extra Weekoffs Worked:</span>
            <span style={{ color: 'var(--g800)', fontWeight: 600 }}>+{sal.weekoffsWorked} days</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Days Absent (A / UL):</span>
            <span style={{ color: 'var(--r600)', fontWeight: 500 }}>{sal.daysAbsent} Absent, {sal.daysUL} Unpaid Leave</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

          {/* Rules Explanation */}
          <div style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px dashed var(--border)' }}>
            <p style={{ fontWeight: 600, color: 'var(--g800)', margin: '0 0 4px 0', fontSize: 11 }}>Rules Applied:</p>
            <p style={{ fontSize: 11, color: 'var(--t3)', margin: 0, lineHeight: 1.45 }}>
              <span>
                Standard Month = {sal.allWorkDays} Workdays + {sal.stdWeekoffs} Weekoffs. Employee must work &gt; 16 days for full weekoff salary.
                <br />
                <strong>Paid Days Formula:</strong> Workdays ({sal.workDays}) + Paid Weekoffs ({sal.paidWeekoffs}) + Extra Weekoffs Worked ({sal.weekoffsWorked}) = <strong>{sal.paidDays} Paid Days</strong>.
              </span>
            </p>
          </div>
        </div>

        {/* Earnings vs Deductions Split Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h5 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--t1)' }}>Salary Breakup Table</h5>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', fontWeight: 600, color: 'var(--t3)' }}>
                <th style={{ padding: '6px 0' }}>Description</th>
                <th style={{ padding: '6px 0', textAlign: 'right' }}>Earnings</th>
                <th style={{ padding: '6px 0', textAlign: 'right' }}>Deductions</th>
              </tr>
            </thead>
            <tbody>
              {/* Gross Base Salary Prorated */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0' }}>
                  Base Salary Prorated
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{sal.paidDays} Paid Days &times; {inr(sal.dailyRate)}/day</div>
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--t1)' }}>{inr(sal.tillDateSalary)}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--t3)' }}>—</td>
              </tr>
              {/* Commissions */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0' }}>Commission Earned</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: '#1a6b35', fontWeight: 500 }}>
                  {sal.commEarned > 0 ? `+${inr(sal.commEarned)}` : '—'}
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--t3)' }}>—</td>
              </tr>
              {/* Fixed cutting (savings) */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0' }}>Fixed Cutting (Savings)</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--t3)' }}>—</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--r600)' }}>
                  {sal.fixedCut > 0 ? `-${inr(sal.fixedCut)}` : '—'}
                </td>
              </tr>
              {/* Advance cuts */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0' }}>Salary Advance Cut</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--t3)' }}>—</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--r600)' }}>
                  {sal.advanceCut > 0 ? `-${inr(sal.advanceCut)}` : '—'}
                </td>
              </tr>
              {/* Loan EMI cut */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 0' }}>Loan Recovery (EMI)</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--t3)' }}>—</td>
                <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--r600)' }}>
                  {sal.loanCut > 0 ? `-${inr(sal.loanCut)}` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Summary Block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--g50)', border: '1px solid var(--g100)', padding: '14px 18px', borderRadius: 10, marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--g800)' }}>Total Net Payable:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--g800)' }}>{inr(sal.netPayable)}</span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--t3)', margin: 0, textAlign: 'right', lineHeight: 1.4 }}>
            Formula: Prorated Base ({inr(sal.tillDateSalary)}) + Commission ({inr(sal.commEarned)}) <br />
            &minus; Fixed Cutting ({inr(sal.fixedCut)}) &minus; Advance ({inr(sal.advanceCut)}) &minus; Loan EMI ({inr(sal.loanCut)})
          </p>
        </div>

      </div>
    </Modal>
  );
}
