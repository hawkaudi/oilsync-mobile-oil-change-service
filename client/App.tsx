import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import MyAppointments from "./pages/MyAppointments";
import VerifyPhone from "./pages/VerifyPhone";
import AdminDashboard from "./pages/AdminDashboard";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import LoginTest from "./pages/LoginTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-appointments" element={<MyAppointments />} />
          <Route path="/verify-phone" element={<VerifyPhone />} />
          <Route
            path="/services"
            element={
              <Placeholder
                title="Our Services"
                description="Learn about our professional oil change and maintenance services."
              />
            }
          />
          <Route
            path="/services/oil-change"
            element={<Placeholder title="Oil Change Service" />}
          />
          <Route
            path="/services/filter-replacement"
            element={<Placeholder title="Filter Replacement" />}
          />
          <Route
            path="/services/maintenance"
            element={<Placeholder title="Basic Maintenance" />}
          />
          <Route
            path="/pricing"
            element={
              <Placeholder
                title="Pricing"
                description="View our transparent pricing for all services."
              />
            }
          />
          <Route
            path="/about"
            element={
              <Placeholder
                title="About Us"
                description="Learn about OilSync and our mission to provide convenient automotive service."
              />
            }
          />
          <Route path="/careers" element={<Placeholder title="Careers" />} />
          <Route path="/contact" element={<Placeholder title="Contact Us" />} />
          <Route path="/help" element={<Placeholder title="Help Center" />} />
          <Route
            path="/privacy"
            element={<Placeholder title="Privacy Policy" />}
          />
          <Route
            path="/terms"
            element={<Placeholder title="Terms of Service" />}
          />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/test-login" element={<LoginTest />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
