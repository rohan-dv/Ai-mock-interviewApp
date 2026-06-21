import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LayoutDashboard, FileUp, PlayCircle, BarChart3, BookOpen, History, LogOut, User } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/resume", label: "Resume", icon: FileUp },
  { to: "/interview/setup", label: "Practice", icon: PlayCircle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/study-plan", label: "Study Plan", icon: BookOpen },
  { to: "/history", label: "History", icon: History },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-strong border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="navbar-logo">
          <div className="w-8 h-8 rounded-md bg-[#00FF94] flex items-center justify-center neon-ring">
            <span className="font-display font-black text-black text-sm">A</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-white text-sm">ARIA</span>
            <span className="font-mono text-[10px] tracking-widest text-[#00FF94] uppercase">interview.ai</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive
                    ? "text-[#00FF94] bg-white/5"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/5" data-testid="navbar-user-menu">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-[#00FF94]">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <span className="hidden sm:inline text-sm">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-strong border-white/10">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-zinc-400">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {navItems.map((item) => (
              <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)} className="md:hidden gap-2 cursor-pointer">
                <item.icon className="w-4 h-4" strokeWidth={1.5} />
                {item.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-red-400 focus:text-red-400" data-testid="logout-btn">
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
