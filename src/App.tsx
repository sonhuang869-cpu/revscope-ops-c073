import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Contracts from './pages/Contracts'
import ContractDetail from './pages/ContractDetail'
import ContractNew from './pages/ContractNew'
import Schedule from './pages/Schedule'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/new" element={<ContractNew />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="schedule" element={<Schedule />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
