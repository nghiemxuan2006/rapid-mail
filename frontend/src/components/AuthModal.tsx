import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { signInWithGoogle, ready, loading } = useGoogleAuth();

  const handleGoogleSignIn = () => {
    onOpenChange(false);
    signInWithGoogle();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome to Rapidmail
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Sign in to start sending powerful email campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl text-base font-medium hover:bg-accent transition-all"
            onClick={handleGoogleSignIn}
            disabled={!ready || loading}
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? 'Opening Google...' : 'Continue with Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl text-base font-medium opacity-50 cursor-not-allowed"
            disabled
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M24 7.387v9.226a3.387 3.387 0 01-3.387 3.387h-8.84L24 7.387z" fill="#28A8EA" />
              <path d="M24 7.387L11.773 20H3.387A3.387 3.387 0 010 16.613V7.387A3.387 3.387 0 013.387 4h17.226A3.387 3.387 0 0124 7.387z" fill="#0078D4" />
              <path d="M7.71 15.194a3.484 3.484 0 100-6.968 3.484 3.484 0 000 6.968z" fill="#fff" />
              <path d="M7.71 9.29c-.967 0-1.806.645-2.065 1.548h4.129A2.323 2.323 0 007.71 9.29zm-2.065 3.097a2.323 2.323 0 002.065 1.548c.967 0 1.806-.645 2.065-1.548H5.645z" fill="#0078D4" />
            </svg>
            Continue with Outlook (coming soon)
          </Button>
        </div>

        <div className="text-xs text-center text-muted-foreground pt-2">
          By continuing, you agree to our{' '}
          <a href="#" className="underline hover:text-primary">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-primary">Privacy Policy</a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
