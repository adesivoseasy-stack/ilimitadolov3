import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Licenses from "./pages/Licenses";
import Customers from "./pages/Customers";
import ExtensionDownload from "./pages/ExtensionDownload";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ResellerRegister from "./pages/ResellerRegister";
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import ResellerLicenses from "./pages/reseller/ResellerLicenses";
import ResellerCustomers from "./pages/reseller/ResellerCustomers";
import Resellers from "./pages/admin/Resellers";
import Managers from "./pages/admin/Managers";
import ExtensionFront from "./pages/admin/ExtensionFront";
import ResellerLanding from "./pages/ResellerLanding";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerLicenses from "./pages/manager/ManagerLicenses";
import ManagerResellers from "./pages/manager/ManagerResellers";
import ManagerCustomers from "./pages/manager/ManagerCustomers";
import ManagerCredits from "./pages/manager/ManagerCredits";
import ManagerRemarketing from "./pages/manager/ManagerRemarketing";
import ExtensionChat from "./pages/ExtensionChat";
import TokenMetrics from "./pages/admin/TokenMetrics";
import LvbCreditsAdmin from "./pages/admin/LvbCreditsAdmin";
import AdminRemarketing from "./pages/admin/AdminRemarketing";
import CreditosPage from "./pages/CreditosPage";
import CreditosLoginPage from "./pages/CreditosLoginPage";
import CreditosConfig from "./pages/admin/CreditosConfig";
import MyApprovals from "./pages/MyApprovals";
import IpAudit from "./pages/admin/IpAudit";
import ProjectAudit from "./pages/admin/ProjectAudit";
import { HelmetProvider } from "react-helmet-async";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/licenses" element={<Licenses />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/extension" element={<ExtensionDownload />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/resellers" element={<Resellers />} />
              <Route path="/managers" element={<Managers />} />
              <Route path="/extension-front" element={<ExtensionFront />} />
              <Route path="/revenda" element={<ResellerLanding />} />
              <Route path="/reseller/register" element={<ResellerRegister />} />
              <Route path="/reseller/dashboard" element={<ResellerDashboard />} />
              <Route path="/reseller/licenses" element={<ResellerLicenses />} />
              <Route path="/reseller/customers" element={<ResellerCustomers />} />
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/licenses" element={<ManagerLicenses />} />
              <Route path="/manager/resellers" element={<ManagerResellers />} />
              <Route path="/manager/customers" element={<ManagerCustomers />} />
              <Route path="/manager/credits" element={<ManagerCredits />} />
              <Route path="/manager/remarketing" element={<ManagerRemarketing />} />
              <Route path="/extension-chat" element={<ExtensionChat />} />
              <Route path="/token-metrics" element={<TokenMetrics />} />
              <Route path="/admin/lvb-credits" element={<LvbCreditsAdmin />} />
              <Route path="/admin/remarketing" element={<AdminRemarketing />} />
              <Route path="/admin/creditos-config" element={<CreditosConfig />} />
              <Route path="/creditos" element={<CreditosPage />} />
              <Route path="/creditos/login" element={<CreditosLoginPage />} />
              <Route path="/minhas-aprovacoes" element={<MyApprovals />} />
              <Route path="/admin/ip-audit" element={<IpAudit />} />
              <Route path="/admin/project-audit" element={<ProjectAudit />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
