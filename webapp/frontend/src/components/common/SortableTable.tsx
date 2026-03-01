import React, { useState, useMemo } from 'react'
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableSortLabel, TableBody } from '@mui/material'

export interface ColumnDef<T> {
    id: string
    label: string
    numeric?: boolean
    render?: (v: any, row: T) => React.ReactNode
}

interface SortableTableProps<T> {
    columns: ColumnDef<T>[]
    rows: T[]
    defaultSort?: string
    defaultDir?: 'asc' | 'desc'
}

export function SortableTable<T extends Record<string, any>>({
    columns,
    rows,
    defaultSort,
    defaultDir = 'desc'
}: SortableTableProps<T>) {
    const [orderBy, setOrderBy] = useState(defaultSort || columns[0]?.id)
    const [order, setOrder] = useState<'asc' | 'desc'>(defaultDir)

    const sorted = useMemo(() => [...rows].sort((a, b) => {
        const v1 = a[orderBy]
        const v2 = b[orderBy]
        if (v1 == null) return 1
        if (v2 == null) return -1
        const cmp = typeof v1 === 'number' ? v1 - v2 : String(v1).localeCompare(String(v2))
        return order === 'asc' ? cmp : -cmp
    }), [rows, orderBy, order])

    const handleSort = (col: string) => {
        if (col === orderBy) setOrder(o => o === 'asc' ? 'desc' : 'asc')
        else { setOrderBy(col); setOrder('desc') }
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map(col => (
                            <TableCell key={col.id} align={col.numeric ? 'right' : 'left'}>
                                <TableSortLabel active={orderBy === col.id} direction={orderBy === col.id ? order : 'asc'} onClick={() => handleSort(col.id)}>
                                    {col.label}
                                </TableSortLabel>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sorted.map((row, i) => (
                        <TableRow key={i} hover>
                            {columns.map(col => (
                                <TableCell key={col.id} align={col.numeric ? 'right' : 'left'}>
                                    {col.render ? col.render(row[col.id], row) : row[col.id] ?? '-'}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
