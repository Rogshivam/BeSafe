import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, User, Users, Baby, Eye, EyeOff } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import CurrentDate from "@/components/Date";
import { toast } from "sonner";
type Role = "adult" | "parent" | "child";

const roles: { value: Role; label: string; icon: any }[] = [
  { value: "adult", label: "Adult", icon: User },
  { value: "parent", label: "Parent", icon: Users },
  { value: "child", label: "Child", icon: Baby },
];
const apiUrl = import.meta.env.VITE_API_URL;
const roleMap: any = {
  adult: "Individual",
  parent: "Parent",
  child: "Child",
};


const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    age: "",
  });

  const [selectedRole, setSelectedRole] = useState<Role>("adult");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: any) => {
  e.preventDefault();

  try {
    const res = await fetch(`${apiUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        age: Number(form.age),
        userType: roleMap[selectedRole],
      }),
    });

    const data = await res.json();

    // ❗ API error handling
    if (!res.ok) {
      toast.error(data?.message || "Registration failed");
      return;
    }

    const token = data?.data?.token;

    if (token) {
      localStorage.setItem("token", token);
    }

    toast.success("Registered successfully 🎉");

    setTimeout(() => {
      navigate("/login");
    }, 1500);

  } catch (error) {
    console.error(error);

    toast.error("Server error. Please try again.");
  }
};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex items-center justify-center py-20 px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl w-full">

          {/* Left Section */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">
              Create Account
            </h1>
            <p className="text-muted-foreground">
              <CurrentDate/>
              </p>
          </motion.div>

          {/* Right Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-background rounded-3xl shadow-depth p-8 relative overflow-hidden">

              {/* blobs */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

              <div className="relative z-10">

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                    <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mb-6">
                  Register for Be-Safe
                </p>

                <form onSubmit={handleRegister} className="space-y-4">

                  {/* Name */}
                  <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
                  <input
                    name="name"
                    placeholder="Full Name"
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    required
                    
                  />

                  {/* Email */}
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="user@besafe.com"
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    required
                  />

                  {/* Phone */}
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone no.</label>
                  <input
                    name="phone"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="Phone Number"
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    required
                  />

                  {/* Age */}
                  <label className="text-sm font-medium text-foreground mb-1 block">Age</label>
                  <input
                    name="age"
                    type="number"
                    placeholder="Age"
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    required
                    
                  />
                  

                  {/* Password */}
                  <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••"
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Role Selection */}
                  <label className="text-sm font-medium text-foreground mb-1 block">Role</label>
                  <div className="flex gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedRole(r.value)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border
                        ${
                          selectedRole === r.value
                            ? "gradient-primary text-primary-foreground border-transparent shadow-lg"
                            : "bg-secondary/50 text-foreground border-border"
                        }`}
                      >
                        <r.icon className="w-4 h-4" />
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {/* Submit */}
                  <button className="w-full py-3 gradient-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:scale-95 transition">
                    Register
                  </button>
                </form>

                {/* Footer */}
                <div className="flex justify-end mt-4 text-xs text-muted-foreground">
                  <button
                    onClick={() => navigate("/login")}
                    className="hover:text-primary"
                  >
                    Already have an account?
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Register;