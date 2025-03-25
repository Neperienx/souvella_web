import { useState, useEffect } from "react";
import { auth, handleRedirectResult } from "../lib/firebase";
import { User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Handle redirect result
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const redirectUser = await handleRedirectResult();
        // The redirect result will be handled by the auth state observer
      } catch (error) {
        console.error("Redirect sign-in error:", error);
        toast({
          title: "Authentication Error",
          description: "There was an issue with the redirect sign-in. Please try again.",
          variant: "destructive",
        });
      }
    };

    checkRedirectResult();
  }, [toast]);

  // Auth state observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in, register or fetch user from our backend
          const response = await apiRequest("POST", "/api/auth/user", {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || `User-${firebaseUser.uid.substring(0, 5)}`,
            email: firebaseUser.email || "",
            photoURL: firebaseUser.photoURL || ""
          });
          
          if (!response.ok) {
            throw new Error("Failed to register user with backend");
          }
          
          setUser(firebaseUser);
        } else {
          // User is signed out
          setUser(null);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        toast({
          title: "Authentication Error",
          description: "There was an issue with your account. Please try again.",
          variant: "destructive",
        });
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast]);

  return { user, loading };
}
