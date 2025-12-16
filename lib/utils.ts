import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "../components/ui/use-toast";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Global notification utility using the toast system
export const notify = {
  success: (message: string, description?: string) => {
    toast({
      title: message,
      description: description,
      variant: "default", // or "success" if you add it
    });
  },
  error: (message: string, description?: string) => {
    toast({
      title: message,
      description: description,
      variant: "destructive",
    });
  },
  info: (message: string, description?: string) => {
    toast({
      title: message,
      description: description,
      variant: "default",
    });
  },
};