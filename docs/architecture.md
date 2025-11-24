This document explains the internal architecture of LogiStech.

---

## Components

    ### 1. LogiMaster  
    The core orchestrator:
    - Loads bins and trucks from DB
    - Performs best-fit bin selection
    - Allocates packages transactionally
    - Manages truck operations
    - Exposes queue and stack utilities

    ### 2. StorageUnit  
    Abstract class for anything that stores packages.

    ### 3. StorageBin  
    - Has capacity, used, and location  
    - Implements `occupy_space` and `free_space`  
    - Provides comparator for sorted bin ordering  

    ### 4. Truck  
    - Extends StorageUnit  
    - Maintains stack of loaded packages  
    - Supports rollback of specific package  

    ### 5. Database  
    PostgreSQL is used for:
    - Persistent storage of bins, trucks  
    - Shipment and truck load logs  
    - Dashboards and analytics  

    ### 6. API Layer  
    Express routes delegate work to LogiMaster.  
    All critical operations are DB-transactional.