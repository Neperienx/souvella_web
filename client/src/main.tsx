import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add custom CSS for the app theme
const style = document.createElement('style');
style.innerHTML = `
  :root {
    --primary-light: #FBE2E8;
    --primary: #F8C4D4;
    --primary-dark: #E5A7B7;
    --secondary-light: #E3E3FF;
    --secondary: #D0D1FF;
    --secondary-dark: #B3B4E3;
    --accent-light: #D4F2E3;
    --accent: #BDEBD7;
    --accent-dark: #9CD4B9;
    --cream: #FFF9F0;
    --charcoal: #5A5A5A;
  }

  .paper-clip {
    position: absolute;
    top: -8px;
    right: 10%;
    width: 40px;
    height: 60px;
    background-color: #A0A0A0;
    clip-path: polygon(50% 0%, 90% 20%, 100% 60%, 100% 100%, 80% 100%, 50% 90%, 20% 100%, 0% 100%, 0% 60%, 10% 20%);
    opacity: 0.6;
    transform: rotate(5deg);
  }

  .tape {
    position: absolute;
    height: 28px;
    background-color: rgba(208, 209, 255, 0.7);
    transform: rotate(-2deg);
  }

  .polaroid {
    transition: transform 0.3s ease;
  }

  .polaroid:hover {
    transform: translateY(-5px) rotate(-1deg);
  }

  .memory-card {
    transition: all 0.3s ease;
    transform-origin: center bottom;
  }

  .memory-card:hover {
    transform: translateY(-8px);
  }

  .like-badge {
    transition: all 0.3s ease;
  }

  .like-badge:hover {
    transform: scale(1.2);
  }

  .react-btn:active {
    transform: scale(0.9);
  }
    
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  .float-animation {
    animation: float 8s ease-in-out infinite;
  }
    
  .daily-reminder {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(248, 196, 212, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(248, 196, 212, 0); }
    100% { box-shadow: 0 0 0 0 rgba(248, 196, 212, 0); }
  }

  .font-sans {
    font-family: "Lato", sans-serif;
  }

  .font-serif {
    font-family: "Playfair Display", serif;
  }

  .font-script {
    font-family: "Dancing Script", cursive;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
