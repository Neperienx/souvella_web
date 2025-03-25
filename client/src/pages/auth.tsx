import { useState } from "react";
import AuthForm from "../components/auth-form";

export default function AuthPage() {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--cream)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 relative overflow-hidden">
        <div className="tape w-20 -left-5 top-6 rotate-45"></div>
        <div className="tape w-24 -right-5 top-12 -rotate-12"></div>
        
        <h1 className="font-serif text-4xl text-center mb-2">Memory Jar</h1>
        <p className="font-script text-2xl text-center text-[var(--primary-dark)] mb-8">Where love stories live</p>
        
        <div className="flex justify-center mb-8">
          <img 
            src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80" 
            alt="Love memories illustration" 
            className="w-40 h-40 object-cover rounded-full border-4 border-white shadow-md float-animation"
          />
        </div>
        
        <AuthForm />
      </div>
    </div>
  );
}
