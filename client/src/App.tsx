import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import Home from "./pages/Home";
import LoginPage from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import AssessmentEditor from "./pages/AssessmentEditor";
import AssessmentResults from "./pages/AssessmentResults";
import ClassResults from "./pages/ClassResults";
import QuizPage from "./pages/QuizPage";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/quiz/:token" component={QuizPage} />

      {/* Teacher routes (protected) */}
      <Route path="/teacher">
        <ProtectedRoute>
          <TeacherDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/assessment/:id/edit">
        <ProtectedRoute>
          <AssessmentEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/assessment/:id/results">
        <ProtectedRoute>
          <AssessmentResults />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/class/:id">
        <ProtectedRoute>
          <ClassResults />
        </ProtectedRoute>
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
        <AccessibilityProvider>
          <TooltipProvider>
            <Toaster richColors position="top-center" />
            <Router />
          </TooltipProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
