import { useState, useEffect, useCallback } from 'react';
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
import { User, Mail, Plus, Trash2, Loader2, CheckCircle2, Zap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hook';
import { setUserProfile, setConnectedAccounts, setActiveAccountId } from '@/features/auth/authSlice';
import type { ConnectedAccount } from '@/features/auth/authSlice';
import { getUserProfile, connectGmailAccount, connectOutlookAccount, disconnectAccount, activateAccount } from '@/features/user/userApi';
import { useGoogleLogin } from '@react-oauth/google';
import { GMAIL_SCOPES } from '@/constants';
import { toast } from 'sonner';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string;
const BACKEND_URL = import.meta.env.VITE_BASE_URL as string;

const OUTLOOK_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/Mail.Send',
].join(' ');

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'sending'>('profile');
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [userName, setUserName] = useState(user?.name || 'User');
  const userEmail = user?.email || '';
  const connectedAccounts: ConnectedAccount[] = user?.connectedAccounts || [];
  const activeAccountId = user?.activeAccountId ?? null;
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<'gmail' | 'outlook' | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && (!user?.email || !user?.name) && !isLoadingProfile) {
      setIsLoadingProfile(true);
      dispatch(getUserProfile())
        .unwrap()
        .then((result) => {
          dispatch(setUserProfile({
            email: result.email,
            name: result.name,
            connectedAccounts: result.connectedAccounts || [],
            activeAccountId: result.activeAccountId,
          }));
          setUserName(result.name || 'User');
        })
        .catch(() => {})
        .finally(() => setIsLoadingProfile(false));
    } else if (open && user?.connectedAccounts === undefined) {
      dispatch(getUserProfile())
        .unwrap()
        .then((result) => {
          dispatch(setConnectedAccounts({
            connectedAccounts: result.connectedAccounts || [],
            activeAccountId: result.activeAccountId,
          }));
        })
        .catch(() => {});
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (user?.name) setUserName(user.name);
  }, [user?.name]);

  const handleGmailConnected = useCallback(async (code: string) => {
    setConnectingProvider('gmail');
    try {
      const result = await dispatch(connectGmailAccount(code)).unwrap();
      dispatch(setConnectedAccounts({ connectedAccounts: result.connectedAccounts, activeAccountId: result.activeAccountId }));
      toast.success('Gmail account connected successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to connect Gmail account');
    } finally {
      setConnectingProvider(null);
    }
  }, [dispatch]);

  const handleActivateAccount = async (accountId: string) => {
    setActivatingId(accountId);
    try {
      await dispatch(activateAccount(accountId)).unwrap();
      dispatch(setActiveAccountId(accountId));
      toast.success('Active sending account updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set active account');
    } finally {
      setActivatingId(null);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: GMAIL_SCOPES.join(' '),
    onSuccess: (response) => {
      if (response.code) void handleGmailConnected(response.code);
    },
    onError: () => {
      setConnectingProvider(null);
      toast.error('Google authentication failed');
    },
  });

  const handleConnectGmail = () => {
    setConnectingProvider('gmail');
    googleLogin();
  };

  const handleConnectOutlook = () => {
    if (!MICROSOFT_CLIENT_ID) {
      toast.error('Microsoft OAuth is not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: OUTLOOK_SCOPES,
      state: 'outlook',
      response_mode: 'query',
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    const popup = window.open(authUrl, 'ms-oauth', 'width=500,height=650,left=200,top=100');

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return;
    }

    setConnectingProvider('outlook');

    let messageReceived = false;

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'OAUTH_CALLBACK') return;

      messageReceived = true;
      window.removeEventListener('message', handleMessage);
      clearInterval(timer);

      const { code } = event.data;
      if (!code) {
        setConnectingProvider(null);
        toast.error('No authorization code received from Microsoft');
        return;
      }

      try {
        const result = await dispatch(connectOutlookAccount(code)).unwrap();
        dispatch(setConnectedAccounts({ connectedAccounts: result.connectedAccounts, activeAccountId: result.activeAccountId }));
        toast.success('Outlook account connected successfully!');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to connect Outlook account');
      } finally {
        setConnectingProvider(null);
      }
    };

    window.addEventListener('message', handleMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        if (!messageReceived) {
          window.removeEventListener('message', handleMessage);
          setConnectingProvider(null);
        }
      }
    }, 500);
  };

  const handleRemoveAccount = async (accountId: string) => {
    setDisconnectingId(accountId);
    try {
      const result = await dispatch(disconnectAccount(accountId)).unwrap();
      dispatch(setConnectedAccounts({ connectedAccounts: result.connectedAccounts, activeAccountId: result.activeAccountId }));
      toast.success('Account disconnected');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to disconnect account');
    } finally {
      setDisconnectingId(null);
    }
  };

  const navButtonClass = (tab: 'profile' | 'sending') =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
      ? 'bg-[#9d7d59] text-white'
      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
    }`;

  const providerIcon = (provider: 'gmail' | 'outlook') => {
    if (provider === 'gmail') {
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      );
    }
    return (
      <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
        <rect width="10" height="10" fill="#F25022" />
        <rect x="11" width="10" height="10" fill="#7FBA00" />
        <rect y="11" width="10" height="10" fill="#00A4EF" />
        <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
      </svg>
    );
  };

  const providerBgClass = (provider: 'gmail' | 'outlook') =>
    provider === 'gmail'
      ? 'bg-red-100 dark:bg-red-900/20'
      : 'bg-blue-100 dark:bg-blue-900/20';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-none w-[95vw] h-[90vh] p-0 gap-0">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/30 p-6 shrink-0">
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
                      <div className="h-20 w-20 rounded-full bg-[#9d7d59] text-white flex items-center justify-center text-2xl font-semibold shrink-0">
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
                    <div className="flex items-center justify-between">
                      <Label>Connected Accounts</Label>
                      {connectedAccounts.length > 0 && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {connectedAccounts.length} connected
                        </span>
                      )}
                    </div>

                    {connectedAccounts.length === 0 ? (
                      <div className="border rounded-lg p-8 text-center">
                        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium mb-1">No accounts connected</p>
                        <p className="text-xs text-muted-foreground">
                          Connect a Gmail or Outlook account below to start sending campaigns
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {connectedAccounts.map((account) => {
                          const isActive = activeAccountId === account.id;
                          return (
                            <div
                              key={account.id}
                              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isActive ? 'border-[#9d7d59] bg-[#9d7d59]/5' : 'bg-card hover:bg-accent/50'}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${providerBgClass(account.provider)}`}>
                                  {providerIcon(account.provider)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{account.email}</p>
                                    {isActive && (
                                      <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-[#9d7d59] text-white">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {account.provider} · Connected
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {!isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleActivateAccount(account.id)}
                                    disabled={activatingId === account.id}
                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-[#9d7d59] hover:bg-[#9d7d59]/10"
                                  >
                                    {activatingId === account.id
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <><Zap className="h-3.5 w-3.5 mr-1" />Set active</>}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveAccount(account.id)}
                                  disabled={disconnectingId === account.id}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  {disconnectingId === account.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Add Account</Label>
                    <div className="grid gap-3">
                      <Button
                        variant="outline"
                        className="justify-start h-auto p-4"
                        onClick={handleConnectGmail}
                        disabled={connectingProvider === 'gmail'}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">Connect Gmail</p>
                            <p className="text-xs text-muted-foreground">
                              Send campaigns using your Gmail account
                            </p>
                          </div>
                          {connectingProvider === 'gmail'
                            ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            : <Plus className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className="justify-start h-auto p-4"
                        onClick={handleConnectOutlook}
                        disabled={connectingProvider === 'outlook'}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
                              <rect width="10" height="10" fill="#F25022" />
                              <rect x="11" width="10" height="10" fill="#7FBA00" />
                              <rect y="11" width="10" height="10" fill="#00A4EF" />
                              <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">Connect Outlook</p>
                            <p className="text-xs text-muted-foreground">
                              Send campaigns using your Outlook / Microsoft account
                            </p>
                          </div>
                          {connectingProvider === 'outlook'
                            ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            : <Plus className="h-5 w-5 text-muted-foreground" />}
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
