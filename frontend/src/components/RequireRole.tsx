import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type Role = "adult" | "parent" | "child" | "individual" | "member";

interface RequireRoleProps {
  allowedRoles: Role[];
  pageName?: string;
}

const normalizeRole = (role: string | null | undefined): string => {
  if (!role) return "guest";
  const lower = role.toLowerCase();
  if (lower === "individual" || lower === "adult" || lower === "member") return "adult";
  if (lower === "parent") return "parent";
  if (lower === "child") return "child";
  return lower;
};

const prettyAllowedRoles = (roles: Role[]) => {
  return roles.map(r => normalizeRole(r)).filter((v, i, a) => a.indexOf(v) === i).join(" or ");
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

    const currentNormalizedRole = normalizeRole(role);
    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

    if (!role || !normalizedAllowed.includes(currentNormalizedRole)) {
      toast.error(
        `You can't access ${pageName} because you are logged in as ${currentNormalizedRole}. Only ${prettyAllowedRoles(allowedRoles)} can access it.`
      );
      navigate("/dashboard/select", { replace: true });
    }
  }, [isAuthenticated, role, allowedRoles, pageName, navigate, location]);

  const currentNormalizedRole = normalizeRole(role);
  const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

  if (!isAuthenticated) return null;
  if (!role || !normalizedAllowed.includes(currentNormalizedRole)) return null;

  return <Outlet />;
};

export default RequireRole;