import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, Landmark, LogOut, HelpCircle, FileText, Landmark as FinanceIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Sidebar = () => {
  const { adminRecord, signOut } = useAuth()
  const location = useLocation()

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Student Registry', icon: GraduationCap, path: '/students' },
    { label: 'Finance', icon: Landmark, path: '/finance' },
    { label: 'Invoice Generator', icon: FileText, path: '/invoice-generator' },
    ...(adminRecord?.role === 'Super Admin' ? [{ label: 'Campus Settings', icon: Landmark, path: '/campuses' }] : []),
    { label: 'Help & Support', icon: HelpCircle, path: '/support' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <GraduationCap size={32} color="var(--primary)" />
        <div className="brand">
          <h1>LMS HUB</h1>
          <span>{adminRecord?.role === 'Super Admin' ? 'Super Admin' : (adminRecord?.campuses?.name || 'Admin')}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <span className="nav-group-title">Menu</span>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={signOut}>
          <LogOut size={20} />
          Sign Out
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: white;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid var(--bg-main);
        }

        .brand h1 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .brand span {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          overflow-y: auto;
        }

        .nav-group {
          margin-bottom: 2rem;
        }

        .nav-group-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-left: 1rem;
          margin-bottom: 0.75rem;
          display: block;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--text-muted);
          font-weight: 500;
          transition: all 0.2s;
          margin-bottom: 0.25rem;
          text-decoration: none;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          font-family: inherit;
        }

        .nav-item:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        .nav-item.active {
          background: var(--primary);
          color: white;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--bg-main);
        }

        .logout-btn {
          color: var(--error);
        }

        .logout-btn:hover {
          background: var(--error-light);
          color: var(--error);
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
