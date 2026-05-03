import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, Info, Zap } from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
import { showNotifications } from '@/utils/showNotification';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (date: Date) => void;
}

const ScheduleModal = ({ isOpen, onClose, onSchedule }: ScheduleModalProps) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('09:00');
    const [timeUntilSend, setTimeUntilSend] = useState('');

    useEffect(() => {
        if (!selectedDate) return;
        const interval = setInterval(() => {
            const [hours, minutes] = time.split(':').map(Number);
            const scheduledDate = new Date(selectedDate);
            scheduledDate.setHours(hours, minutes, 0, 0);
            const diff = scheduledDate.getTime() - Date.now();
            if (diff <= 0) { setTimeUntilSend('In the past'); return; }
            const days = Math.floor(diff / 86400000);
            const hrs = Math.floor((diff % 86400000) / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            if (days > 0) setTimeUntilSend(`${days}d ${hrs}h ${mins}m`);
            else if (hrs > 0) setTimeUntilSend(`${hrs}h ${mins}m`);
            else setTimeUntilSend(`${mins}m`);
        }, 1000);
        return () => clearInterval(interval);
    }, [selectedDate, time]);

    const handleSchedule = () => {
        if (!selectedDate) { showNotifications('error', 'Vui lòng chọn ngày'); return; }
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledDate = new Date(selectedDate);
        scheduledDate.setHours(hours, minutes, 0, 0);
        if (scheduledDate <= new Date()) {
            showNotifications('error', 'Thời gian lên lịch phải ở tương lai');
            return;
        }
        onSchedule(scheduledDate);
        onClose();
        showNotifications('success', `Đã lên lịch gửi vào ${format(scheduledDate, 'PPP')} lúc ${time}`);
    };

    const handleQuickSelect = (type: 'tomorrow' | 'next-week' | 'next-hour') => {
        const now = new Date();
        if (type === 'tomorrow') {
            setSelectedDate(addDays(now, 1)); setTime('09:00');
        } else if (type === 'next-week') {
            setSelectedDate(addDays(now, 7)); setTime('09:00');
        } else {
            const d = addHours(now, 1);
            setSelectedDate(d);
            setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-none sm:max-w-none h-[90vh] flex flex-col lg:flex-row overflow-hidden p-0 gap-0">
                <DialogTitle className="sr-only">Schedule Email Campaign</DialogTitle>

                {/* Left Panel */}
                <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
                    <div className="mb-6">
                        <h2 className="text-xl sm:text-2xl font-semibold">Schedule Email Campaign</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">Chọn thời gian gửi chiến dịch email</p>
                    </div>

                    {/* Quick Select */}
                    <div className="mb-6">
                        <Label className="mb-3 flex items-center gap-2 text-sm">
                            <Zap className="size-4" />
                            Quick Select
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" onClick={() => handleQuickSelect('next-hour')} className="h-auto py-3 flex-col items-start">
                                <span className="font-semibold text-sm">In 1 Hour</span>
                                <span className="text-xs text-muted-foreground">{format(addHours(new Date(), 1), 'h:mm a')}</span>
                            </Button>
                            <Button variant="outline" onClick={() => handleQuickSelect('tomorrow')} className="h-auto py-3 flex-col items-start">
                                <span className="font-semibold text-sm">Tomorrow</span>
                                <span className="text-xs text-muted-foreground">9:00 AM</span>
                            </Button>
                            <Button variant="outline" onClick={() => handleQuickSelect('next-week')} className="h-auto py-3 flex-col items-start">
                                <span className="font-semibold text-sm">Next Week</span>
                                <span className="text-xs text-muted-foreground">{format(addDays(new Date(), 7), 'MMM d')}</span>
                            </Button>
                        </div>
                    </div>

                    <Separator className="mb-6" />

                    {/* Calendar */}
                    <div className="mb-6">
                        <Label className="mb-3 flex items-center gap-2 text-sm">
                            <CalendarIcon className="size-4" />
                            Select Date
                        </Label>
                        <div className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                className="rounded-lg border shadow-sm bg-card"
                            />
                        </div>
                    </div>

                    {/* Time Picker */}
                    <div className="max-w-xs">
                        <Label htmlFor="schedule-time" className="mb-3 flex items-center gap-2 text-sm">
                            <Clock className="size-4" />
                            Select Time
                        </Label>
                        <Input
                            id="schedule-time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="text-lg h-12"
                        />
                    </div>

                    {/* Mobile Summary */}
                    {selectedDate && (
                        <div className="mt-6 lg:hidden">
                            <div className="bg-background rounded-lg border p-4 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Scheduled For</p>
                                        <p className="font-semibold text-sm sm:text-base truncate">
                                            {format(selectedDate, 'EEE, MMM d')} at {time}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Time Until</p>
                                        <p className="text-base sm:text-lg font-bold text-primary">{timeUntilSend || '---'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobile action buttons */}
                    <div className="mt-6 lg:hidden space-y-2">
                        <Button onClick={handleSchedule} className="w-full" size="lg">
                            <CalendarIcon className="size-4 mr-2" />
                            Schedule Campaign
                        </Button>
                        <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
                    </div>
                </div>

                {/* Right Panel - Desktop only */}
                <div className="hidden lg:flex w-87.5 xl:w-100 border-l bg-muted/30 p-6 xl:p-8 flex-col shrink-0 overflow-y-auto overflow-x-hidden">
                    <div className="mb-6">
                        <h3 className="font-semibold text-base xl:text-lg mb-2">Schedule Summary</h3>
                        <p className="text-xs xl:text-sm text-muted-foreground">Review your scheduled email details</p>
                    </div>

                    {selectedDate && (
                        <div className="space-y-4 flex-1">
                            <div className="bg-background rounded-lg border p-4 space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Scheduled For</p>
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                                            <CalendarIcon className="size-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{format(selectedDate, 'EEEE, MMMM d')}</p>
                                            <p className="text-sm text-muted-foreground">{time}</p>
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Time Until Send</p>
                                    <p className="text-2xl font-bold text-primary">{timeUntilSend || '---'}</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 p-4">
                                <div className="flex gap-3">
                                    <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1 text-xs">
                                        <p className="font-medium text-blue-900 dark:text-blue-100">Timezone</p>
                                        <p className="text-blue-700 dark:text-blue-300">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900 p-4">
                                <div className="flex gap-3">
                                    <Zap className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1 text-xs">
                                        <p className="font-medium text-amber-900 dark:text-amber-100">Best Practices</p>
                                        <ul className="text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                                            <li>Schedule during business hours</li>
                                            <li>Avoid weekends for B2B</li>
                                            <li>Tue-Thu: highest open rates</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 pt-6 mt-auto border-t">
                        <Button onClick={handleSchedule} className="w-full" size="lg">
                            <CalendarIcon className="size-4 mr-2" />
                            Schedule Campaign
                        </Button>
                        <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleModal;
