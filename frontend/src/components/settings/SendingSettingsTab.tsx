import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, Plus, Trash2, Loader2, CheckCircle2, Zap } from 'lucide-react';
import type { ConnectedAccount } from '@/features/auth/authSlice';
import { ProviderIcon, providerBgClass } from './ProviderIcon';

interface SendingSettingsTabProps {
  connectedAccounts: ConnectedAccount[];
  activeAccountId: string | null;
  connectingProvider: 'gmail' | 'outlook' | null;
  disconnectingId: string | null;
  activatingId: string | null;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
  onActivate: (accountId: string) => void;
  onRemove: (accountId: string) => void;
}

export function SendingSettingsTab({
  connectedAccounts,
  activeAccountId,
  connectingProvider,
  disconnectingId,
  activatingId,
  onConnectGmail,
  onConnectOutlook,
  onActivate,
  onRemove,
}: SendingSettingsTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Connected Accounts</h2>
        <span className="text-sm text-muted-foreground">{connectedAccounts.length} connected</span>
      </div>

      <Separator />

      <div className="space-y-3">
        {connectedAccounts.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No email accounts connected yet</p>
          </div>
        ) : (
          connectedAccounts.map((account) => {
            const isActive = activeAccountId === account.id;
            return (
              <div
                key={account.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#f5f0eb] dark:bg-[#3d3529] border-[#9d7d59]'
                    : 'bg-card hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${providerBgClass(account.provider)}`}>
                    <ProviderIcon provider={account.provider} size="lg" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{account.email}</p>
                      {isActive && (
                        <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-[#9d7d59] text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                      <span className="capitalize">{account.provider}</span>
                      <span>·</span>
                      <span>Connected</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {!isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onActivate(account.id)}
                      disabled={activatingId === account.id}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {activatingId === account.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Zap className="h-4 w-4 mr-1.5" />Set active</>}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(account.id)}
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
          })
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Connect Email Address</Label>
        <div className="grid gap-3">
          <Button
            variant="outline"
            className="justify-start h-auto p-4"
            onClick={onConnectGmail}
            disabled={connectingProvider === 'gmail'}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <ProviderIcon provider="gmail" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Connect with Gmail</p>
                <p className="text-xs text-muted-foreground">Send emails using your Gmail account</p>
              </div>
              {connectingProvider === 'gmail'
                ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                : <Plus className="h-5 w-5 text-muted-foreground" />}
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto p-4"
            onClick={onConnectOutlook}
            disabled={connectingProvider === 'outlook'}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <ProviderIcon provider="outlook" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Connect with Outlook</p>
                <p className="text-xs text-muted-foreground">Send emails using your Outlook account</p>
              </div>
              {connectingProvider === 'outlook'
                ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                : <Plus className="h-5 w-5 text-muted-foreground" />}
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
