import AuthForm from "../components/auth-form";
import SouvellaLogo from "../components/logo";

export default function AuthPage() {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--cream)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 relative overflow-hidden">
        <div className="tape w-20 -left-5 top-6 rotate-45"></div>
        <div className="tape w-24 -right-5 top-12 -rotate-12"></div>
        
        <h1 className="font-serif text-4xl text-center mb-2">Souvella</h1>
        <p className="font-script text-2xl text-center text-[var(--primary-dark)] mb-8">Where memories come to life</p>
        
        <div className="flex justify-center mb-8">
          <SouvellaLogo size={120} className="float-animation" />
        </div>
        
        <AuthForm />
      </div>
    </div>
  );
}
