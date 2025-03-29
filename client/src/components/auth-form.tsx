import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmail, createUserWithEmail } from "../lib/firebase";
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
      <div className="text-center">
        <p className="text-[var(--primary-dark)] font-medium mb-4">Sign in with your email and password</p>
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