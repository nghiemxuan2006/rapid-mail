import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Mail, FileSignature } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hook';
import { setUserProfile, setConnectedAccounts, setActiveAccountId } from '@/features/auth/authSlice';
import type { ConnectedAccount } from '@/features/auth/authSlice';
import { getUserProfile, connectGmailAccount, connectOutlookAccount, disconnectAccount, activateAccount } from '@/features/user/userApi';
import {
  getSignaturesByAccountApi,
  listSignaturesApi,
  createSignatureApi,
  updateSignatureApi,
  type GmailSignature,
  type Signature,
} from '@/features/signature/signatureApi';
import { useGoogleLogin } from '@react-oauth/google';
import { GMAIL_SCOPES } from '@/constants';
import { toast } from 'sonner';
import { ProfileTab } from './settings/ProfileTab';
import { SendingSettingsTab } from './settings/SendingSettingsTab';
import { SignaturesTab } from './settings/SignaturesTab';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string;

const OUTLOOK_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/Mail.Send',
].join(' ');

type Tab = 'profile' | 'sending' | 'signatures';

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
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

  const [signaturesByAccount, setSignaturesByAccount] = useState<Record<string, GmailSignature[]>>({});
  const [mongoSignatures, setMongoSignatures] = useState<Signature[]>([]);
  const [loadingAccountIds, setLoadingAccountIds] = useState<Set<string>>(new Set());
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [savingSignatureEmail, setSavingSignatureEmail] = useState<string | null>(null);

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

  useEffect(() => {
    if (open && mongoSignatures.length === 0) {
      dispatch(listSignaturesApi())
        .unwrap()
        .then(setMongoSignatures)
        .catch(() => {});
    }
  }, [open, dispatch]);

  const loadAccountSignatures = (accountId: string) => {
    if (signaturesByAccount[accountId] || loadingAccountIds.has(accountId)) return;
    setLoadingAccountIds(prev => new Set(prev).add(accountId));
    dispatch(getSignaturesByAccountApi(accountId))
      .unwrap()
      .then((sigs) => setSignaturesByAccount(prev => ({ ...prev, [accountId]: sigs })))
      .catch(() => toast.error('Failed to load signatures'))
      .finally(() => setLoadingAccountIds(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      }));
  };

  const handleToggleExpand = (accountId: string) => {
    const next = expandedAccountId === accountId ? null : accountId;
    setExpandedAccountId(next);
    if (next) {
      const account = connectedAccounts.find(a => a.id === accountId);
      if (account?.provider === 'gmail') loadAccountSignatures(accountId);
    }
  };

  const handleImportAlias = (accountId: string, alias: string, signature: string) => {
    setEditingContent(prev => ({
      ...prev,
      [`alias_${accountId}`]: alias,
      [accountId]: signature,
    }));
    setEditingAccountId(accountId);
  };

  const handleSaveSignature = async (sendAsEmail: string, accountId: string) => {
    const content = editingContent[accountId] ?? '';
    setSavingSignatureEmail(sendAsEmail);
    try {
      const existing = mongoSignatures.find(s => s.sourceEmail === sendAsEmail);
      if (existing) {
        const updated = await dispatch(updateSignatureApi({ id: existing._id, content })).unwrap();
        setMongoSignatures(prev => prev.map(s => s._id === updated._id ? updated : s));
      } else {
        const created = await dispatch(createSignatureApi({
          name: sendAsEmail,
          content,
          sourceEmail: sendAsEmail,
          provider: 'gmail',
        })).unwrap();
        setMongoSignatures(prev => [...prev, created]);
      }
      setEditingAccountId(null);
      toast.success('Signature saved');
    } catch {
      toast.error('Failed to save signature');
    } finally {
      setSavingSignatureEmail(null);
    }
  };

  const handleCancelEdit = (accountId: string) => {
    setEditingAccountId(null);
    setEditingContent(prev => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
  };

  const handleStartEdit = (accountId: string, content: string) => {
    setEditingAccountId(accountId);
    setEditingContent(prev => ({ ...prev, [accountId]: content }));
  };

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

  const navButtonClass = (tab: Tab) =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'bg-[#9d7d59] text-white'
        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-none w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="border-b px-6 py-4 shrink-0">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-64 border-r bg-muted/30 p-6 shrink-0 overflow-y-auto">
            <nav className="space-y-2">
              <button onClick={() => setActiveTab('profile')} className={navButtonClass('profile')}>
                <User className="h-4 w-4" />
                Profile
              </button>
              <button onClick={() => setActiveTab('sending')} className={navButtonClass('sending')}>
                <Mail className="h-4 w-4" />
                Sending Settings
              </button>
              <button onClick={() => setActiveTab('signatures')} className={navButtonClass('signatures')}>
                <FileSignature className="h-4 w-4" />
                Signatures
              </button>
            </nav>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === 'profile' && (
                <ProfileTab
                  userName={userName}
                  userEmail={userEmail}
                  onNameChange={setUserName}
                />
              )}
              {activeTab === 'sending' && (
                <SendingSettingsTab
                  connectedAccounts={connectedAccounts}
                  activeAccountId={activeAccountId}
                  connectingProvider={connectingProvider}
                  disconnectingId={disconnectingId}
                  activatingId={activatingId}
                  onConnectGmail={handleConnectGmail}
                  onConnectOutlook={handleConnectOutlook}
                  onActivate={handleActivateAccount}
                  onRemove={handleRemoveAccount}
                />
              )}
              {activeTab === 'signatures' && (
                <SignaturesTab
                  connectedAccounts={connectedAccounts}
                  signaturesByAccount={signaturesByAccount}
                  mongoSignatures={mongoSignatures}
                  loadingAccountIds={loadingAccountIds}
                  expandedAccountId={expandedAccountId}
                  editingAccountId={editingAccountId}
                  editingContent={editingContent}
                  savingSignatureEmail={savingSignatureEmail}
                  onToggleExpand={handleToggleExpand}
                  onImportAlias={handleImportAlias}
                  onContentChange={(accountId, val) => setEditingContent(prev => ({ ...prev, [accountId]: val }))}
                  onCancelEdit={handleCancelEdit}
                  onStartEdit={handleStartEdit}
                  onSave={handleSaveSignature}
                />
              )}
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4 shrink-0">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {activeTab === 'profile' && <Button>Save Changes</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
