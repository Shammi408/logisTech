This page describes what happens when the server starts.

1. Server connects to PostgreSQL  
2. LogiMaster instance is created  
3. Bins loaded from database  
4. Trucks loaded from database  
5. Express server starts  
6. Swagger /docs enabled  
7. System ready for API usage

Sequence diagram:
sequenceDiagram
    participant Server
    participant DB
    participant LogiMaster

    Server->>DB: SELECT now()
    Server->>LogiMaster: getInstance()
    Server->>DB: SELECT bins
    Server->>LogiMaster: hydrate bins
    Server->>DB: SELECT trucks
    Server->>LogiMaster: hydrate trucks
    Server->>Server: start Express API

Check the serverFlow.png for this diagram.

