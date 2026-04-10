import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type Role = "adult" | "parent" | "child";

interface RequireRoleProps {
  allowedRoles: Role[];
  pageName?: string;
}

const prettyRole = (role: string | null) => {
  if (role === "adult") return "adult";
  if (role === "child") return "child";
  if (role === "parent") return "parent";
  return "guest";
};

const prettyAllowedRoles = (roles: Role[]) => {
  return roles.join(" or ");
};

const RequireRole = ({ allowedRoles, pageName = "this page" }: RequireRoleProps) => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please login first.");
      navigate("/login", {
        replace: true,
        state: { from: location },
      });
      return;
    }

    if (!role || !allowedRoles.includes(role)) {
      toast.error(
        `You can't access ${pageName} because you are logged in as ${prettyRole(role)}. Only ${prettyAllowedRoles(allowedRoles)} can access it.`
      );
      navigate("/dashboard/select", { replace: true });
    }
  }, [isAuthenticated, role, allowedRoles, pageName, navigate, location]);

  if (!isAuthenticated) return null;
  if (!role || !allowedRoles.includes(role)) return null;

  return <Outlet />;
};

export default RequireRole;