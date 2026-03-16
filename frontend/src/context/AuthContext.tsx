import { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'adult' | 'parent' | 'child' | null;

interface AuthContextType {
  role: Role;
  userName: string;
  setRole: (role: Role) => void;
  setUserName: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  userName: '',
  setRole: () => {},
  setUserName: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>(null);
  const [userName, setUserName] = useState('John');

  const logout = () => {
    setRole(null);
    setUserName('');
  };

  return (
    <AuthContext.Provider value={{ role, userName, setRole, setUserName, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
