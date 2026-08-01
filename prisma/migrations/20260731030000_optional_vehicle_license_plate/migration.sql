-- Vehicles may be registered before their plates are available.
ALTER TABLE "vehicles" ALTER COLUMN "licensePlate" DROP NOT NULL;
