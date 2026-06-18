import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { MedicationsPage } from './pages/MedicationsPage'
import { MorePage } from './pages/MorePage'
import { MedicationWizard } from './wizard/MedicationWizard'
import { DoseWizard } from './wizard/DoseWizard'
import { EditMedicationPage } from './pages/EditMedicationPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/meds" element={<MedicationsPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/medication/new" element={<MedicationWizard />} />
          <Route path="/medication/edit/:id" element={<EditMedicationPage />} />
          <Route path="/dose/new" element={<DoseWizard />} />
          <Route path="/dose/edit/:id" element={<DoseWizard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
