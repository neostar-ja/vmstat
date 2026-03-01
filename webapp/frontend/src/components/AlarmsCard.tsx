import {
    Skeleton,
    IconButton
} from '@mui/material';
import {
    Warning as WarningIcon,
    Error as ErrorIcon,
    MoreVert as MoreIcon,
    NotificationsActive as AlarmIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface AlarmItem {
    vm_uuid: string;
    vm_name: string;
    group_name: string | null;
    alarm_count: number;
    warning_type: string | null;
    collected_at: string;
}

export default function AlarmsCard({
    title,
    data,
    isLoading,
}: {
    title: string;
    data: AlarmItem[];
    isLoading: boolean;
}) {
    return (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-red-500 to-orange-500">
                        <AlarmIcon className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-base">
                            {title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            ล่าสุด 24 ชั่วโมง
                        </p>
                    </div>
                </div>
                <IconButton size="small" className="text-slate-400">
                    <MoreIcon fontSize="small" />
                </IconButton>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={88} className="rounded-2xl" />
                    ))
                ) : data?.length === 0 ? (
                    <div className="p-8 text-center my-auto flex flex-col items-center justify-center opacity-50">
                        <CheckIcon className="w-12 h-12 text-emerald-500 mb-2" />
                        <span className="text-sm font-bold text-slate-500">ไม่มีการแจ้งเตือนผิดปกติ</span>
                    </div>
                ) : (
                    data?.map((alarm: AlarmItem) => {
                        const isCritical = alarm.warning_type?.toLowerCase().includes('critical') || alarm.alarm_count > 5;

                        return (
                            <div
                                key={alarm.vm_uuid}
                                className={`group flex flex-col p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 
                                    ${isCritical
                                        ? 'bg-red-50/50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20 hover:shadow-[0_4px_12px_rgba(239,68,68,0.15)]'
                                        : 'bg-orange-50/50 dark:bg-orange-500/10 border-orange-200/50 dark:border-orange-500/20 hover:shadow-[0_4px_12px_rgba(249,115,22,0.15)]'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {isCritical ?
                                            <ErrorIcon className="text-red-500 w-5 h-5" /> :
                                            <WarningIcon className="text-orange-500 w-5 h-5" />
                                        }
                                        <span className={`text-sm font-bold ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                            {alarm.vm_name}
                                        </span>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isCritical ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                                        }`}>
                                        {alarm.alarm_count} issues
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mt-auto pt-2">
                                    <div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
                                            {alarm.group_name || 'No Group'}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                                            {alarm.warning_type || 'System Warning'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {formatDistanceToNow(new Date(alarm.collected_at), { addSuffix: true, locale: th })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
