import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSignature, Plus, Edit2, ChevronDown, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import TrumbowEditor from '@/components/editor/TrumbowEditor';
import type { ConnectedAccount } from '@/features/auth/authSlice';
import type { GmailSignature, Signature } from '@/features/signature/signatureApi';
import { ProviderIcon, providerBgClass } from './ProviderIcon';

interface SignaturesTabProps {
  connectedAccounts: ConnectedAccount[];
  signaturesByAccount: Record<string, GmailSignature[]>;
  mongoSignatures: Signature[];
  loadingAccountIds: Set<string>;
  expandedAccountId: string | null;
  editingAccountId: string | null;
  editingContent: Record<string, string>;
  savingSignatureEmail: string | null;
  onToggleExpand: (accountId: string) => void;
  onImportAlias: (accountId: string, alias: string, signature: string) => void;
  onContentChange: (accountId: string, val: string) => void;
  onCancelEdit: (accountId: string) => void;
  onStartEdit: (accountId: string, content: string) => void;
  onSave: (sendAsEmail: string, accountId: string) => void;
}


export function SignaturesTab({
  connectedAccounts,
  signaturesByAccount,
  mongoSignatures,
  loadingAccountIds,
  expandedAccountId,
  editingAccountId,
  editingContent,
  savingSignatureEmail,
  onToggleExpand,
  onImportAlias,
  onContentChange,
  onCancelEdit,
  onStartEdit,
  onSave,
}: SignaturesTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Email Signatures</h2>
        <p className="text-sm text-muted-foreground">Manage signatures for each connected email account</p>
      </div>

      <Separator />

      {connectedAccounts.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No email accounts connected yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connectedAccounts.map((account) => {
            const isExpanded = expandedAccountId === account.id;
            const isEditing = editingAccountId === account.id;
            const isLoadingSignatures = loadingAccountIds.has(account.id);
            const accountSignatures = signaturesByAccount[account.id] ?? [];
            const mongoSig = mongoSignatures.find(s => s.sourceEmail === account.email);
            const selectedSig = accountSignatures.find(s => s.isPrimary) ?? accountSignatures[0];
            const editorContent = editingContent[account.id] ?? mongoSig?.content ?? selectedSig?.signature ?? '';
            const selectedAlias = editingContent[`alias_${account.id}`] || account.email;
            const resolvedAlias = accountSignatures.find(s => s.sendAsEmail === selectedAlias);

            return (
              <div
                key={account.id}
                className={`border rounded-lg transition-colors ${isExpanded ? 'border-[#9d7d59]' : 'border-border'}`}
              >
                <button
                  onClick={() => onToggleExpand(account.id)}
                  className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${providerBgClass(account.provider)}`}>
                      <ProviderIcon provider={account.provider} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{account.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{account.provider}</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="p-4 bg-background border-t space-y-4">
                    {isLoadingSignatures ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        <Select
                          value=""
                          onValueChange={(alias) => {
                            const sig = accountSignatures.find(s => s.sendAsEmail === alias);
                            onImportAlias(account.id, alias, sig?.signature ?? '');
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Import signature from send-as address..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accountSignatures.length === 0 ? (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                No send-as addresses found
                              </div>
                            ) : (
                              accountSignatures.map(s => (
                                <SelectItem key={s.sendAsEmail} value={s.sendAsEmail}>
                                  <span>{s.displayName ? `${s.displayName} (${s.sendAsEmail})` : s.sendAsEmail}</span>
                                  {s.isPrimary && <span className="ml-2 text-xs text-muted-foreground">· Primary</span>}
                                  {s.isDefault && <span className="ml-1 text-xs text-muted-foreground">· Default</span>}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>

                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="">
                              <TrumbowEditor
                                value={editorContent}
                                onChange={(val: string) => onContentChange(account.id, val)}
                                placeholder="Type your signature here..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                disabled={savingSignatureEmail === selectedAlias}
                                onClick={() => onCancelEdit(account.id)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="flex-1"
                                disabled={savingSignatureEmail === selectedAlias}
                                onClick={() => onSave(resolvedAlias?.sendAsEmail ?? account.email, account.id)}
                              >
                                {savingSignatureEmail === selectedAlias
                                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                                  : 'Save'}
                              </Button>
                            </div>
                          </div>
                        ) : (mongoSig?.content || selectedSig?.signature) ? (
                          <div className="space-y-3">
                            <div className="border-2 border-[#9d7d59] rounded-lg p-6 bg-background w-full overflow-hidden">
                              <div
                                className="text-sm"
                                dangerouslySetInnerHTML={{ __html: mongoSig?.content ?? selectedSig?.signature ?? '' }}
                              />
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => onStartEdit(account.id, mongoSig?.content ?? selectedSig?.signature ?? '')}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Signature
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground mb-3">No signature set for this account</p>
                            <Button variant="outline" onClick={() => onStartEdit(account.id, '')}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Signature
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
