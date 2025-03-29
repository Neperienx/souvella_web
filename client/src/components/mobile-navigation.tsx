import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { logOut } from "../lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MobileNavigationProps {
  activePath: string;
  onTimelineClick?: () => void;
  onHomeClick?: () => void;
  relationshipId?: number; // Added relationship ID
  onShowInvite?: () => void; // Add invite modal trigger
  userName?: string; // User display name
}

export default function MobileNavigation({ 
  activePath, 
  onTimelineClick, 
  onHomeClick,
  relationshipId,
  onShowInvite,
  userName = "User"
}: MobileNavigationProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const handleNavigation = (path: string) => {
    if (path === "home" && onHomeClick) {
      onHomeClick();
    } else if (path === "timeline" && onTimelineClick) {
      onTimelineClick();
    } else if (path === "home") {
      // Navigate to home with relationship ID if available
      if (relationshipId) {
        navigate(`/home/${relationshipId}`);
      } else {
        navigate("/");
      }
    } else if (path === "timeline") {
      // Navigate to timeline with relationship ID if available
      if (relationshipId) {
        navigate(`/timeline/${relationshipId}`);
      } else {
        navigate("/timeline");
      }
    } else if (path === "dashboard") {
      navigate("/dashboard");
    }
  };
  
  const handleLogout = async () => {
    try {
      await logOut();
      navigate("/");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-md py-2 md:hidden z-40">
      <div className="flex justify-around items-center px-4">
        <button 
          onClick={() => handleNavigation("home")}
          className={`flex flex-col items-center p-2 ${activePath === "home" ? "text-[var(--primary)]" : "text-[var(--charcoal)]/60"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-xs mt-1">Home</span>
        </button>
        
        <button 
          onClick={() => handleNavigation("timeline")}
          className={`flex flex-col items-center p-2 ${activePath === "timeline" ? "text-[var(--primary)]" : "text-[var(--charcoal)]/60"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
          </svg>
          <span className="text-xs mt-1">Timeline</span>
        </button>
        
        <div className="flex flex-col items-center p-1">
          <button 
            onClick={onShowInvite}
            className="w-12 h-12 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-md"
            aria-label="Share invite code or create relationship"
            title="Share invite code or create relationship"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
        
        <button 
          onClick={() => handleNavigation("dashboard")} 
          className={`flex flex-col items-center p-2 text-[var(--charcoal)]/60`}
          aria-label="Go to dashboard"
          title="Go to dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="text-xs mt-1">Dashboard</span>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center p-2 text-[var(--charcoal)]/60 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="min-w-[200px]">
            <DropdownMenuItem className="cursor-default font-medium text-[var(--primary)]">
              {userName}'s Memories
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {relationshipId && (
              <>
                {onShowInvite && (
                  <DropdownMenuItem onClick={onShowInvite}>
                    Share Invite Code
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => handleNavigation("dashboard")}>
                  Manage Relationships
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
