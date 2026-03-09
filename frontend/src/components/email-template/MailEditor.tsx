import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface MailEditorProps {
    content: string;
    onContentChange: (content: string) => void;
}

export interface MailEditorRef {
    insertVariable: (fieldName: string) => void;
}

const MailEditor = forwardRef<MailEditorRef, MailEditorProps>(({ content, onContentChange }, ref) => {
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

        quillRef.current.focus(); // Focus trước để lấy selection chính xác
        const variable = `[${fieldName}]`;
        const selection = quillRef.current.getSelection();

        if (selection !== null && selection !== undefined) {
            quillRef.current.insertText(selection.index, variable);
            quillRef.current.setSelection(selection.index + variable.length);
        } else {
            // Nếu không có selection, insert ở cuối
            const len = quillRef.current.getLength();
            quillRef.current.insertText(len - 1, variable);
        }
    };

    // Expose insertVariable to parent via ref
    useImperativeHandle(ref, () => ({
        insertVariable
    }));

    const characterCount = quillRef.current?.getText().length || 0;

    return (
        <div className="flex flex-col h-full bg-card">
            {/* <div className={styles.toolLabel}>
                💡 Click Fields tab to insert variables
            </div> */}

            <div
                id="mail-editor-input"
                ref={editorRef}
                className="flex-1 overflow-hidden min-h-0"
            />

            {errors.length > 0 && (
                <div className="p-3 px-4 bg-yellow-50 border-y border-yellow-400">
                    <div className="font-semibold text-yellow-800 mb-2 text-sm">⚠️ Validation Issues:</div>
                    {errors.map((error, idx) => (
                        <div key={idx} className="text-yellow-800 text-xs ml-3">
                            {error}
                        </div>
                    ))}
                </div>
            )}

            {/* <div className={styles.footer}>
                <span>Characters: {characterCount}</span>
            </div> */}
        </div>
    );
});

MailEditor.displayName = 'MailEditor';

export default MailEditor;
