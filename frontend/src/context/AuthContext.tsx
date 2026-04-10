import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Role = "adult" | "parent" | "child" | null;

interface AuthContextType {
  role: Role;
  userName: string;
  isAuthenticated: boolean;
  setRole: (role: Role) => void;
  setUserName: (name: string) => void;
  login: (role: Exclude<Role, null>, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  userName: "",
  isAuthenticated: false,
  setRole: () => {},
  setUserName: () => {},
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRoleState] = useState<Role>(null);
  const [userName, setUserNameState] = useState("");

  useEffect(() => {
    const savedRole = localStorage.getItem("role") as Role;
    const savedUserName = localStorage.getItem("userName") || "";

    if (savedRole) setRoleState(savedRole);
    if (savedUserName) setUserNameState(savedUserName);
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
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const isAuthenticated = role !== null;

  return (
    <AuthContext.Provider
      value={{
        role,
        userName,
        isAuthenticated,
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