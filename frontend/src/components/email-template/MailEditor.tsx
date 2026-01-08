import { useRef, useEffect, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import styles from './MailEditor.module.scss';

interface MailEditorProps {
    content: string;
    onContentChange: (content: string) => void;
}

const MailEditor = ({ content, onContentChange }: MailEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize Quill editor
    useEffect(() => {
        if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'header': 1 }, { 'header': 2 }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['link', 'image'],
                        ['clean'],
                    ],
                },
                placeholder: 'Start writing your email content here... Use [FieldName] to insert variables.',
            });

            // Set initial content if provided
            if (content) {
                quillRef.current.root.innerHTML = content;
            }

            // Listen to text changes
            quillRef.current.on('text-change', () => {
                const html = quillRef.current?.root.innerHTML || '';
                onContentChange(html);
                validateVariables(html);
            });

            setIsInitialized(true);
        }

        return () => {
            // Cleanup
        };
    }, []);

    // Update content from props (external changes)
    useEffect(() => {
        if (isInitialized && quillRef.current && content) {
            const currentContent = quillRef.current.root.innerHTML;
            if (currentContent !== content) {
                quillRef.current.root.innerHTML = content;
            }
        }
    }, [content, isInitialized]);

    const validateVariables = (html: string) => {
        const errors: string[] = [];
        const variableRegex = /\[([^\]]*)\]/g;
        const matches = html.match(variableRegex) || [];

        if (matches.length > 0) {
            const openCount = (html.match(/\[/g) || []).length;
            const closeCount = (html.match(/\]/g) || []).length;
            if (openCount !== closeCount) {
                errors.push(`Unmatched brackets detected`);
            }
        }

        setErrors(errors);
    };

    const insertVariable = (fieldName: string) => {
        if (!quillRef.current) return;

        const variable = `[${fieldName}]`;
        const selection = quillRef.current.getSelection();

        if (selection) {
            quillRef.current.insertText(selection.index, variable);
            quillRef.current.setSelection(selection.index + variable.length);
        } else {
            quillRef.current.focus();
            const len = quillRef.current.getLength();
            quillRef.current.insertText(len - 1, variable);
        }

        quillRef.current.focus();
    };

    // Expose insertVariable to parent via window object for FieldsTab to call
    useEffect(() => {
        (window as any).insertVariable = insertVariable;
        return () => {
            delete (window as any).insertVariable;
        };
    }, []);

    const characterCount = quillRef.current?.getText().length || 0;

    return (
        <div className={styles.editor}>
            <div className={styles.toolLabel}>
                💡 Click Fields tab to insert variables
            </div>

            <div
                id="mail-editor-input"
                ref={editorRef}
                className={styles.quillContainer}
            />

            {errors.length > 0 && (
                <div className={styles.errorBox}>
                    <div className={styles.errorTitle}>⚠️ Validation Issues:</div>
                    {errors.map((error, idx) => (
                        <div key={idx} className={styles.errorItem}>
                            {error}
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.footer}>
                <span>Characters: {characterCount}</span>
            </div>
        </div>
    );
};

export default MailEditor;
