import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "./hooks/use-auth";

import AuthPage from "./pages/auth";
import HomePage from "./pages/home";
import TimelinePage from "./pages/timeline";
import DashboardPage from "./pages/dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--cream)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-dark)] mx-auto"></div>
          <p className="mt-4 font-serif text-lg text-[var(--charcoal)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!user && <Route path="/" component={AuthPage} />}
      {user && <Route path="/" component={HomePage} />}
      {user && <Route path="/home/:relationshipId" component={HomePage} />}
      {user && <Route path="/timeline" component={TimelinePage} />}
      {user && <Route path="/timeline/:relationshipId" component={TimelinePage} />}
      {user && <Route path="/dashboard" component={DashboardPage} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
