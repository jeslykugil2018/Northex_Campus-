import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, BookOpen, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const Courses = () => {
    const { adminRecord } = useAuth()
    const navigate = useNavigate()
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingCourse, setEditingCourse] = useState(null)
    const [formData, setFormData] = useState({ name: '' })

    useEffect(() => {
        fetchCourses()
    }, [])

    const fetchCourses = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('name', { ascending: true })

        if (error) console.error('Error fetching courses:', error)
        else setCourses(data || [])
        setLoading(false)
    }

    const handleOpenModal = (course = null) => {
        if (course) {
            setEditingCourse(course)
            setFormData({ name: course.name })
        } else {
            setEditingCourse(null)
            setFormData({ name: '' })
        }
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        let error
        if (editingCourse) {
            const { error: err } = await supabase
                .from('courses')
                .update({ name: formData.name })
                .eq('id', editingCourse.id)
            error = err
        } else {
            const { error: err } = await supabase
                .from('courses')
                .insert([{ name: formData.name }])
            error = err
        }

        if (error) {
            alert('Error saving course: ' + error.message)
        } else {
            setShowModal(false)
            fetchCourses()
        }
        setLoading(false)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this course? This may affect linked batches.')) {
            const { error } = await supabase.from('courses').delete().eq('id', id)
            if (error) alert(error.message)
            else fetchCourses()
        }
    }

    if (adminRecord?.role !== 'Super Admin') {
        return <div className="p-8"><h1>Access Denied</h1><p>Only Super Admins can manage courses.</p></div>
    }

    return (
        <div className="campuses-page">
            <div className="header-actions">
                <div>
                    <h1 className="page-title">Course Management</h1>
                    <p className="page-subtitle">Configure and manage courses</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Add Course
                </button>
            </div>

            <div className="campuses-grid mt-8">
                {loading ? (
                    <div className="empty-state">Loading courses...</div>
                ) : courses.map(course => (
                    <div key={course.id} className="campus-card card">
                        <div className="campus-icon">
                            <BookOpen size={32} color="#006dff" />
                        </div>
                        <div className="campus-info">
                            <h3>{course.name}</h3>
                            <span className="campus-id">ID: {course.id.split('-')[0]}...</span>
                        </div>
                        <div className="campus-actions">
                            <button className="icon-btn" onClick={() => handleOpenModal(course)} title="Edit">
                                <Edit2 size={18} />
                            </button>
                            <button className="icon-btn text-error" onClick={() => handleDelete(course.id)} title="Delete">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card card">
                        <h2>{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Course Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ name: e.target.value })}
                                    placeholder="e.g. Mathematics"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Course'}
                                </button>
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
        .page-footer {
          margin-top: 5rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: center;
        }
        .campuses-page { animation: fadeIn 0.4s ease-out; padding: 2rem 2rem 6rem; max-width: 1100px; margin: 0 auto; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .header-actions {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3.5rem;
        }

        .page-title { font-size: 2.25rem; font-weight: 800; color: #1e293b; letter-spacing: -0.04em; margin-bottom: 0.25rem; }
        .page-subtitle { color: #64748b; font-size: 0.95rem; font-weight: 500; }

        .campuses-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .campus-card {
            display: flex;
            align-items: center;
            gap: 2rem;
            padding: 2.25rem;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s;
        }
        .campus-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08); border-color: #006dff; }
        
        .campus-icon {
            width: 72px;
            height: 72px;
            background: #f0f7ff;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }
        .campus-card:hover .campus-icon { background: #006dff; border-radius: 20px; }
        .campus-card:hover .campus-icon svg { color: white !important; }

        .campus-info { flex: 1; }
        .campus-info h3 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 800; color: #1e293b; letter-spacing: -0.01em; }
        .campus-id { font-size: 0.8125rem; color: #94a3b8; font-family: ui-monospace, monospace; font-weight: 600; }
        
        .campus-actions { display: flex; gap: 0.75rem; }
        
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

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 3rem;
        }

        input, select {
            width: 100%;
            padding: 1rem 1.25rem;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.2s;
            outline: none;
        }
        input:focus, select:focus { border-color: #006dff; box-shadow: 0 0 0 4px rgba(0, 109, 255, 0.1); }

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

        .empty-state { text-align: center; padding: 5rem; color: #64748b; font-weight: 600; font-size: 1.125rem; }
        .mt-8 { margin-top: 3.5rem; }
            `}</style>
        </div>
    )
}

export default Courses
