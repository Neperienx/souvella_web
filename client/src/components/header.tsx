import { useState } from "react";
import { logOut } from "../lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Relationship } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  userName: string;
  notifications: number;
  photoURL?: string;
  relationship?: Relationship | null;
  onShowInvite?: () => void;
}

export default function Header({ userName, notifications, photoURL, relationship, onShowInvite }: HeaderProps) {
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await logOut();
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
    <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-full flex items-center justify-center">
            <span className="font-script text-xl text-white">MJ</span>
          </div>
          <h1 className="font-serif text-xl md:text-2xl hidden sm:block">Memory Jar</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-1 text-sm bg-[var(--cream)] py-1 px-3 rounded-full shadow-sm hover:bg-[var(--primary-light)] transition-colors">
                <span className="font-medium">{relationship ? `${userName}'s Memories` : "No Partner Yet"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                </svg>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent>
                {relationship && onShowInvite ? (
                  <>
                    <DropdownMenuItem onClick={onShowInvite}>
                      Share Invite Code
                    </DropdownMenuItem>
                  </>
                ) : null}
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <button className="daily-reminder p-2 bg-[var(--secondary)]/40 rounded-full hover:bg-[var(--secondary)]/70 transition-all relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--primary)] w-4 h-4 rounded-full text-xs flex items-center justify-center text-white">
                {notifications}
              </span>
            )}
          </button>
          
          <div className="h-10 w-10 rounded-full bg-[var(--primary-light)] flex items-center justify-center overflow-hidden">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="object-cover w-full h-full" />
            ) : (
              <span className="font-medium text-sm">{userName.charAt(0)}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
