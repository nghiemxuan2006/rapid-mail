import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/app/hook';
import { getSignaturesApi, updateSignatureApi, type Signature } from '@/features/signature/signatureApi';
import SignatureEditModal from '@/components/email-template/SignatureEditModal';

const Signatures = () => {
    const dispatch = useAppDispatch();
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSignatures = async () => {
            setIsLoading(true);
            try {
                const res = await dispatch(getSignaturesApi()).unwrap();
                setSignatures(res);
            } catch (error) {
                console.error('Failed to fetch signatures:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSignatures();
    }, [dispatch]);

    const handleEditClick = (signature: Signature, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedSignature(signature);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedSignature(null);
    };

    const handleSaveSignature = async (updatedSignature: Signature) => {
        setIsSaving(true);
        try {
            await dispatch(updateSignatureApi({
                sendAsEmail: updatedSignature.sendAsEmail,
                signature: updatedSignature.signature,
            })).unwrap();

            setSignatures(signatures.map(sig =>
                sig.sendAsEmail === updatedSignature.sendAsEmail ? updatedSignature : sig
            ));

            console.log('Signature updated:', updatedSignature);
            handleCloseEditModal();
        } catch (error) {
            console.error('Failed to update signature:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-foreground">Signatures</h1>
                <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold text-[15px] cursor-pointer shadow-md hover:bg-primary/90 hover:-translate-y-px">
                    Create New Signature
                </button>
            </div>

            {isLoading ? (
                <div className="text-center p-12 text-lg text-muted-foreground">Loading...</div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(500px,1fr))] gap-6 max-md:grid-cols-1">
                    {signatures.length === 0 ? (
                        <div className="text-center py-16 px-8">
                            <p className="text-lg text-muted-foreground">No signatures found. Create your first signature!</p>
                        </div>
                    ) : (
                        signatures.map((signature) => (
                            <div key={signature.sendAsEmail} className="bg-card rounded-2xl p-7 shadow-md border border-border flex flex-col gap-5 relative overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-muted-foreground/30 transition-all duration-300">
                                <div className="flex justify-between items-start gap-5 pb-4 border-b-2 border-muted">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[22px] font-bold text-foreground leading-tight break-words mb-1.5">
                                            {signature.displayName || 'Email Signature'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground font-medium break-all">{signature.sendAsEmail}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className="bg-transparent border border-border px-3 py-1.5 rounded-md text-sm text-muted-foreground cursor-pointer hover:bg-accent hover:border-muted-foreground/50 hover:text-foreground"
                                            title="Edit"
                                            onClick={(e) => handleEditClick(signature, e)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="bg-transparent border border-border px-3 py-1.5 rounded-md text-sm text-muted-foreground cursor-pointer hover:bg-accent hover:border-muted-foreground/50 hover:text-foreground"
                                            title="Delete"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="p-6 bg-card rounded-xl border-2 border-border min-h-[150px] max-h-[450px] overflow-auto"
                                    dangerouslySetInnerHTML={{ __html: signature.signature }}
                                />
                                <div className="flex justify-start items-center pt-4 border-t-2 border-muted">
                                    <div className="flex gap-2.5 items-center flex-wrap">
                                        {signature.isPrimary && <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase bg-primary text-primary-foreground shadow-sm">Primary</span>}
                                        {signature.isDefault && <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase bg-primary text-primary-foreground shadow-sm">Default</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <SignatureEditModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                signature={selectedSignature}
                onSave={handleSaveSignature}
                isSaving={isSaving}
            />
        </div>
    );
};

export default Signatures;
