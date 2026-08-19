import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy: everything (code-split per route)
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ResellerLanding = lazy(() => import("./pages/ResellerLanding"));
const ResetLicenca = lazy(() => import("./pages/ResetLicenca"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Licenses = lazy(() => import("./pages/Licenses"));
const Customers = lazy(() => import("./pages/Customers"));
const ExtensionDownload = lazy(() => import("./pages/ExtensionDownload"));
const Templates = lazy(() => import("./pages/Templates"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResellerRegister = lazy(() => import("./pages/ResellerRegister"));
const ResellerDashboard = lazy(() => import("./pages/reseller/ResellerDashboard"));
const ResellerLicenses = lazy(() => import("./pages/reseller/ResellerLicenses"));
const ResellerCustomers = lazy(() => import("./pages/reseller/ResellerCustomers"));
const Resellers = lazy(() => import("./pages/admin/Resellers"));
const Managers = lazy(() => import("./pages/admin/Managers"));
const ExtensionFront = lazy(() => import("./pages/admin/ExtensionFront"));
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerLicenses = lazy(() => import("./pages/manager/ManagerLicenses"));
const ManagerResellers = lazy(() => import("./pages/manager/ManagerResellers"));
const ManagerCustomers = lazy(() => import("./pages/manager/ManagerCustomers"));
const ManagerCredits = lazy(() => import("./pages/manager/ManagerCredits"));
const ManagerRemarketing = lazy(() => import("./pages/manager/ManagerRemarketing"));
const ExtensionChat = lazy(() => import("./pages/ExtensionChat"));
const TokenMetrics = lazy(() => import("./pages/admin/TokenMetrics"));
const LvbCreditsAdmin = lazy(() => import("./pages/admin/LvbCreditsAdmin"));
const AdminRemarketing = lazy(() => import("./pages/admin/AdminRemarketing"));
const CreditosPage = lazy(() => import("./pages/CreditosPage"));
const CreditosLoginPage = lazy(() => import("./pages/CreditosLoginPage"));
const CreditosConfig = lazy(() => import("./pages/admin/CreditosConfig"));
const MyApprovals = lazy(() => import("./pages/MyApprovals"));
const IpAudit = lazy(() => import("./pages/admin/IpAudit"));
const ProjectAudit = lazy(() => import("./pages/admin/ProjectAudit"));
const CommunityDiscount = lazy(() => import("./pages/admin/CommunityDiscount"));
const AdminPromocoes = lazy(() => import('./pages/admin/AdminPromocoes'));
const KeyProjects = lazy(() => import('./pages/admin/KeyProjects'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/reset-licenca" element={<ResetLicenca />} />
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
              <Route path="/admin/desconto-progressivo" element={<CommunityDiscount />} />
              <Route path="/admin/promocoes" element={<AdminPromocoes />} />
              <Route path="/admin/key-projects" element={<KeyProjects />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
