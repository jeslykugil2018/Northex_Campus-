import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Mail, Phone, Edit2, Trash2, ChevronRight, Download, Users, Landmark, DollarSign, ArrowLeft, Check, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PREDEFINED_COURSES = [
  'Video Editing',
  'Graphic Design',
  'Full Stack Development',
  'Digital Marketing',
  'UI/UX Design',
  'Business Management'
]

const ITEMS_PER_PAGE = 10

const Students = () => {
  const { adminRecord, selectedCampusId } = useAuth()
  const [students, setStudents] = useState([])
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)

  // filtering & pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [districtFilter, setDistrictFilter] = useState('All')
  const [courseFilter, setCourseFilter] = useState('All')
  const [batchFilter, setBatchFilter] = useState('All')
  const [viewMode, setViewMode] = useState('registry')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    district: '',
    age: '',
    campus_id: '',
    course: '',
    batch: '',
    total_payment: 0
  })

  const isSuperAdmin = adminRecord?.role === 'Super Admin'

  useEffect(() => {
    if (adminRecord) {
      fetchData()
    }
  }, [adminRecord, selectedCampusId])

  const fetchData = async () => {
    setLoading(true)

    let studentQuery = supabase.from('students').select('*, campuses(name)')

    if (selectedCampusId && selectedCampusId !== 'all') {
      studentQuery = studentQuery.eq('campus_id', selectedCampusId)
    } else if (adminRecord?.role !== 'Super Admin') {
      studentQuery = studentQuery.eq('campus_id', adminRecord?.campus_id)
    }

    const [studentsRes, paymentsRes, campusesRes] = await Promise.all([
      studentQuery.order('created_at', { ascending: false }),
      supabase.from('payments').select('*'),
      supabase.from('campuses').select('*')
    ])

    setStudents(studentsRes.data || [])
    setPayments(paymentsRes.data || [])
    setCampuses(campusesRes.data || [])
    setLoading(false)
  }

  // Derived data: calculate paid and outstanding per student
  const studentsWithPayments = useMemo(() => {
    return students.map(student => {
      const studentPayments = payments.filter(p => p.student_id === student.id)
      const paid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const total = Number(student.total_payment || 0)
      return {
        ...student,
        paid,
        outstanding: Math.max(0, total - paid)
      }
    })
  }, [students, payments])

  // Group by Course and Batch for Explorer
  const batchStats = useMemo(() => {
    const groups = {}
    studentsWithPayments.forEach(s => {
      if (!s.course) return
      const key = `${s.course}-${s.batch || 'Unassigned'}`
      if (!groups[key]) {
        groups[key] = {
          course: s.course,
          batch: s.batch || 'Unassigned',
          count: 0,
          total: 0,
          paid: 0,
          outstanding: 0,
          campus: s.campuses?.name
        }
      }
      groups[key].count++
      groups[key].total += Number(s.total_payment || 0)
      groups[key].paid += Number(s.paid || 0)
      groups[key].outstanding += Number(s.outstanding || 0)
    })
    return Object.values(groups).sort((a, b) => a.course.localeCompare(b.course))
  }, [studentsWithPayments])

  const filteredStudents = useMemo(() => {
    return studentsWithPayments.filter(s => {
      const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDistrict = districtFilter === 'All' || s.district === districtFilter
      const matchesCourse = courseFilter === 'All' || s.course === courseFilter
      const matchesBatch = batchFilter === 'All' || s.batch === batchFilter
      return matchesSearch && matchesDistrict && matchesCourse && matchesBatch
    })
  }, [studentsWithPayments, searchTerm, districtFilter, courseFilter, batchFilter])

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredStudents, currentPage])

  const districts = ['All', ...new Set(students.map(s => s.district).filter(Boolean))]
  const courses = ['All', ...PREDEFINED_COURSES]
  const batchesList = ['All', 'Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5']


  const handleOpenModal = (student = null) => {
    if (student) {
      setEditingStudent(student)
      setFormData({
        full_name: student.full_name,
        email: student.email || '',
        phone: student.phone || '',
        district: student.district || '',
        age: student.age || '',
        campus_id: student.campus_id,
        course: student.course || '',
        batch: student.batch || '',
        total_payment: student.total_payment || 0
      })
    } else {
      setEditingStudent(null)
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        district: '',
        age: '',
        campus_id: adminRecord?.campus_id || '',
        course: '',
        batch: '',
        total_payment: 0
      })
    }
    setShowModal(true)
  }

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    setShowViewModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : null,
      total_payment: parseFloat(formData.total_payment)
    }

    let error
    if (editingStudent) {
      const { error: err } = await supabase
        .from('students')
        .update(payload)
        .eq('id', editingStudent.id)
      error = err
    } else {
      const { error: err } = await supabase
        .from('students')
        .insert([payload])
      error = err
    }

    if (error) {
      alert('Error saving student: ' + error.message)
    } else {
      setShowModal(false)
      await fetchData() // Await data fetch to prevent blank screen flicker
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student record? This action cannot be undone.')) {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) alert(error.message)
      else fetchData()
    }
  }


  const exportToCSV = () => {
    const headers = ['Full Name', 'Email', 'Phone', 'District', 'Age', 'Total', 'Paid', 'Outstanding']
    const rows = filteredStudents.map(s => [
      s.full_name, s.email, s.phone, s.district, s.age, s.total_payment, s.paid, s.outstanding
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n")
    const link = document.createElement("a")
    link.href = encodeURI(csvContent)
    link.download = "students_data.csv"
    link.click()
  }


  return (
    <div className="students-page">
      <div className="header-actions">
        <div>
          <h1 className="page-title">Student Management</h1>
        </div>
        <div className="top-action-bar">
          <button className="btn btn-outline" onClick={exportToCSV} title="Export to CSV">
            <Download size={18} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} /> Enroll Student
          </button>
        </div>
      </div>



      <div className="utility-bar card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="utility-actions">
          <div className="filter-group">
            <Filter size={16} />
            <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Courses</option>
              {courses.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Filter size={16} />
            <select value={batchFilter} onChange={(e) => { setBatchFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Batches</option>
              {batchesList.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Filter size={16} />
            <select value={districtFilter} onChange={(e) => { setDistrictFilter(e.target.value); setCurrentPage(1); }}>
              <option value="All">All Districts</option>
              {districts.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="view-content-area">
        <div className="students-list-view card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Contact Info</th>
                  <th>District</th>
                  <th>Enrollment</th>
                  <th className="text-right">Outstanding (LKR)</th>
                  <th className="actions-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-8">
                    <div className="loading-spinner"></div>
                    <p style={{ marginTop: '1rem', color: '#94a3b8', fontWeight: 600 }}>Syncing registry...</p>
                  </td></tr>
                ) : paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div className="student-name-cell" onClick={() => handleViewProfile(student)} style={{ cursor: 'pointer' }}>
                          <div className="avatar">{student.full_name.charAt(0)}</div>
                          <div className="name-wrap">
                            <span className="name-text">{student.full_name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <span className="info-item"><Mail size={12} /> {student.email || 'N/A'}</span>
                          <span className="info-item"><Phone size={12} /> {student.phone || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{student.district}</td>
                      <td>
                        <div className="enrollment-info">
                          <span className="course">{student.course}</span>
                          <span className="batch">{student.batch}</span>
                        </div>
                      </td>
                      <td className="text-right font-mono text-error">
                        <span className={`status-pill ${student.outstanding > 0 ? 'warning' : 'success'}`}>
                          {student.outstanding > 0 ? `LKR ${student.outstanding.toLocaleString()}` : 'Fully Paid'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <div className="action-row">
                          <button className="icon-btn" onClick={() => navigate(`/finance?student_id=${student.id}`)} title="Record Payment"><DollarSign size={16} /></button>
                          <button className="icon-btn" onClick={() => handleOpenModal(student)} title="Edit"><Edit2 size={16} /></button>
                          <button className="icon-btn text-error" onClick={() => handleDelete(student.id)} title="Delete"><Trash2 size={16} /></button>
                          <button className="icon-btn" onClick={() => handleViewProfile(student)} title="View Detail"><ChevronRight size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="text-center">No students found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >Previous</button>
              <span className="page-info">Page {currentPage} of {totalPages}</span>
              <button
                className="btn btn-sm btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >Next</button>
            </div>
          )}
        </div>
      </div>

      <div className="page-footer-actions">
        <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card card">
            <h2>{editingStudent ? 'Modify Student Record' : 'Enroll New Student'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Course Name</label>
                  <select
                    value={formData.course}
                    onChange={e => setFormData({ ...formData, course: e.target.value })}
                    required
                  >
                    <option value="">Select Course</option>
                    {PREDEFINED_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Batch No.</label>
                  <select
                    value={formData.batch}
                    onChange={e => setFormData({ ...formData, batch: e.target.value })}
                    required
                  >
                    <option value="">Select Batch</option>
                    <option value="Batch 1">Batch 1</option>
                    <option value="Batch 2">Batch 2</option>
                    <option value="Batch 3">Batch 3</option>
                    <option value="Batch 4">Batch 4</option>
                    <option value="Batch 5">Batch 5</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assigned Campus</label>
                  <select
                    value={formData.campus_id}
                    onChange={e => setFormData({ ...formData, campus_id: e.target.value })}
                    disabled={!isSuperAdmin && editingStudent}
                    required
                  >
                    <option value="">Select Campus</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Total Tuition (LKR)</label>
                  <input
                    type="number"
                    value={formData.total_payment}
                    onChange={e => setFormData({ ...formData, total_payment: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : (editingStudent ? 'Update Student' : 'Enroll Student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )
      }

      {showViewModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-card card profile-modal dashboard-style">
            <div className="profile-banner"></div>
            <div className="profile-header-dashboard">
              <div className="avatar-overlap">{selectedStudent.full_name.charAt(0)}</div>
              <div className="header-info">
                <div className="title-row">
                  <h2>{selectedStudent.full_name}</h2>
                  <div className="profile-badges">
                    <span className="badge campus">{selectedStudent.campuses?.name} Campus</span>
                    <span className="badge course">{selectedStudent.course}</span>
                  </div>
                </div>
                <div className="header-meta">
                  <span><Users size={14} /> {selectedStudent.batch}</span>
                  <span><Mail size={14} /> {selectedStudent.email || 'No Email'}</span>
                </div>
              </div>
            </div>

            <div className="profile-dashboard-grid">
              <div className="stats-row">
                <div className="stat-card">
                  <Landmark size={20} />
                  <div className="stat-info">
                    <label>Total Tuition</label>
                    <span className="amount">LKR {selectedStudent.total_payment?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stat-card success">
                  <Check size={20} />
                  <div className="stat-info">
                    <label>Paid Amount</label>
                    <span className="amount">LKR {selectedStudent.paid?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stat-card warning">
                  <DollarSign size={20} />
                  <div className="stat-info">
                    <label>Outstanding</label>
                    <span className="amount">LKR {selectedStudent.outstanding?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-content">
                <div className="content-left">
                  <div className="profile-section-card">
                    <h3><Users size={16} /> Contact Details</h3>
                    <div className="profile-info-grid">
                      <div className="info-box">
                        <label>Phone Number</label>
                        <p>{selectedStudent.phone || 'N/A'}</p>
                      </div>
                      <div className="info-box">
                        <label>Email Address</label>
                        <p>{selectedStudent.email || 'N/A'}</p>
                      </div>
                      <div className="info-box">
                        <label>District</label>
                        <p>{selectedStudent.district || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="content-right">
                  <div className="profile-section-card">
                    <h3><CreditCard size={16} /> Payment History</h3>
                    <div className="payment-history-mini">
                      {payments.filter(p => p.student_id === selectedStudent.id).length > 0 ? (
                        <div className="mini-table-container">
                          <table className="mini-table-v2">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th className="text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments.filter(p => p.student_id === selectedStudent.id)
                                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                .slice(0, 5) // Show last 5
                                .map(p => (
                                  <tr key={p.id}>
                                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                    <td className="text-right">LKR {Number(p.amount).toLocaleString()}</td>
                                  </tr>
                                ))
                              }
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="no-history">No transactions yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-footer">
              <button className="btn btn-primary" onClick={() => setShowViewModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        .students-page { animation: fadeIn 0.4s ease-out; padding: 2rem 2rem 6rem; max-width: 1400px; margin: 0 auto; position: relative; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f1f5f9;
          border-top: 4px solid #006aff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3.5rem;
        }

        .top-action-bar {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .utility-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          margin-bottom: 2rem;
          gap: 2rem;
        }

        .utility-actions { display: flex; align-items: center; gap: 1.5rem; }

        .search-box { flex: 1; position: relative; max-width: 400px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          outline: none;
          transition: all 0.2s;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .search-box input:focus { border-color: #006aff; box-shadow: 0 0 0 3px rgba(0, 106, 255, 0.05); }

        .filter-group { display: flex; align-items: center; gap: 0.75rem; color: #64748b; }
        .filter-group select {
          padding: 0.6rem 2.5rem 0.6rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
        }


        .students-list { 
            border-radius: 24px; 
            overflow: hidden; 
            border: 1px solid #e2e8f0; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
        }
        .table-container { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; background: white; }
        .data-table th {
            text-align: left;
            padding: 1.5rem 1.25rem;
            background: #f8fafc;
            color: #475569;
            font-weight: 800;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-bottom: 1px solid #e2e8f0;
        }

        .data-table td { padding: 1.25rem 1.25rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .text-right { text-align: right; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover { background-color: #fcfdfe; }

        .student-name-cell { display: flex; align-items: center; gap: 1.25rem; }
        .name-wrap { display: flex; flex-direction: column; gap: 0.15rem; }
        .name-text { font-weight: 800; color: #1e293b; font-size: 1.0625rem; }
        .student-tags { display: flex; align-items: center; gap: 0.5rem; }
        .campus-tag { font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .course-tag { font-size: 0.65rem; color: #006dff; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #e0f2fe; padding: 0.2rem 0.5rem; border-radius: 4px; }

        .avatar {
          width: 44px;
          height: 44px;
          background: #f0f7ff;
          color: #006dff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.125rem;
        }
        .avatar.large { width: 80px; height: 80px; font-size: 2rem; border-radius: 24px; }

        .contact-info { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.875rem; color: #64748b; font-weight: 500; }
        .contact-info span { display: flex; align-items: center; gap: 0.6rem; }
        
        .enrollment-info { display: flex; flex-direction: column; gap: 0.25rem; }
        .enrollment-info .course { font-weight: 800; color: #334155; font-size: 0.9rem; }
        .enrollment-info .batch { font-size: 0.75rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
        
        .font-mono { font-family: ui-monospace, monospace; font-weight: 700; }
        .text-right { text-align: right; }
        .text-success { color: #10b981; }
        .text-error { color: #ef4444; }

        .status-pill {
            padding: 0.5rem 1rem;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 700;
            display: inline-block;
        }
        .status-pill.success { background: #f0fdf4; color: #16a34a; }
        .status-pill.warning { background: #fffbeb; color: #d97706; }
        .status-pill.error { background: #fef2f2; color: #dc2626; }

        .actions-cell { text-align: right; }
        .action-row { display: flex; justify-content: flex-end; gap: 0.5rem; }

        .icon-btn {
          border: none;
          background: transparent;
          padding: 0.75rem;
          border-radius: 10px;
          color: #94a3b8;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: #f1f5f9; color: #006dff; transform: scale(1.1); }
        .icon-btn.text-error:hover { background: #fef2f2; color: #ef4444; }

        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 3rem;
            padding: 2rem;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        .page-info { font-weight: 800; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }

        .modal-card {
          width: 100%;
          max-width: 700px;
          background: white;
          padding: 3.5rem;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        }

        .profile-modal.dashboard-style {
          max-width: 1000px;
          padding: 0;
          overflow: hidden;
          background: #f8fafc;
        }

        .profile-banner {
          height: 120px;
          background: linear-gradient(135deg, #006dff 0%, #00d2ff 100%);
        }

        .profile-header-dashboard {
          padding: 0 3rem;
          display: flex;
          align-items: flex-end;
          gap: 2.5rem;
          margin-top: -60px;
          margin-bottom: 2.5rem;
        }

        .avatar-overlap {
          width: 120px;
          height: 120px;
          background: white;
          border: 5px solid white;
          border-radius: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: 900;
          color: #006aff;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .header-info {
          padding-bottom: 1rem;
          flex: 1;
        }

        .header-info .title-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .header-info h2 {
          font-size: 2rem;
          font-weight: 900;
          color: #1e293b;
          margin: 0;
        }

        .header-meta {
          display: flex;
          gap: 1.5rem;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .header-meta span {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .profile-dashboard-grid {
          padding: 0 3rem 3rem;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border: 1px solid #e2e8f0;
        }

        .stat-card label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .stat-card .amount {
          font-size: 1.125rem;
          font-weight: 900;
          color: #1e293b;
        }

        .stat-card svg { color: #006aff; }
        .stat-card.success svg { color: #10b981; }
        .stat-card.warning svg { color: #f59e0b; }

        .dashboard-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .profile-section-card {
          background: white;
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          height: 100%;
        }

        .profile-section-card h3 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1rem;
          font-weight: 900;
          color: #006aff;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .profile-info-grid {
          display: grid;
          gap: 1.25rem;
        }

        .info-box label {
          display: block;
          font-size: 0.7rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .info-box p {
          font-size: 0.95rem;
          font-weight: 700;
          color: #334155;
          margin: 0;
        }

        .mini-table-v2 {
          width: 100%;
          border-collapse: collapse;
        }

        .mini-table-v2 th {
          text-align: left;
          font-size: 0.7rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .mini-table-v2 td {
          padding: 0.75rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #f8fafc;
        }

        .no-history {
          text-align: center;
          padding: 2rem;
          color: #94a3b8;
          font-style: italic;
          font-size: 0.875rem;
        }

        .dashboard-footer {
          padding: 2rem 3rem;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
        }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-weight: 800; margin-bottom: 0.75rem; color: #475569; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; }
        
        input, select {
            width: 100%;
            padding: 1rem 1.25rem;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        input:focus, select:focus { outline: none; border-color: #006dff; box-shadow: 0 0 0 4px rgba(0, 109, 255, 0.1); }

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
        .btn-primary { background: #006dff; color: white; }
        .btn-primary:hover { background: #0056cc; transform: translateY(-3px); box-shadow: 0 15px 25px -5px rgba(0, 109, 255, 0.4); }
        .btn-outline { background: white; color: #475569; border: 1px solid #cbd5e1; }
        .btn-outline:hover { background: #f8fafc; border-color: #006dff; color: #006dff; transform: translateY(-2px); }
        .btn-sm { padding: 0.75rem 1.25rem; font-size: 0.875rem; border-radius: 10px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .badge {
            padding: 0.4rem 1rem;
            background: #e0f2fe;
            color: #006dff;
            border-radius: 100px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .top-action-bar {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .utility-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
        }

        .page-footer-actions {
          display: flex;
          justify-content: center;
          padding: 3rem 0;
          margin-top: 2rem;
        }
      `}</style>
    </div >
  )
}

export default Students
