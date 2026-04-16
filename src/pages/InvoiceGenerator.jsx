import React, { useState, useEffect, useMemo } from 'react'
import { FileText, Plus, Trash2, Download, User, Calendar, Receipt, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateInvoice } from '../utils/ReceiptGenerator'

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 11);
};

const InvoiceGenerator = () => {
    const { adminRecord, selectedCampusId } = useAuth()
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [recordInFinance, setRecordInFinance] = useState(true)
    const [invoiceData, setInvoiceData] = useState({
        id: generateId(),
        dueDate: '',
        notes: '',
        items: [{ id: generateId(), description: '', amount: '' }]
    })

    useEffect(() => {
        fetchStudents()
    }, [adminRecord, selectedCampusId])

    const fetchStudents = async () => {
        let query = supabase.from('students').select('id, full_name, phone, course, batch')
        if (selectedCampusId && selectedCampusId !== 'all') {
            query = query.eq('campus_id', selectedCampusId)
        }
        const { data } = await query
        setStudents(data || [])
    }

    const handleAddItem = () => {
        setInvoiceData({
            ...invoiceData,
            items: [...invoiceData.items, { id: generateId(), description: '', amount: '' }]
        })
    }

    const handleRemoveItem = (id) => {
        if (invoiceData.items.length === 1) return
        setInvoiceData({
            ...invoiceData,
            items: invoiceData.items.filter(item => item.id !== id)
        })
    }

    const handleItemChange = (id, field, value) => {
        const newItems = invoiceData.items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value }
            }
            return item
        })
        setInvoiceData({ ...invoiceData, items: newItems })
    }

    const subtotal = useMemo(() => {
        return invoiceData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    }, [invoiceData.items])

    const total = subtotal

    const recordPaymentInFinance = async (finalTotal, studentId) => {
        try {
            const { error } = await supabase
                .from('payments')
                .insert([{
                    student_id: studentId,
                    amount: finalTotal,
                    method: 'Bank Transfer',
                    note: `Automated Invoice Entry: ${invoiceData.items.map(i => i.description).join(', ')} (INV-${invoiceData.id.substring(0, 8).toUpperCase()})`,
                    created_at: new Date().toISOString()
                }])

            if (error) throw error
            return true
        } catch (err) {
            console.error('Record Payment Error:', err)
            alert('Failed to record in Finance: ' + err.message)
            return false
        }
    }

    const handleGenerate = async () => {
        const studentName = selectedStudent ? selectedStudent.full_name : invoiceData.manualStudentName;

        if (!studentName) {
            alert('Please select a student or enter a name.')
            return
        }

        if (invoiceData.items.some(i => !i.description || !i.amount)) {
            alert('Please fill in all item descriptions and amounts.')
            return
        }
        
        setLoading(true)

        // Record in Finance if linked to a registered student
        if (recordInFinance && selectedStudent) {
            const success = await recordPaymentInFinance(total, selectedStudent.id)
            if (!success) {
                if (!confirm('Failed to record in Finance history. Continue generating PDF anyway?')) {
                    setLoading(false)
                    return
                }
            }
        }
        
        const finalData = {
            ...invoiceData,
            studentName: studentName,
            course: selectedStudent?.course || invoiceData.course || '',
            phone: selectedStudent?.phone || invoiceData.phone || '',
        }
        
        generateInvoice(finalData)
        setLoading(false)
    }

    return (
        <div className="invoice-gen-page">
            <div className="header-actions">
                <div>
                    <h1 className="page-title">Invoice Generator</h1>
                    <p className="page-subtitle">Create and issue professional billing documents for students</p>
                </div>
                <div className="action-btns">
                    <button className="btn btn-primary" onClick={handleGenerate}>
                        <Download size={18} />
                        Generate PDF Invoice
                    </button>
                </div>
            </div>

            <div className="invoice-layout">
                <div className="invoice-form-section">
                    {/* --- Student Information --- */}
                    <div className="card invoice-card mb-4">
                        <div className="card-header">
                            <User size={18} />
                            <h3>Client Information</h3>
                        </div>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Link to Student Registry</label>
                                <select 
                                    onChange={(e) => {
                                        const s = students.find(stud => stud.id === e.target.value)
                                        setSelectedStudent(s)
                                        if (s) {
                                            setInvoiceData(prev => ({...prev, manualStudentName: s.full_name, course: s.course}))
                                        }
                                    }}
                                    className="select-input"
                                >
                                    <option value="">Manual Entry (Unlinked)</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({s.course})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Student Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter full name"
                                    value={invoiceData.manualStudentName || ''}
                                    onChange={(e) => setInvoiceData({...invoiceData, manualStudentName: e.target.value})}
                                />
                            </div>
                            {selectedStudent && (
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={recordInFinance}
                                            onChange={(e) => setRecordInFinance(e.target.checked)}
                                        />
                                        Record in Finance History
                                    </label>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Course (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Course name"
                                    value={invoiceData.course || ''}
                                    onChange={(e) => setInvoiceData({...invoiceData, course: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Phone number"
                                    value={invoiceData.phone || ''}
                                    onChange={(e) => setInvoiceData({...invoiceData, phone: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Due Date</label>
                                <input 
                                    type="date" 
                                    value={invoiceData.dueDate}
                                    onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- Line Items --- */}
                    <div className="card invoice-card">
                        <div className="card-header">
                            <Receipt size={18} />
                            <h3>Billing Particulars</h3>
                        </div>
                        <div className="items-list">
                            <div className="items-header">
                                <span className="col-desc">Description</span>
                                <span className="col-amt">Amount (LKR)</span>
                                <span className="col-action"></span>
                            </div>
                            {invoiceData.items.map((item, idx) => (
                                <div key={item.id} className="item-row">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Course Fee, Exam Fee, etc."
                                        value={item.description}
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        className="desc-input"
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={item.amount}
                                        onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                                        className="amt-input"
                                    />
                                    <button className="delete-btn" onClick={() => handleRemoveItem(item.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <button className="add-item-btn" onClick={handleAddItem}>
                                <Plus size={16} />
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>

                <div className="invoice-summary-section">
                    <div className="card summary-card">
                        <div className="card-header border-none">
                            <DollarSign size={18} />
                            <h3>Summary</h3>
                        </div>
                        <div className="summary-details">
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <strong>Rs. {subtotal.toLocaleString()}</strong>
                            </div>
                            <div className="summary-row total-row">
                                <span>Grand Total</span>
                                <strong>Rs. {total.toLocaleString()}</strong>
                            </div>
                        </div>
                        <div className="notes-area mt-4">
                            <label>Additional Notes</label>
                            <textarea 
                                placeholder="Terms, bank details, or specific instructions..."
                                value={invoiceData.notes}
                                onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .invoice-gen-page { padding: 2rem; }
                .mb-4 { margin-bottom: 1.5rem; }
                .mt-4 { margin-top: 1.5rem; }
                
                .invoice-layout {
                    display: grid;
                    grid-template-columns: 1fr 350px;
                    gap: 1.5rem;
                    margin-top: 2rem;
                }

                .invoice-card { padding: 0; }
                .card-header {
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border-bottom: 1px solid var(--bg-main);
                }
                .card-header.border-none { border: none; }
                .card-header h3 { font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0; }
                
                .form-grid {
                    padding: 1.5rem;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                }

                .items-list { padding: 1.5rem; }
                .items-header {
                    display: grid;
                    grid-template-columns: 1fr 180px 40px;
                    gap: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--bg-main);
                    margin-bottom: 1rem;
                    font-size: 0.8rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-muted);
                }

                .item-row {
                    display: grid;
                    grid-template-columns: 1fr 180px 40px;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }

                .add-item-btn {
                    margin-top: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: none;
                    border: 1px dashed var(--primary);
                    color: var(--primary);
                    padding: 0.6rem 1.2rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .add-item-btn:hover { background: var(--primary-light); }

                .delete-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: none;
                    color: var(--error);
                    cursor: pointer;
                    opacity: 0.6;
                }
                .delete-btn:hover { opacity: 1; color: var(--error-dark); }

                .summary-card { padding: 1.5rem; position: sticky; top: 100px; }
                .summary-details { display: flex; flex-direction: column; gap: 1rem; }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9rem;
                }
                .total-row {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--bg-main);
                    font-size: 1.1rem;
                    color: var(--primary);
                }

                .discount-input { width: 120px; text-align: right; }
                
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    cursor: pointer;
                    margin-top: 1.5rem;
                }
                .checkbox-label input { width: auto; margin: 0; }
                
                textarea {
                    width: 100%;
                    height: 100px;
                    padding: 0.75rem;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    font-size: 0.85rem;
                    resize: none;
                    margin-top: 0.5rem;
                }

                input, select {
                    padding: 0.65rem 0.85rem;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    font-size: 0.9rem;
                    background: var(--bg-main);
                }
                input:focus, select:focus { border-color: var(--primary); outline: none; }
                
                @media (max-width: 1024px) {
                    .invoice-layout { grid-template-columns: 1fr; }
                    .summary-card { position: static; }
                }
            `}</style>
        </div>
    )
}

export default InvoiceGenerator
