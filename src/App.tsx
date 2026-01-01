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
            <Route path="/" element={<Index />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/install" element={<InstallGuide />} />
            <Route path="/gallery" element={<Gallery />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
