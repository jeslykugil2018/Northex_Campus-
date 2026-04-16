import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AdminLayout from './components/Layout/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Finance from './pages/Finance'
import Campuses from './pages/Campuses'
import CampusSelection from './pages/CampusSelection'
import Support from './pages/Support'
import Admins from './pages/Admins'
import InvoiceGenerator from './pages/InvoiceGenerator'

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          <Route element={<AdminLayout />}>
            <Route path="/select-campus" element={<CampusSelection />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/invoice-generator" element={<InvoiceGenerator />} />
            <Route path="/campuses" element={<Campuses />} />
            <Route path="/support" element={<Support />} />
            <Route path="/admins" element={<Admins />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
