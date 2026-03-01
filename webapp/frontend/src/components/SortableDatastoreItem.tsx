import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Grid, Box } from '@mui/material';
import ExecutiveDatastoreCard from './ExecutiveDatastoreCard';

interface SortableDatastoreItemProps {
    id: string;
    data: any;
    index: number;
}

const SortableDatastoreItem: React.FC<SortableDatastoreItemProps> = ({ id, data, index }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none', // Prevent scrolling on touch devices while dragging
    };

    return (
        <Grid
            item
            xs={12}
            md={6}
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
        >
            <Box sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
                <ExecutiveDatastoreCard data={data} index={index} />
            </Box>
        </Grid>
    );
};

export default SortableDatastoreItem;
