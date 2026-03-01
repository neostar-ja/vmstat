import React from 'react'
import { RenderAzSummary } from './AzSummary'
import { RenderGroupSummary } from './GroupSummary'
import { RenderHostDetail } from './HostDetail'
import { RenderIdleVms } from './IdleVms'
import { RenderOversizedVms } from './OversizedVms'
import { RenderNetworkTop } from './NetworkTop'
import { RenderTopVms } from './TopVms'
import { RenderVmResource } from './VmResource'
import { RenderInventory } from './Inventory'
import { RenderAlarmSummary } from './AlarmSummary'
import { RenderDatastoreCapacity } from './DatastoreCapacity'
import { RenderHostCapacity } from './HostCapacity'
import { RenderProtectionStatus } from './ProtectionStatus'
import { RenderVmControlActions } from './VmControlActions'
import { RenderSyncStatus } from './SyncStatus'
import { RenderExecutiveSummary } from './ExecutiveSummary'
import { RenderVmHistoricalAnalytics } from './VmHistoricalAnalytics'

interface Props {
    reportId: string
    data: any
}

export const ReportResultRenderer: React.FC<Props> = ({ reportId, data }) => {
    switch (reportId) {
        case 'az_summary': return <RenderAzSummary data={data} />
        case 'group_summary': return <RenderGroupSummary data={data} />
        case 'host_detail': return <RenderHostDetail data={data} />
        case 'idle_vms': return <RenderIdleVms data={data} />
        case 'oversized_vms': return <RenderOversizedVms data={data} />
        case 'network_top': return <RenderNetworkTop data={data} />
        case 'top_vms': return <RenderTopVms data={data} />
        case 'vm_resource_usage': return <RenderVmResource data={data} />
        case 'inventory': return <RenderInventory data={data} />
        case 'alarm_summary': return <RenderAlarmSummary data={data} />
        case 'datastore_capacity': return <RenderDatastoreCapacity data={data} />
        case 'host_capacity': return <RenderHostCapacity data={data} />
        case 'protection_status': return <RenderProtectionStatus data={data} />
        case 'vm_control_actions': return <RenderVmControlActions data={data} />
        case 'sync_status': return <RenderSyncStatus data={data} />
        case 'executive_summary': return <RenderExecutiveSummary data={data} />
        case 'vm_historical_analytics': return <RenderVmHistoricalAnalytics data={data} />
        default:
            return (
                <div style={{ padding: 16 }}>
                    <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )
    }
}
