import "./index.css";
import "./styles/sections.css";
import "./styles/auth.css";

import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Generate from "./pages/Generate";
import SitePreview from "./pages/SitePreview";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/generate"
        element={
          <ProtectedRoute>
            <Generate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/site/:runId"
        element={
          <ProtectedRoute>
            <SitePreview />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
