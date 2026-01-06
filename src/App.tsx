import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import InstallGuide from "./pages/InstallGuide";
import Gallery from "./pages/Gallery";
import Library from "./pages/Library";
import ConnectedAccounts from "./pages/ConnectedAccounts";
import Landing from "./pages/Landing";
import ApiDocs from "./pages/ApiDocs";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import { OfflineIndicator, OnlineIndicator } from "./components/OfflineIndicator";
import { InstallPrompt } from "./components/InstallPrompt";
import { LoadingScreen } from "./components/LoadingScreen";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <OnlineIndicator />
        <InstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/chat" element={<Index />} />
            <Route path="/docs" element={<ApiDocs />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/install" element={<InstallGuide />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/library" element={<Library />} />
            <Route path="/connected-accounts" element={<ConnectedAccounts />} />
            <Route path="/support" element={<Support />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
