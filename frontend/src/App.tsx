import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";

import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/RequireRole";
import RequireParentMember from "@/components/RequireParentMember";

import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import DashboardSelect from "./pages/DashboardSelect";
import AdultDashboard from "./pages/AdultDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import ChildDashboard from "./pages/ChildDashboard";
import EvidenceLocker from "./pages/EvidenceLocker";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import ForgetPassword from "./components/forgetpassword";
import ChangePassword from "./components/changepassword";
import ResetPassword from "./components/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forget-password" element={<ForgetPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* logged-in only */}
            <Route element={<RequireAuth />}>
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/dashboard/select" element={<DashboardSelect />} />
              <Route path="/evidence-locker" element={<EvidenceLocker />} />
            </Route>

            {/* adult only */}
            <Route element={<RequireRole allowedRoles={["adult"]} />}>
              <Route path="/dashboard/adult" element={<AdultDashboard />} />
            </Route>

            {/* child only */}
            <Route element={<RequireRole allowedRoles={["child"]} />}>
              <Route path="/dashboard/child" element={<ChildDashboard />} />
            </Route>

            {/* parent only + linked member required */}
            <Route element={<RequireParentMember />}>
              <Route path="/dashboard/parent" element={<ParentDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;