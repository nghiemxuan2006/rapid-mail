import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Plus, Trash2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hook';
import { setUserProfile } from '@/features/auth/authSlice';
import { getUserProfile } from '@/features/user/userApi';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook';
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'sending'>('profile');
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [userName, setUserName] = useState(user?.name || 'User');
  const userEmail = user?.email || '';
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([
    { id: '1', email: userEmail, provider: 'gmail' },
  ]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fetch user profile khi modal mở nếu chưa có data user
  useEffect(() => {
    if (open && (!user?.email || !user?.name) && !isLoadingProfile) {
      setIsLoadingProfile(true);
      const fetchProfile = async () => {
        try {
          const result = await dispatch(getUserProfile()).unwrap();
          dispatch(setUserProfile({
            email: result.email,
            name: result.name,
          }));
          setUserName(result.name || 'User');
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      };
      fetchProfile();
    }
  }, [open, dispatch]);

  const handleRemoveAccount = (id: string) => {
    setEmailAccounts(emailAccounts.filter((acc) => acc.id !== id));
  };

  const navButtonClass = (tab: 'profile' | 'sending') =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
      ? 'bg-[#9d7d59] text-white'
      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-none w-[95vw] h-[90vh] p-0 gap-0">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/30 p-6 flex-shrink-0">
            <DialogHeader className="mb-6">
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <nav className="space-y-2">
              <button onClick={() => setActiveTab('profile')} className={navButtonClass('profile')}>
                <User className="h-4 w-4" />
                Profile
              </button>
              <button onClick={() => setActiveTab('sending')} className={navButtonClass('sending')}>
                <Mail className="h-4 w-4" />
                Sending Settings
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-auto">
              {activeTab === 'profile' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Personal Information</h2>
                    <p className="text-sm text-muted-foreground">
                      Update your personal details and avatar
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 rounded-full bg-[#9d7d59] text-white flex items-center justify-center text-2xl font-semibold flex-shrink-0">
                        {userName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm">
                          Upload Photo
                        </Button>
                        <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="settings-name">Full Name</Label>
                    <Input
                      id="settings-name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settings-email">Email</Label>
                    <Input
                      id="settings-email"
                      type="email"
                      value={userEmail}
                      placeholder="Enter your email"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      This is your login email and cannot be changed
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'sending' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Email Accounts</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage email accounts used to send campaigns
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Connected Accounts</Label>
                    {emailAccounts.length === 0 ? (
                      <div className="border rounded-lg p-8 text-center">
                        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No email accounts connected yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {emailAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-[#9d7d59] text-white flex items-center justify-center flex-shrink-0">
                                <Mail className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">{account.email}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {account.provider} • Connected
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAccount(account.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Connect Email Address</Label>
                    <div className="grid gap-3">
                      <Button variant="outline" className="justify-start h-auto p-4">
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">Connect with Gmail</p>
                            <p className="text-xs text-muted-foreground">
                              Send emails using your Gmail account
                            </p>
                          </div>
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Button>

                      <Button variant="outline" className="justify-start h-auto p-4">
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-5 w-5" viewBox="0 0 48 48">
                              <path fill="#0078D4" d="M24,4C13,4,4,13,4,24s9,20,20,20s20-9,20-20S35,4,24,4z" />
                              <path fill="#FFF" d="M24,11c-7.2,0-13,5.8-13,13s5.8,13,13,13s13-5.8,13-13S31.2,11,24,11z M24,34c-5.5,0-10-4.5-10-10s4.5-10,10-10s10,4.5,10,10S29.5,34,24,34z" />
                              <path fill="#FFF" d="M28.5,20.5h-9c-0.3,0-0.5,0.2-0.5,0.5v6c0,0.3,0.2,0.5,0.5,0.5h9c0.3,0,0.5-0.2,0.5-0.5v-6C29,20.7,28.8,20.5,28.5,20.5z M27,26h-6v-4h6V26z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">Connect with Outlook</p>
                            <p className="text-xs text-muted-foreground">
                              Send emails using your Outlook account
                            </p>
                          </div>
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-muted/30 px-6 py-4">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {activeTab === 'profile' ? 'Cancel' : 'Close'}
                </Button>
                {activeTab === 'profile' && <Button>Save Changes</Button>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
