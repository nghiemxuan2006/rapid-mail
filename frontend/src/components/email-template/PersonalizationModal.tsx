import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { type Field, toDisplayName } from '@/pages/email-template/EmailTemplate';

interface PersonalizationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variables: Field[];
    onSelectVariable: (variableName: string) => void;
    onCreateVariable: () => void;
}

export function PersonalizationModal({
    open,
    onOpenChange,
    variables,
    onSelectVariable,
    onCreateVariable,
}: PersonalizationModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredVariables = variables.filter((variable) => {
        const displayName = toDisplayName(variable.name).toLowerCase();
        const variableName = variable.name.toLowerCase();
        const query = searchQuery.toLowerCase();
        return displayName.includes(query) || variableName.includes(query);
    });

    const handleSelectVariable = (variableName: string) => {
        onSelectVariable(variableName);
        onOpenChange(false);
        setSearchQuery('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Chèn biến</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Chọn biến để chèn..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Variables List */}
                    <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                        {filteredVariables.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Không tìm thấy biến nào
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredVariables.map((variable) => (
                                    <button
                                        key={variable.id}
                                        onClick={() => handleSelectVariable(variable.name)}
                                        className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between group"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">
                                                {toDisplayName(variable.name)}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {`{{${variable.name}}}`}
                                            </div>
                                        </div>
                                        <div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Chèn
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create Variable Button */}
                    <Button
                        onClick={onCreateVariable}
                        variant="outline"
                        className="w-full"
                    >
                        <Plus className="size-4 mr-2" />
                        Tạo biến mới
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
