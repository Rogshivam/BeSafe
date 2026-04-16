import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const RequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Please login first to access this page.");
      navigate("/login", {
        replace: true,
        state: { from: location },
      });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Show loading spinner while validating token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground">Validating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <Outlet />;
};

export default RequireAuth;