-- Add OS columns to sangfor.vm_master table

ALTER TABLE sangfor.vm_master 
ADD COLUMN IF NOT EXISTS os_display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS os_kernel VARCHAR(100),
ADD COLUMN IF NOT EXISTS os_distribution VARCHAR(100),
ADD COLUMN IF NOT EXISTS os_arch VARCHAR(50);
