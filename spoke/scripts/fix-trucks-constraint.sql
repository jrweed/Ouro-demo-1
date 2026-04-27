-- Drop the equipment_type check constraint on trucks so we can insert reefer_53 / reefer_48
ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_equipment_type_check;
