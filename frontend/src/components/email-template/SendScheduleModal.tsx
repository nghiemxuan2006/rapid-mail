import { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BaseModal } from '@/components/ui/base-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
    Calendar as CalendarIcon,
    Clock,
    Send,
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
} from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
import type { Recipient } from '@/schema/campaign';

export type SendMethod = 'now' | 'schedule-all' | 'schedule-individual';

export interface RecipientSchedule {
    recipientId: string;
    scheduledDate: Date;
}

interface SendScheduleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipients: Recipient[];
    onConfirm: (method: SendMethod, schedules?: RecipientSchedule[]) => void;
}

const SendScheduleModal = ({ open, onOpenChange, recipients, onConfirm }: SendScheduleModalProps) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [sendMethod, setSendMethod] = useState<SendMethod>('now');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('09:00');
    const [recipientSchedules, setRecipientSchedules] = useState<RecipientSchedule[]>([]);

    useEffect(() => {
        if (sendMethod === 'schedule-individual' && recipientSchedules.length === 0) {
            const now = new Date();
            setRecipientSchedules(
                recipients.map((r, i) => ({ recipientId: r.id, scheduledDate: addHours(now, i + 1) }))
            );
        }
    }, [sendMethod, recipients, recipientSchedules.length]);

    useEffect(() => {
        if (!open) {
            setStep(1);
            setSendMethod('now');
            setSelectedDate(new Date());
            setTime('09:00');
            setRecipientSchedules([]);
        }
    }, [open]);

    const handleNext = () => {
        if (step === 1) setStep(sendMethod === 'now' ? 3 : 2);
        else if (step === 2) setStep(3);
    };

    const handleBack = () => {
        if (step === 3 && sendMethod === 'now') setStep(1);
        else if (step > 1) setStep((step - 1) as 1 | 2);
    };

    const handleConfirm = () => {
        if (sendMethod === 'now') {
            onConfirm('now');
        } else if (sendMethod === 'schedule-all') {
            const [hours, minutes] = time.split(':').map(Number);
            const scheduledDate = new Date(selectedDate!);
            scheduledDate.setHours(hours, minutes, 0, 0);
            onConfirm('schedule-all', recipients.map((r) => ({ recipientId: r.id, scheduledDate })));
        } else {
            onConfirm('schedule-individual', recipientSchedules);
        }
    };

    const handleQuickFill = (type: 'same' | 'spread') => {
        if (type === 'same') {
            const [hours, minutes] = time.split(':').map(Number);
            const scheduledDate = new Date(selectedDate!);
            scheduledDate.setHours(hours, minutes, 0, 0);
            setRecipientSchedules(recipients.map((r) => ({ recipientId: r.id, scheduledDate: new Date(scheduledDate) })));
        } else {
            const now = new Date();
            setRecipientSchedules(recipients.map((r, i) => ({ recipientId: r.id, scheduledDate: addHours(now, i + 1) })));
        }
    };

    const updateRecipientSchedule = (recipientId: string, date: Date, t: string) => {
        const [hours, minutes] = t.split(':').map(Number);
        const scheduledDate = new Date(date);
        scheduledDate.setHours(hours, minutes, 0, 0);
        setRecipientSchedules((prev) =>
            prev.map((s) => (s.recipientId === recipientId ? { ...s, scheduledDate } : s))
        );
    };

    const progressWidth = step === 1 ? '33%' : step === 2 ? '66%' : '100%';

    return (
        <BaseModal open={open} onOpenChange={onOpenChange} size="4xl">
            <DialogHeader>
                <DialogTitle>Gửi Chiến Dịch</DialogTitle>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Bước {step} / 3</span>
                    <span className="text-sm font-medium">
                        {step === 1 && 'Chọn phương thức'}
                        {step === 2 && 'Cài đặt lịch'}
                        {step === 3 && 'Xác nhận'}
                    </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: progressWidth }} />
                </div>
            </div>

            {/* Step 1: Choose Method */}
            {step === 1 && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Chọn cách gửi chiến dịch này đến {recipients.length} người nhận.
                    </p>
                    <div className="space-y-3">
                        {([
                            { value: 'now', label: 'Gửi ngay', desc: 'Gửi email ngay lập tức đến tất cả người nhận', icon: Send },
                            { value: 'schedule-all', label: 'Lên lịch tất cả (cùng giờ)', desc: 'Gửi tất cả email vào cùng một thời điểm đã lên lịch', icon: CalendarIcon },
                            { value: 'schedule-individual', label: 'Lên lịch từng người', desc: 'Đặt thời gian gửi riêng cho từng người nhận', icon: Clock },
                        ] as { value: SendMethod; label: string; desc: string; icon: React.ElementType }[]).map(({ value, label, desc, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => setSendMethod(value)}
                                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                                    sendMethod === value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`size-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${sendMethod === value ? 'border-primary' : 'border-muted-foreground'}`}>
                                        {sendMethod === value && <div className="size-2.5 rounded-full bg-primary" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold mb-1">{label}</p>
                                        <p className="text-sm text-muted-foreground">{desc}</p>
                                    </div>
                                    <Icon className="size-5 text-muted-foreground shrink-0" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Schedule All */}
            {step === 2 && sendMethod === 'schedule-all' && (
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Chọn ngày và giờ gửi email đến {recipients.length} người nhận.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <Label className="mb-3 flex items-center gap-2">
                                <CalendarIcon className="size-4" />
                                Chọn ngày
                            </Label>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                className="rounded-lg border scale-95 origin-top-left"
                            />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="schedule-time" className="mb-3 flex items-center gap-2">
                                    <Clock className="size-4" />
                                    Chọn giờ
                                </Label>
                                <Input
                                    id="schedule-time"
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="text-lg h-12"
                                />
                            </div>
                            <Separator />
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm font-medium mb-2">Chọn nhanh</p>
                                <div className="space-y-2">
                                    <Button variant="outline" size="sm" className="w-full justify-start"
                                        onClick={() => { const d = addHours(new Date(), 1); setSelectedDate(d); setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`); }}>
                                        Sau 1 giờ
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full justify-start"
                                        onClick={() => { setSelectedDate(addDays(new Date(), 1)); setTime('09:00'); }}>
                                        Ngày mai 9:00 SA
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full justify-start"
                                        onClick={() => { setSelectedDate(addDays(new Date(), 7)); setTime('09:00'); }}>
                                        Tuần sau
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Schedule Individual */}
            {step === 2 && sendMethod === 'schedule-individual' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Đặt thời gian gửi riêng cho từng người nhận.</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleQuickFill('same')}>Cùng giờ</Button>
                            <Button variant="outline" size="sm" onClick={() => handleQuickFill('spread')}>Cách 1 giờ</Button>
                        </div>
                    </div>
                    <div className="border rounded-lg max-h-96 overflow-auto">
                        <table className="w-full min-w-125">
                            <thead className="border-b bg-muted/50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-left text-sm font-medium w-[45%]">Người nhận</th>
                                    <th className="p-3 text-left text-sm font-medium w-[55%]">Thời gian gửi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipients.map((r) => {
                                    const schedule = recipientSchedules.find((s) => s.recipientId === r.id);
                                    return (
                                        <tr key={r.id} className="border-b last:border-0">
                                            <td className="p-3 text-sm truncate max-w-50">{r.Email}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="date"
                                                        value={schedule ? format(schedule.scheduledDate, 'yyyy-MM-dd') : ''}
                                                        onChange={(e) => {
                                                            const date = new Date(e.target.value);
                                                            const t = schedule ? format(schedule.scheduledDate, 'HH:mm') : '09:00';
                                                            updateRecipientSchedule(r.id, date, t);
                                                        }}
                                                        className="text-sm flex-1 min-w-36"
                                                        min={format(new Date(), 'yyyy-MM-dd')}
                                                    />
                                                    <Input
                                                        type="time"
                                                        value={schedule ? format(schedule.scheduledDate, 'HH:mm') : '09:00'}
                                                        onChange={(e) => {
                                                            const date = schedule?.scheduledDate || new Date();
                                                            updateRecipientSchedule(r.id, date, e.target.value);
                                                        }}
                                                        className="text-sm w-28 shrink-0"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                        <CheckCircle2 className="size-6 text-green-600 dark:text-green-400 shrink-0" />
                        <div>
                            <p className="font-semibold text-green-900 dark:text-green-100">Sẵn sàng gửi</p>
                            <p className="text-sm text-green-700 dark:text-green-300">Vui lòng kiểm tra chi tiết trước khi xác nhận</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b">
                            <span className="text-sm text-muted-foreground">Số người nhận</span>
                            <span className="font-semibold">{recipients.length}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b">
                            <span className="text-sm text-muted-foreground">Phương thức</span>
                            <span className="font-semibold">
                                {sendMethod === 'now' && 'Gửi ngay'}
                                {sendMethod === 'schedule-all' && 'Lên lịch tất cả (cùng giờ)'}
                                {sendMethod === 'schedule-individual' && 'Lên lịch từng người'}
                            </span>
                        </div>
                        {sendMethod === 'schedule-all' && selectedDate && (
                            <div className="flex items-center justify-between py-3 border-b">
                                <span className="text-sm text-muted-foreground">Thời gian lên lịch</span>
                                <span className="font-semibold">{format(selectedDate, 'dd/MM/yyyy')} lúc {time}</span>
                            </div>
                        )}
                        {sendMethod === 'schedule-individual' && (
                            <div className="py-3">
                                <span className="text-sm text-muted-foreground mb-2 block">Lịch từng người</span>
                                <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                                    {recipientSchedules.slice(0, 3).map((s) => {
                                        const r = recipients.find((rc) => rc.id === s.recipientId);
                                        return (
                                            <div key={s.recipientId} className="flex justify-between">
                                                <span className="text-muted-foreground">{r?.Email}</span>
                                                <span>{format(s.scheduledDate, 'dd/MM HH:mm')}</span>
                                            </div>
                                        );
                                    })}
                                    {recipientSchedules.length > 3 && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            ... và {recipientSchedules.length - 3} người khác
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <DialogFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={step === 1}>
                    <ArrowLeft className="size-4 mr-2" />
                    Quay lại
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
                    {step < 3 ? (
                        <Button onClick={handleNext}>
                            Tiếp theo
                            <ArrowRight className="size-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleConfirm}>
                            <Send className="size-4 mr-2" />
                            Xác nhận & Gửi
                        </Button>
                    )}
                </div>
            </DialogFooter>
        </BaseModal>
    );
};

export default SendScheduleModal;
