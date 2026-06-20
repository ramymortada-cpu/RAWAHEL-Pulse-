import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Preview from "./pages/Preview";
import History from "./pages/History";
import Compare from "./pages/Compare";
import Integrations from "./pages/Integrations";
import ItemsOverview from "./pages/ItemsOverview";
import PulseAdmin from "./pages/PulseAdmin";
import EntityDetail from "./pages/EntityDetail";
import GoalDetail from "./pages/GoalDetail";
import SubmissionLinks from "./pages/SubmissionLinks";
import PublicSubmission, { PublicSubmissionSuccess } from "./pages/PublicSubmission";

function Router() {
  return (
    <Switch>
      {/* Preview is full-bleed (no sidebar) for clean PDF capture */}
      <Route path="/reports/:id/preview" component={Preview} />
      <Route path="/submit/:token/success" component={PublicSubmissionSuccess} />
      <Route path="/submit/:token" component={PublicSubmission} />

      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/reports">
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </Route>
      <Route path="/reports/:id">
        <DashboardLayout>
          <ReportDetail />
        </DashboardLayout>
      </Route>
      <Route path="/history">
        <DashboardLayout>
          <History />
        </DashboardLayout>
      </Route>
      <Route path="/compare">
        <DashboardLayout>
          <Compare />
        </DashboardLayout>
      </Route>
      <Route path="/items">
        <DashboardLayout>
          <ItemsOverview />
        </DashboardLayout>
      </Route>
      <Route path="/entities/:id">
        <DashboardLayout>
          <EntityDetail />
        </DashboardLayout>
      </Route>
      <Route path="/goals/:id">
        <DashboardLayout>
          <GoalDetail />
        </DashboardLayout>
      </Route>
      <Route path="/pulse/submission-links">
        <DashboardLayout>
          <SubmissionLinks />
        </DashboardLayout>
      </Route>
      <Route path="/pulse">
        <DashboardLayout>
          <PulseAdmin />
        </DashboardLayout>
      </Route>
      <Route path="/integrations">
        <DashboardLayout>
          <Integrations />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
