import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, CreditCard, Receipt, Plus, Download, ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { generateReceipt } from '../utils/ReceiptGenerator'

// Fee Structure Constants
const COURSE_FEE = 90000
const FEE_BREAKDOWN = [
    { label: 'Registration Fee', amount: 20000 },
    { label: '1st Installment', amount: 25000 },
    { label: '2nd Installment', amount: 45000 },
]

const PREDEFINED_COURSES = [
    'Video Editing',
    'Graphic Design',
    'Full Stack Development',
    'Digital Marketing',
    'UI/UX Design',
    'Business Management'
]

const Finance = () => {
    const { adminRecord, selectedCampusId } = useAuth()
    const [payments, setPayments] = useState([])
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [newPayment, setNewPayment] = useState({ student_id: '', amount: '', method: 'Cash', note: '' })
    const [editingPayment, setEditingPayment] = useState(null)
    const [students, setStudents] = useState([])
    const [searchFilter, setSearchFilter] = useState('')
    const [courseFilter, setCourseFilter] = useState('All')
    const [batchFilter, setBatchFilter] = useState('All')

    useEffect(() => {
        fetchPayments()
        fetchStudents()
    }, [adminRecord, selectedCampusId])

    // Detect student_id from URL (Cross-page shortcut)
    useEffect(() => {
        const studentIdParam = searchParams.get('student_id')
        if (studentIdParam && students.length > 0) {
            const student = students.find(s => s.id === studentIdParam)
            if (student) {
                setNewPayment(prev => ({ ...prev, student_id: student.id }))
                setShowModal(true)
                
                // Clear the param from URL without refreshing
                const newParams = new URLSearchParams(searchParams)
                newParams.delete('student_id')
                setSearchParams(newParams, { replace: true })
            }
        }
    }, [searchParams, students])

    const fetchPayments = async () => {
        if (!adminRecord) return
        setLoading(true)

        let query = supabase
            .from('payments')
            .select('*, students!inner(full_name, email, phone, district, campus_id, course, batch, campuses(name))')
            .order('created_at', { ascending: false })

        // Filter by campus if applicable
        if (selectedCampusId && selectedCampusId !== 'all') {
            query = query.eq('students.campus_id', selectedCampusId)
        } else if (adminRecord.role !== 'Super Admin') {
            query = query.eq('students.campus_id', adminRecord.campus_id)
        }

        const { data } = await query
        setPayments(data || [])
        setLoading(false)
    }

    const fetchStudents = async () => {
        let query = supabase.from('students').select('id, full_name, phone, campus_id, course, batch, campuses(name)')

        if (selectedCampusId && selectedCampusId !== 'all') {
            query = query.eq('campus_id', selectedCampusId)
        } else if (adminRecord?.role !== 'Super Admin') {
            query = query.eq('campus_id', adminRecord.campus_id)
        }

        const { data } = await query
        setStudents(data || [])
    }

    // Filtered students based on course and batch
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesCourse = courseFilter === 'All' || s.course === courseFilter
            const matchesBatch = batchFilter === 'All' || s.batch === batchFilter
            return matchesCourse && matchesBatch
        }).sort((a, b) => a.full_name.localeCompare(b.full_name))
    }, [students, courseFilter, batchFilter])

    // Per-student fee status calculation
    const studentFeeStatus = useMemo(() => {
        return filteredStudents.map(student => {
            const studentPayments = payments.filter(p => p.student_id === student.id)
            const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0)
            const remaining = Math.max(0, COURSE_FEE - totalPaid)
            const percentage = Math.min(100, (totalPaid / COURSE_FEE) * 100)

            // Determine which installments are covered
            let runningPaid = totalPaid
            const installmentStatus = FEE_BREAKDOWN.map(fee => {
                if (runningPaid >= fee.amount) {
                    runningPaid -= fee.amount
                    return { ...fee, status: 'paid', paidAmount: fee.amount, remainingAmount: 0 }
                } else if (runningPaid > 0) {
                    const partial = runningPaid
                    runningPaid = 0
                    return { ...fee, status: 'partial', paidAmount: partial, remainingAmount: fee.amount - partial }
                } else {
                    return { ...fee, status: 'unpaid', paidAmount: 0, remainingAmount: fee.amount }
                }
            })

            return {
                ...student,
                totalPaid,
                remaining,
                percentage,
                installmentStatus,
                paymentCount: studentPayments.length
            }
        })
    }, [students, payments])



    const handleAddPayment = async (e) => {
        e.preventDefault()
        setLoading(true)
        const { data, error } = await supabase
            .from('payments')
            .insert([newPayment])
            .select('*, students!inner(full_name, email, phone, district, campus_id, campuses(name))')
            .single()

        if (error) {
            alert('Error saving payment: ' + error.message)
        } else {
            setShowModal(false)
            await fetchPayments()
            setNewPayment({ student_id: '', amount: '', method: 'Cash', note: '' })

            if (data) {
                // Include all payments for this student (existing + new one)
                const studentPayments = [...payments.filter(p => p.student_id === data.student_id), data]
                generateReceipt(data, studentPayments)
            }
        }
        setLoading(false)
    }

    const handleEditPayment = (payment) => {
        setEditingPayment({
            id: payment.id,
            student_id: payment.student_id,
            amount: payment.amount,
            method: payment.method,
            note: payment.note || ''
        })
        setShowEditModal(true)
    }

    const handleUpdatePayment = async (e) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase
            .from('payments')
            .update({
                amount: editingPayment.amount,
                method: editingPayment.method,
                note: editingPayment.note
            })
            .eq('id', editingPayment.id)

        if (error) {
            alert('Error updating payment: ' + error.message)
        } else {
            setShowEditModal(false)
            fetchPayments()
            setEditingPayment(null)
        }
        setLoading(false)
    }

    const handleDeletePayment = async (id) => {
        if (window.confirm('Are you sure you want to delete this payment record? This will affect the student\'s balance.')) {
            setLoading(true)
            const { error } = await supabase
                .from('payments')
                .delete()
                .eq('id', id)

            if (error) {
                alert('Error deleting payment: ' + error.message)
            } else {
                fetchPayments()
            }
            setLoading(false)
        }
    }

    const exportToCSV = () => {
        const headers = ['Date', 'Student', 'Course', 'Batch', 'Method', 'Amount']
        const rows = filteredPayments.map(p => [
            format(new Date(p.created_at), 'yyyy-MM-dd'),
            p.students?.full_name,
            p.students?.course,
            p.students?.batch,
            p.method,
            p.amount
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers, ...rows].map(e => e.join(",")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "payments_export.csv")
        document.body.appendChild(link)
        link.click()
    }

    // Filtered payments for search and filters
    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const matchesSearch = !searchFilter || p.students?.full_name?.toLowerCase().includes(searchFilter.toLowerCase())
            const matchesCourse = courseFilter === 'All' || p.students?.course === courseFilter
            const matchesBatch = batchFilter === 'All' || p.students?.batch === batchFilter
            return matchesSearch && matchesCourse && matchesBatch
        })
    }, [payments, searchFilter, courseFilter, batchFilter])

    const batchesList = useMemo(() => {
        const courseStudents = courseFilter === 'All' 
            ? students 
            : students.filter(s => s.course === courseFilter)
        const batches = [...new Set(courseStudents.map(s => s.batch).filter(Boolean))]
        return batches.sort()
    }, [students, courseFilter])

    return (
        <div className="finance-page">
            <div className="header-actions">
                <div>
                    <h1 className="page-title">Finance & Payments</h1>
                    <p className="page-subtitle">Track student invoices, fee structure & transaction history</p>
                </div>
                <div className="action-btns">
                    <button className="btn btn-outline" onClick={exportToCSV}>
                        <Download size={18} />
                        Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        {loading ? <div className="loading-spinner-sm" style={{ marginRight: '8px' }}></div> : <Plus size={20} />}
                        Record Payment
                    </button>
                </div>
            </div>
            
            <div className="utility-bar card">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search student fee status..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <div className="filter-select">
                        <label>Course</label>
                        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                            <option value="All">All Courses</option>
                            {PREDEFINED_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="filter-select">
                        <label>Batch</label>
                        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
                            <option value="All">All Batches</option>
                            {batchesList.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Fee Structure Overview ── */}
            <div className="fee-structure-card card">
                <div className="fee-structure-header">
                    <div>
                        <h3>Course Fee Structure</h3>
                        <p className="fee-subtitle">Total Course Fee: <strong>LKR {COURSE_FEE.toLocaleString()}</strong></p>
                    </div>
                </div>
                <div className="fee-breakdown-grid">
                    {FEE_BREAKDOWN.map((fee, idx) => (
                        <div key={idx} className={`fee-item fee-item-${idx}`}>
                            <div className="fee-item-step">Step {idx + 1}</div>
                            <div className="fee-item-label">{fee.label}</div>
                            <div className="fee-item-amount">LKR {fee.amount.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            </div>



            {/* ── Per-Student Fee Status ── */}
            <div className="payments-list card" style={{ marginBottom: '2.5rem' }}>
                <div className="card-header">
                    <h3>Per-Student Fee Status</h3>
                    <span className="header-badge">{courseFilter === 'All' || batchFilter === 'All' ? 0 : studentFeeStatus.length} students</span>
                </div>
                {courseFilter === 'All' || batchFilter === 'All' ? (
                    <div className="empty-selection-state">
                        <div className="empty-icon-wrap">
                            <Search size={32} />
                        </div>
                        <h3>Select Course & Batch</h3>
                        <p>Please select a specific course and batch from the filters above to view student fee statuses.</p>
                    </div>
                ) : (
                    <div className="fee-status-table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Campus</th>
                                    <th className="text-right">Total Fee</th>
                                    <th className="text-right">Paid</th>
                                    <th className="text-right">Remaining</th>
                                    <th>Registration</th>
                                    <th>1st Installment</th>
                                    <th>2nd Installment</th>
                                    
                                </tr>
                            </thead>
                            <tbody style={{ opacity: loading && studentFeeStatus.length > 0 ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                                {loading && studentFeeStatus.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-12">
                                        <div className="loading-spinner"></div>
                                        <p style={{ marginTop: '1rem', color: '#94a3b8', fontWeight: 600 }}>Syncing fee status...</p>
                                    </td></tr>
                                ) : studentFeeStatus.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center">No students found.</td></tr>
                                ) : studentFeeStatus.map(s => (
                                    <tr key={s.id}>
                                        <td><strong>{s.full_name}</strong></td>
                                        <td>{s.campuses?.name || '—'}</td>
                                        <td className="text-right">LKR {COURSE_FEE.toLocaleString()}</td>
                                        <td className="text-right"><strong className="text-success">LKR {s.totalPaid.toLocaleString()}</strong></td>
                                        <td className="text-right">
                                            <strong className={s.remaining > 0 ? 'text-warning' : 'text-success'}>
                                                {s.remaining > 0 ? `LKR ${s.remaining.toLocaleString()}` : 'Settled'}
                                            </strong>
                                        </td>
                                        {s.installmentStatus.map((inst, idx) => (
                                            <td key={idx}>
                                                <div className="installment-detail">
                                                    <div className={`inst-paid ${inst.status}`}>
                                                        <span className="inst-label">Paid:</span>
                                                        <span className="inst-value">LKR {inst.paidAmount?.toLocaleString()}</span>
                                                    </div>
                                                    <div className={`inst-remaining ${inst.remainingAmount > 0 ? 'has-balance' : 'settled'}`}>
                                                        <span className="inst-label">Due:</span>
                                                        <span className="inst-value">{inst.remainingAmount > 0 ? `LKR ${inst.remainingAmount?.toLocaleString()}` : 'Settled'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Payment History ── */}
            <div className="payments-list card">
                <div className="card-header">
                    <h3>Payment History</h3>
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Filter by student..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                        />
                    </div>
                </div>

                {courseFilter === 'All' || batchFilter === 'All' ? (
                    <div className="empty-selection-state">
                        <div className="empty-icon-wrap">
                            <Receipt size={32} />
                        </div>
                        <h3>Select Course & Batch</h3>
                        <p>Please select a specific course and batch to view payment history.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Student</th>
                                <th>Campus</th>
                                <th>Method</th>
                                <th className="text-right">Amount</th>
                                <th>Status</th>
                                <th>Receipt</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                            <tbody style={{ opacity: loading && filteredPayments.length > 0 ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                                {loading && filteredPayments.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-12">
                                        <div className="loading-spinner"></div>
                                        <p style={{ marginTop: '1rem', color: '#94a3b8', fontWeight: 600 }}>Syncing history...</p>
                                    </td></tr>
                                ) : filteredPayments.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center">No payment records found.</td></tr>
                                ) : filteredPayments.map((p) => (
                                <tr key={p.id}>
                                    <td>{format(new Date(p.created_at), 'MMM dd, yyyy HH:mm')}</td>
                                    <td><strong>{p.students?.full_name}</strong></td>
                                    <td>{p.students?.campuses?.name}</td>
                                    <td>
                                        <span className="method-tag">
                                            <CreditCard size={12} /> {p.method}
                                        </span>
                                    </td>
                                    <td className="text-right"><strong className="text-success">LKR {Number(p.amount).toFixed(2)}</strong></td>
                                    <td><span className="status-badge active">Cleared</span></td>
                                    <td>
                                        <button
                                            className="receipt-download-btn"
                                            onClick={() => generateReceipt(p, payments.filter(pay => pay.student_id === p.student_id))}
                                        >
                                            <Download size={14} />
                                            Download Receipt
                                        </button>
                                    </td>
                                    <td className="actions-cell">
                                        <div className="action-row">
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleEditPayment(p)}
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="icon-btn text-error"
                                                onClick={() => handleDeletePayment(p.id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card card">
                        <h2>Record New Payment {newPayment.student_id && `for ${students.find(s => s.id === newPayment.student_id)?.full_name}`}</h2>
                        <form onSubmit={handleAddPayment}>
                            <div className="form-group">
                                <label>Student Name</label>
                                <select
                                    value={newPayment.student_id}
                                    onChange={(e) => setNewPayment({ ...newPayment, student_id: e.target.value })}
                                    required
                                >
                                    <option value="">Choose student...</option>
                                    {filteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Amount (LKR)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Method</label>
                                    <select
                                        value={newPayment.method}
                                        onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                                    >
                                        <option>Cash</option>
                                        <option>Bank Transfer</option>
                                        <option>Card</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Note (Optional)</label>
                                <textarea
                                    value={newPayment.note}
                                    onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                                    placeholder="Payment for March tuition..."
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editingPayment && (
                <div className="modal-overlay">
                    <div className="modal-card card">
                        <h2>Edit Payment Record</h2>
                        <form onSubmit={handleUpdatePayment}>
                            <div className="form-group">
                                <label>Student</label>
                                <input
                                    type="text"
                                    value={payments.find(p => p.id === editingPayment.id)?.students?.full_name || ''}
                                    disabled
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Amount (LKR)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingPayment.amount}
                                        onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Method</label>
                                    <select
                                        value={editingPayment.method}
                                        onChange={(e) => setEditingPayment({ ...editingPayment, method: e.target.value })}
                                    >
                                        <option>Cash</option>
                                        <option>Bank Transfer</option>
                                        <option>Card</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Note (Optional)</label>
                                <textarea
                                    value={editingPayment.note}
                                    onChange={(e) => setEditingPayment({ ...editingPayment, note: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Update Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="page-footer">
                <button
                    className="btn btn-outline"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
            </div>

            <style>{`
        .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #f1f5f9;
            border-top: 3px solid #006aff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .page-footer {
          margin-top: 5rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: center;
        }
        .finance-page { animation: fadeIn 0.4s ease-out; padding: 2rem 2rem 6rem; max-width: 1400px; margin: 0 auto; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .empty-selection-state {
            padding: 5rem 2rem;
            text-align: center;
            background: #f8fafc;
        }
        .empty-icon-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #e2e8f0;
            color: #94a3b8;
            margin-bottom: 1.5rem;
        }
        .empty-selection-state h3 {
            font-size: 1.25rem;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 0.5rem;
        }
        .empty-selection-state p {
            color: #64748b;
            font-size: 0.95rem;
            max-width: 400px;
            margin: 0 auto;
            line-height: 1.5;
        }

        .header-actions {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3.5rem;
        }

        .page-title { font-size: 2.25rem; font-weight: 800; color: #1e293b; letter-spacing: -0.04em; margin-bottom: 0.25rem; }
        .page-subtitle { color: #64748b; font-size: 0.95rem; font-weight: 500; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        .action-btns { display: flex; gap: 1.5rem; }

        /* ── Fee Structure Card ── */
        .fee-structure-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            padding: 2.5rem;
            margin-bottom: 2.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .fee-structure-header {
            margin-bottom: 2rem;
        }
        .fee-structure-header h3 {
            font-size: 1.25rem;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 0.5rem;
        }
        .fee-subtitle {
            color: #64748b;
            font-size: 0.95rem;
            font-weight: 500;
        }
        .fee-subtitle strong {
            color: #0f172a;
            font-weight: 900;
            font-size: 1.1rem;
        }
        .fee-breakdown-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }
        .fee-item {
            padding: 1.75rem;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        .fee-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
        }
        .fee-item-0::before { background: linear-gradient(90deg, #006aff, #38bdf8); }
        .fee-item-1::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        .fee-item-2::before { background: linear-gradient(90deg, #10b981, #34d399); }
        .fee-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
        }
        .fee-item-step {
            font-size: 0.6875rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #94a3b8;
            margin-bottom: 0.75rem;
        }
        .fee-item-label {
            font-size: 1rem;
            font-weight: 800;
            color: #334155;
            margin-bottom: 0.5rem;
        }
        .fee-item-amount {
            font-size: 1.5rem;
            font-weight: 900;
            color: #0f172a;
        }

        /* ── Stats ── */
        .finance-summary { margin-bottom: 2.5rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
        
        .stat-card { 
            position: relative; 
            padding: 2rem; 
            border-radius: 24px; 
            border: 1px solid #e2e8f0; 
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s;
        }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08); }
        
        .stat-label { font-size: 0.8125rem; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 0.1em; margin-bottom: 0.5rem; display: block; }
        .stat-value { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-top: 0.25rem; }
        
        .stat-icon-bg {
          color: #10b981;
          position: absolute;
          right: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.08;
          width: 56px !important;
          height: 56px !important;
        }
        .stat-icon-bg.icon-warning { color: #f59e0b; }
        .stat-icon-bg.icon-success { color: #10b981; }

        /* ── Tables ── */
        .payments-list { 
            border-radius: 24px; 
            overflow: hidden; 
            border: 1px solid #e2e8f0; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            background: white;
        }

        .fee-status-table-wrap { overflow-x: auto; }

        .card-header {
            padding: 1.75rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        .card-header h3 { font-size: 1.25rem; font-weight: 800; color: #1e293b; letter-spacing: -0.01em; }

        .header-badge {
            background: #e0f2fe;
            color: #0369a1;
            padding: 0.4rem 1rem;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .search-box { position: relative; width: 300px; }
        .search-box svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-box input {
            width: 100%;
            padding: 0.875rem 1rem 0.875rem 3rem;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            font-size: 0.9375rem;
            outline: none;
            transition: all 0.2s;
        }
        .search-box input:focus { border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08); }

        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th {
            text-align: left;
            padding: 1.25rem 1rem;
            background: #f8fafc;
            color: #475569;
            font-weight: 800;
            font-size: 0.6875rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-bottom: 1px solid #e2e8f0;
            white-space: nowrap;
        }
        .data-table th.text-right { text-align: right; }

        .data-table td { padding: 1.25rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 0.9rem; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover { background-color: #fcfdfe; }

        /* ── Installment Detail Cells ── */
        .installment-detail {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            min-width: 130px;
        }
        .inst-paid, .inst-remaining {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.3rem 0.75rem;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 700;
        }
        .inst-label {
            color: #94a3b8;
            font-weight: 800;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            min-width: 30px;
        }
        .inst-value {
            font-weight: 800;
        }
        .inst-paid.paid {
            background: #f0fdf4;
        }
        .inst-paid.paid .inst-value {
            color: #16a34a;
        }
        .inst-paid.partial {
            background: #fffbeb;
        }
        .inst-paid.partial .inst-value {
            color: #d97706;
        }
        .inst-paid.unpaid {
            background: #f8fafc;
        }
        .inst-paid.unpaid .inst-value {
            color: #94a3b8;
        }
        .inst-remaining.has-balance {
            background: #fef2f2;
        }
        .inst-remaining.has-balance .inst-value {
            color: #dc2626;
        }
        .inst-remaining.settled {
            background: #f0fdf4;
        }
        .inst-remaining.settled .inst-value {
            color: #16a34a;
        }

        /* ── Progress Bar ── */
        .progress-bar-wrap {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            min-width: 120px;
        }
        .progress-bar {
            flex: 1;
            height: 8px;
            background: #f1f5f9;
            border-radius: 100px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            border-radius: 100px;
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
            transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .progress-fill.half {
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }
        .progress-fill.complete {
            background: linear-gradient(90deg, #10b981, #34d399);
        }
        .progress-label {
            font-size: 0.75rem;
            font-weight: 800;
            color: #64748b;
            min-width: 32px;
        }

        .method-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 0.5rem 0.875rem;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #475569;
        }

        .receipt-download-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #e0f2fe 0%, #f0f7ff 100%);
            border: 1px solid #bae6fd;
            border-radius: 10px;
            color: #0369a1;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
        }
        .receipt-download-btn:hover {
            background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
            color: white;
            border-color: #0ea5e9;
            transform: translateY(-2px);
            box-shadow: 0 6px 15px -3px rgba(14, 165, 233, 0.35);
        }

        .status-badge {
            padding: 0.4rem 1rem;
            background: #dcfce7;
            color: #166534;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .text-success { color: #10b981; }
        .text-warning { color: #f59e0b; }
        .text-right { text-align: right; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-card {
          width: 100%;
          max-width: 550px;
          padding: 3.5rem;
          background: white;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        }

        .modal-card h2 { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 2.5rem; letter-spacing: -0.02em; }

        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-weight: 800; margin-bottom: 0.75rem; color: #475569; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 3rem;
        }

        input, select, textarea {
            width: 100%;
            padding: 1rem 1.25rem;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.2s;
            outline: none;
        }
        input:focus, select:focus, textarea:focus { border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }
        
        textarea { min-height: 100px; resize: vertical; }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            padding: 1rem 2rem;
            border-radius: 14px;
            font-weight: 800;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: none;
            font-size: 1rem;
        }
        .btn-primary { background: #10b981; color: white; }
        .btn-primary:hover { background: #059669; transform: translateY(-3px); box-shadow: 0 15px 25px -5px rgba(16, 185, 129, 0.4); }
        .btn-outline { background: white; color: #475569; border: 1px solid #cbd5e1; }
        .btn-outline:hover { background: #f8fafc; border-color: #10b981; color: #10b981; transform: translateY(-2px); }
        .btn-sm { padding: 0.75rem 1.25rem; font-size: 0.875rem; border-radius: 10px; }

        .text-center { text-align: center; padding: 5rem; color: #64748b; font-weight: 600; font-size: 1.125rem; }

        .actions-cell { text-align: right; }
        .action-row { display: flex; gap: 0.75rem; justify-content: flex-end; }
        .icon-btn {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .icon-btn:hover { background: #f1f5f9; color: #006aff; }
        .icon-btn.text-error:hover { background: #fef2f2; color: #ef4444; }
        .text-error { color: #ef4444; }

        .utility-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
            margin-bottom: 2rem;
            padding: 1.25rem 1.75rem;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
        }

        .filter-group {
            display: flex;
            gap: 1.5rem;
            align-items: center;
        }

        .filter-select {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .filter-select label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
        }

        .filter-select select {
            padding: 0.5rem 2rem 0.5rem 0.75rem;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background-color: white;
            font-size: 0.875rem;
            font-weight: 600;
            color: #1e293b;
            min-width: 160px;
        }

        @media (max-width: 768px) {
            .utility-bar {
                flex-direction: column;
                align-items: stretch;
            }
            .filter-group {
                flex-direction: column;
            }
        }

        .loading-spinner-sm {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
      `}</style>
        </div>
    )
}

export default Finance
