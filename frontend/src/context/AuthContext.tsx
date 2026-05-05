import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authAPI } from "@/services/api";

type Role = "adult" | "parent" | "child" | "member" | "individual" | null;

interface AuthContextType {
  role: Role;
  userName: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  setRole: (role: Role) => void;
  setUserName: (name: string) => void;
  login: (role: Exclude<Role, null>, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  userName: "",
  isAuthenticated: false,
  isLoading: true,
  setRole: () => {},
  setUserName: () => {},
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRoleState] = useState<Role>(null);
  const [userName, setUserNameState] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      const savedRole = localStorage.getItem("role") as Role;
      const savedUserName = localStorage.getItem("userName") || "";

      // If we have stored user data, restore it immediately
      if (savedUser && savedRole && savedUserName) {
        const userData = JSON.parse(savedUser);
        const actualRole = userData.userType.toLowerCase() as Role;
        setRoleState(actualRole);
        setUserNameState(userData.name);
        
        // Then try to validate token in background
        if (token) {
          try {
            const response = await authAPI.getCurrentUser();
            if (response.success) {
              // Token is valid, update stored role if needed
              if (actualRole !== savedRole) {
                localStorage.setItem("role", actualRole);
                localStorage.setItem("userName", userData.name);
              }
            } else {
              // Token is invalid, but keep user session for better UX
              console.warn('Token validation failed, keeping user session');
              localStorage.removeItem("token");
            }
          } catch (error) {
            // Token validation failed, but keep user session for better UX
            console.warn('Token validation error:', error);
            localStorage.removeItem("token");
          }
        }
      } else {
        // No stored user data, ensure logged out state
        logout();
      }
      setIsLoading(false);
    };

    validateAuth();
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem("role", newRole);
    } else {
      localStorage.removeItem("role");
    }
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    if (name) {
      localStorage.setItem("userName", name);
    } else {
      localStorage.removeItem("userName");
    }
  };

  const login = (newRole: Exclude<Role, null>, name: string) => {
    setRole(newRole);
    setUserName(name);
  };

  const logout = () => {
    setRoleState(null);
    setUserNameState("");
    // Clear all auth-related localStorage items
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
  };

  const isAuthenticated = role !== null;

  return (
    <AuthContext.Provider
      value={{
        role,
        userName,
        isAuthenticated,
        isLoading,
        setRole,
        setUserName,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};