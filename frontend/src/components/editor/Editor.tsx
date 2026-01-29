import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import styles from './Editor.module.scss';

interface EditorProps {
    value?: string;
    onChange?: (content: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    theme?: 'snow' | 'bubble';
    modules?: any;
    formats?: string[];
    className?: string;
}

export interface EditorHandle {
    getEditor: () => Quill | null;
    getContent: () => string;
    setContent: (content: string) => void;
    focus: () => void;
    blur: () => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(
    (
        {
            value = '',
            onChange,
            placeholder = 'Start writing...',
            readOnly = false,
            theme = 'snow',
            modules,
            formats,
            className = '',
        },
        ref
    ) => {
        const editorRef = useRef<HTMLDivElement>(null);
        const quillRef = useRef<Quill | null>(null);

        const defaultModules = {
            toolbar: [
                [{ header: [1, 2, 3, 4, 5, 6, false] }],
                [{ font: [] }],
                [{ size: ['small', false, 'large', 'huge'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ color: [] }, { background: [] }],
                [{ script: 'sub' }, { script: 'super' }],
                [{ list: 'ordered' }, { list: 'bullet' }],
                [{ indent: '-1' }, { indent: '+1' }],
                [{ align: [] }],
                ['blockquote', 'code-block'],
                ['link', 'image', 'video'],
                ['clean'],
            ],
        };

        const defaultFormats = [
            'header',
            'font',
            'size',
            'bold',
            'italic',
            'underline',
            'strike',
            'color',
            'background',
            'script',
            'list',
            'bullet',
            'indent',
            'align',
            'blockquote',
            'code-block',
            'link',
            'image',
            'video',
        ];

        useImperativeHandle(ref, () => ({
            getEditor: () => quillRef.current,
            getContent: () => {
                if (quillRef.current) {
                    return quillRef.current.root.innerHTML;
                }
                return '';
            },
            setContent: (content: string) => {
                if (quillRef.current) {
                    quillRef.current.root.innerHTML = content;
                }
            },
            focus: () => {
                if (quillRef.current) {
                    quillRef.current.focus();
                }
            },
            blur: () => {
                if (quillRef.current) {
                    quillRef.current.blur();
                }
            },
        }));

        useEffect(() => {
            if (!editorRef.current) return;

            // Initialize Quill
            const quill = new Quill(editorRef.current, {
                theme,
                modules: modules || defaultModules,
                formats: formats || defaultFormats,
                placeholder,
                readOnly,
            });

            quillRef.current = quill;

            // Set initial value
            if (value) {
                quill.root.innerHTML = value;
            }

            // Handle text change
            quill.on('text-change', () => {
                const content = quill.root.innerHTML;
                if (onChange) {
                    onChange(content);
                }
            });

            // Cleanup
            return () => {
                quillRef.current = null;
            };
        }, []);

        // Update content when value prop changes
        useEffect(() => {
            if (quillRef.current && value !== quillRef.current.root.innerHTML) {
                const selection = quillRef.current.getSelection();
                quillRef.current.root.innerHTML = value;
                if (selection) {
                    quillRef.current.setSelection(selection);
                }
            }
        }, [value]);

        // Update readOnly state
        useEffect(() => {
            if (quillRef.current) {
                quillRef.current.enable(!readOnly);
            }
        }, [readOnly]);

        return (
            <div className={`${styles.editorWrapper} ${className}`}>
                <div ref={editorRef} className={styles.editor} />
            </div>
        );
    }
);

Editor.displayName = 'Editor';

export default Editor;
