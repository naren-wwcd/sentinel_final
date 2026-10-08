import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Incidents from './pages/Incidents.jsx'
import IncidentDetail from './pages/IncidentDetail.jsx'
import LiveEvents from './pages/LiveEvents.jsx'
import Investigation from './pages/Investigation.jsx'
import ResponseCenter from './pages/ResponseCenter.jsx'
import Approvals from './pages/Approvals.jsx'
import Audit from './pages/Audit.jsx'
import Settings from './pages/Settings.jsx'
export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<Dashboard />} /><Route path="/incidents" element={<Incidents />} /><Route path="/incidents/:id" element={<IncidentDetail />} />
    <Route path="/events" element={<LiveEvents />} /><Route path="/investigation" element={<Investigation />} /><Route path="/investigation/:id" element={<Investigation />} />
    <Route path="/response" element={<ResponseCenter />} /><Route path="/approvals" element={<Approvals />} />
    <Route path="/audit" element={<Audit />} /><Route path="/settings" element={<Settings />} />
  </Routes></Layout>
}
