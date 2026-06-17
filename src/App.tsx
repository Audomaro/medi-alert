import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { MedicationsPage } from './pages/MedicationsPage'
import { MorePage } from './pages/MorePage'
import { TreatmentWizard } from './wizard/TreatmentWizard'
import { MedicationWizard } from './wizard/MedicationWizard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/meds" element={<MedicationsPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/treatment/new" element={<TreatmentWizard />} />
          <Route path="/medication/new" element={<MedicationWizard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
