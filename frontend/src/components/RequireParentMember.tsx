import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const RequireParentMember = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const linkedMemberId = localStorage.getItem("linkedMemberId");

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please login first to access Parent Dashboard.");
      navigate("/login", {
        replace: true,
        state: { from: location },
      });
      return;
    }

    if (role !== "parent") {
      toast.error("You can't access Parent Dashboard because you are not logged in as a parent.");
      navigate("/dashboard/select", { replace: true });
      return;
    }

    // if (!linkedMemberId) {
    //   toast.error("Parent Dashboard is available only if a member is linked to your account.");
    //   navigate("/dashboard/select", { replace: true });
    // }
    // linkedMemberId
  }, [isAuthenticated, role,  navigate, location]);

  if (!isAuthenticated) return null;
  if (role !== "parent") return null;
  // if (!linkedMemberId) return null;

  return <Outlet />;
};

export default RequireParentMember;