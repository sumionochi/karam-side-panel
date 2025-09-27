import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    console.error("Full location:", location);
  }, [location]);

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Path: <code className="bg-muted px-2 py-1 rounded">{location.pathname}</code>
        </p>
        <Button onClick={handleGoHome} className="mt-4">
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
