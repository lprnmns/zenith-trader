import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import StrategiesPage from './pages/StrategiesPage';
import ExplorerPage from './pages/ExplorerPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/strategies" element={<StrategiesPage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;