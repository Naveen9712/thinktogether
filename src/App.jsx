import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Room from './pages/Room.jsx';
import Summary from './pages/Summary.jsx';
import History from './pages/History.jsx';
import SetupCheck from './pages/SetupCheck.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:id" element={<Room />} />
      <Route path="/summary/:id" element={<Summary />} />
      <Route path="/history" element={<History />} />
      <Route path="/setup" element={<SetupCheck />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
