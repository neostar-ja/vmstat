import React from 'react'
import { SortableTable } from '../../common/SortableTable'

export const RenderHostCapacity: React.FC<{ data: any }> = ({ data }) => {
    return (
        <SortableTable defaultSort="cpu_overcommit" columns={[
            { id: 'host_name', label: 'Host' }, { id: 'az_name', label: 'AZ' },
            { id: 'vm_count', label: 'VMs', numeric: true },
            { id: 'cpu_overcommit', label: 'CPU OC', numeric: true, render: (v: number) => `${v?.toFixed(2)}x` },
            { id: 'memory_overcommit', label: 'RAM OC', numeric: true, render: (v: number) => `${v?.toFixed(2)}x` },
        ]} rows={data.hosts || []} />
    )
}
