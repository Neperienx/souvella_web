import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithGoogle, signInWithEmail, createUserWithEmail } from "../lib/firebase";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      // Auth state change will be handled by the useAuth hook
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      if (isLogin) {
        await signInWithEmail(data.email, data.password);
      } else {
        await createUserWithEmail(data.email, data.password);
      }
      // Auth state change will be handled by the useAuth hook
    } catch (error) {
      console.error("Email auth error:", error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : `Failed to ${isLogin ? "sign in" : "sign up"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full py-3 px-4 bg-[var(--secondary)]/90 hover:bg-[var(--secondary)] transition rounded-xl shadow-md flex items-center justify-center space-x-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 186.69 190.5">
          <path fill="#4285f4" d="M95.25 77.932v36.888h51.262c-2.251 11.863-9.006 21.908-19.137 28.662l30.913 23.986c18.011-16.625 28.402-41.044 28.402-70.052 0-6.754-.606-13.249-1.732-19.483z"/>
          <path fill="#34a853" d="M41.87 113.969l-6.849 5.327-24.258 18.86c15.04 29.699 46.114 50.111 81.775 50.111 24.844 0 45.723-8.187 60.966-22.126L123.6 142.156c-16.969 11.334-38.821 18.051-61.069 18.051-33.321 0-61.263-22.127-70.664-51.969z"/>
          <path fill="#fbbc05" d="M41.87 76.989c-4.009 11.83-6.255 24.435-6.255 37.502 0 13.094 2.246 25.709 6.255 37.531l31.099-24.252c-2.02-7.479-3.203-15.269-3.203-23.295s1.183-15.824 3.203-23.278z"/>
          <path fill="#ea4335" d="M95.25 43.937c22.46 0 36.07 9.693 44.377 17.768l27.937-27.119C150.149 19.233 124.993 8 95.25 8 59.579 8 28.51 28.4 13.462 58.101l31.088 24.203c9.401-29.859 37.343-51.967 70.699-51.967z"/>
        </svg>
        <span className="font-medium">{isLoading ? "Signing in..." : "Sign in with Google"}</span>
      </button>
      
      <div className="flex items-center my-4">
        <div className="flex-grow h-px bg-gray-300"></div>
        <span className="px-3 text-gray-500 text-sm">or</span>
        <div className="flex-grow h-px bg-gray-300"></div>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input 
            {...form.register("email")}
            type="email" 
            placeholder="Email" 
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none"
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>
        
        <div>
          <input 
            {...form.register("password")}
            type="password" 
            placeholder="Password" 
            className="w-full p-3 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none"
          />
          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>
        
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-[var(--primary)]/90 hover:bg-[var(--primary)] transition rounded-xl shadow-md font-medium"
        >
          {isLoading ? "Processing..." : isLogin ? "Sign in with Email" : "Sign up with Email"}
        </button>
      </form>
      
      <p className="text-sm text-center mt-6">
        {isLogin ? "Don't have an account?" : "Already have an account?"} 
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-[var(--primary-dark)] font-medium hover:underline ml-1"
        >
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
