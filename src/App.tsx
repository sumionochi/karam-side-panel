import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Debug component to see what path we're loading
const DebugRouter = () => {
  const location = useLocation();

  // Log the current path for debugging
  console.log('Current path:', location.pathname);
  console.log('Current search:', location.search);
  console.log('Current hash:', location.hash);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/index.html" element={<Index />} />
      <Route path="/karam-side-panel/" element={<Index />} />
      <Route path="/karam-side-panel/index.html" element={<Index />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DebugRouter />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
