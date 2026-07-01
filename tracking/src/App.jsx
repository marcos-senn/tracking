import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DriversPage from './pages/DriversPage';
import LoadsPage from './pages/LoadsPage';
import ResumePage from './pages/ResumePage'; // <-- Importante

function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md">
        <SignIn routing="path" path="/login" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<SignInPage />} />

        <Route path="/*" element={
          <>
            <SignedOut>
              <Navigate to="/login" replace />
            </SignedOut>
            
            <SignedIn>
              <Layout> {/* <-- Todo debe estar dentro de Layout */}
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/loads" element={<LoadsPage />} />
                  <Route path="/resume" element={<ResumePage />} /> {/* <-- Aquí dentro */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </SignedIn>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}