import { useEffect, useState } from 'react';
import styles from './Signatures.module.scss';
import { useAppDispatch } from '@/app/hook';
import { getSignaturesApi, type Signature } from '@/features/signature/signatureApi';

const Signatures = () => {
    const dispatch = useAppDispatch();
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Signatures</h1>
                <button className={styles.createButton}>
                    Create New Signature
                </button>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading...</div>
            ) : (
                <div className={styles.signatureList}>
                    {signatures.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No signatures found. Create your first signature!</p>
                        </div>
                    ) : (
                        signatures.map((signature) => (
                            <div key={signature.sendAsEmail} className={styles.signatureCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.nameSection}>
                                        <h3 className={styles.signatureName}>
                                            {signature.displayName || 'Email Signature'}
                                        </h3>
                                        <p className={styles.email}>{signature.sendAsEmail}</p>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button className={styles.actionButton} title="Edit">
                                            Edit
                                        </button>
                                        <button className={styles.actionButton} title="Delete">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className={styles.signatureContent}
                                    dangerouslySetInnerHTML={{ __html: signature.signature }}
                                />
                                <div className={styles.cardFooter}>
                                    <div className={styles.badges}>
                                        {signature.isPrimary && <span className={styles.badge}>Primary</span>}
                                        {signature.isDefault && <span className={styles.badge}>Default</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Signatures;
