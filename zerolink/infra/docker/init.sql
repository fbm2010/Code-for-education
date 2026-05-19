CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create test database
CREATE DATABASE zerolink_test;
GRANT ALL PRIVILEGES ON DATABASE zerolink_test TO zerolink;
