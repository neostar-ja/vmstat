-- Create table for VM network interfaces
CREATE TABLE IF NOT EXISTS sangfor.vm_network_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vm_uuid UUID NOT NULL,
    vif_id VARCHAR(50) NOT NULL,
    network_name VARCHAR(100),
    port_id VARCHAR(50),
    mac_address VARCHAR(20),
    model VARCHAR(50),
    ip_address VARCHAR(50),
    ipv6_address VARCHAR(100),
    subnet_id VARCHAR(50),
    subnet_name VARCHAR(100),
    cidr VARCHAR(50),
    gateway VARCHAR(50),
    custom_gateway VARCHAR(50),
    vpc_id VARCHAR(50),
    vpc_name VARCHAR(100),
    device_id VARCHAR(50),
    connected BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_vm_network_vm FOREIGN KEY (vm_uuid) 
        REFERENCES sangfor.vm_master(vm_uuid) ON DELETE CASCADE,
        
    CONSTRAINT uq_vm_interface UNIQUE (vm_uuid, vif_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vm_network_vm_uuid ON sangfor.vm_network_interfaces(vm_uuid);
CREATE INDEX IF NOT EXISTS idx_vm_network_ip ON sangfor.vm_network_interfaces(ip_address);
