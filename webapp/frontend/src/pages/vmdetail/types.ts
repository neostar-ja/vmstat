import type { VMDetail, VMDisk, VMNetwork, VMAlarm } from '../../types';

// Common props shared across all tab components
export interface VMDetailTabProps {
    vm: VMDetail;
    vmUuid: string;
    theme: any;
}

// Tab 0 (General) specific props
export interface Tab0Props extends VMDetailTabProps {
    realtimeLoading: boolean;
    realtime: any;
    currentCpu: number;
    currentMemory: number;
    currentStorage: number;
}

// Tab 1 (Performance) specific props
export interface Tab1Props extends VMDetailTabProps {
    metricsLoading: boolean;
    chartData: any[];
    currentCpu: number;
    currentMemory: number;
    currentStorage: number;
    realtime: any;
    storageGrowth: { rate: number; trend: string; perDay: number };
}

// Tab 2 (CPU & Memory) specific props
export interface Tab2Props extends VMDetailTabProps {
    vmLoading: boolean;
    currentCpu: number;
    currentMemory: number;
    realtime: any;
}

// Tab 3 (Storage) specific props
export interface Tab3Props extends VMDetailTabProps {
    disksLoading: boolean;
    metricsLoading: boolean;
    disks: VMDisk[];
    chartData: any[];
    currentStorage: number;
    storageGrowth: { rate: number; trend: string; perDay: number };
}

// Tab 4 (Network) specific props
export interface Tab4Props extends VMDetailTabProps {
    networksLoading: boolean;
    networks: VMNetwork[];
    realtime: any;
}

// Tab 5 (Backup/DR) specific props
export interface Tab5Props extends VMDetailTabProps {
}

// Tab 6 (Alarm) specific props
export interface Tab6Props extends VMDetailTabProps {
    alarmsLoading: boolean;
    alarms: VMAlarm[];
    platformAlerts: VMAlarm[];
}

// Tab 7 (Report) specific props
export interface Tab7Props extends VMDetailTabProps {
    metricsLoading: boolean;
    realtimeLoading: boolean;
    disksLoading: boolean;
    networksLoading: boolean;
    alarmsLoading: boolean;
    chartData: any[];
    realtime: any;
    disks: VMDisk[];
    networks: VMNetwork[];
    alarms: VMAlarm[];
    platformAlerts: VMAlarm[];
    currentCpu: number;
    currentMemory: number;
    currentStorage: number;
    storageGrowth: { rate: number; trend: string; perDay: number };
    timeRange: string;
    actualTimeRange: string;
    user: any;
    customStartDate: string;
    customEndDate: string;
}

// Tab 8 (Raw Data) specific props
export interface Tab8Props extends VMDetailTabProps {
    rawLoading: boolean;
    rawData: any;
    rawError: any;
}
