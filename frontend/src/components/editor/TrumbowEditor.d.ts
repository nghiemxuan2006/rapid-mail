import { ReactNode } from 'react';

export interface TrumbowEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

declare const TrumbowEditor: React.FC<TrumbowEditorProps>;
export default TrumbowEditor;