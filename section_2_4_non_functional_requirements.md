# Section 2.4 — Non-Functional Requirements

---

## 2.4 Non-Functional Requirements

While functional requirements define what the system must do, non-functional requirements (NFRs) specify how the system should perform and the constraints under which it must operate. These requirements are essential for ensuring that the TravelAI system provides a secure, reliable, and user-friendly experience.

The non-functional requirements for the TravelAI system are categorized into Performance, Reliability, Usability, Security, Maintainability, and Technical Constraints.

### 2.4.1 Performance and Scalability

- **Response Time (Standard Features):** Standard system actions, such as viewing an itinerary, managing profiles, or retrieving lists of trips, shall respond within 1 second under normal load conditions.
- **AI Generation Time:** Due to the complexity of invoking Large Language Models (LLMs) and external APIs, full itinerary generation shall complete typically within 20 seconds under normal operating conditions. However, the system shall utilize streaming mechanisms to provide immediate, progressive feedback to the user to maintain engagement.
- **Real-Time Interaction:** The conversational interface shall leverage WebSockets to deliver low-latency message streaming between the AI assistant and the Traveler.
- **Concurrent Users:** The backend infrastructure shall be capable of efficiently handling dozens of concurrent users and WebSocket connections under expected deployment conditions without severe degradation in response times.

### 2.4.2 Reliability and Availability

- **Graceful Degradation:** The system shall gracefully notify users and handle failures when external dependencies (such as the Place Search Service, Flight Service, or LLM providers) are temporarily unavailable or rate-limited.
- **Data Integrity:** Operations involving state changes, particularly itinerary modifications and payment transactions via the VNPay gateway, shall adhere to ACID properties to ensure data consistency.
- **System Uptime:** The system shall aim for high availability during core usage hours, utilizing containerized deployment to facilitate easy restarts and recovery in the event of a crash.

### 2.4.3 Usability

- **Responsive Design:** The web interface shall be fully responsive, ensuring seamless usability across various devices, including desktop computers, tablets, and mobile phones.
- **Intuitive Interface:** The system shall provide a unified layout that logically integrates the chat interface, the structured itinerary planner, and the interactive map without requiring the user to navigate away from the active trip context.
- **Accessibility:** The application shall utilize clear typography, sufficient color contrast, and standard UI patterns to ensure it is accessible to a broad range of users.

### 2.4.4 Security

- **Authentication and Authorization:** Access to personal trips, profile management, and booking features shall be restricted to authenticated users. Passwords shall be securely hashed using a strong cryptographic algorithm (e.g., bcrypt) before being stored in the database.
- **Secure Sessions:** The system shall utilize secure mechanisms, such as JSON Web Tokens (JWT), for managing user sessions across standard HTTP requests and WebSocket connections.
- **Transaction Security:** Payment processing shall adhere to the security standards required by the VNPay Sandbox Gateway, including the calculation and validation of HMAC-SHA512 cryptographic signatures to prevent payload tampering.
- **Data Protection:** The system shall mitigate common web vulnerabilities, such as Cross-Site Scripting (XSS) and SQL Injection, by utilizing modern web frameworks and ORMs.

### 2.4.5 Maintainability and Extensibility

- **Modular Architecture:** The system shall separate concerns by dividing the codebase into distinct layers (e.g., API routing, database access, AI orchestration), allowing individual modules to be updated or replaced with minimal impact on the rest of the system.
- **API Documentation:** The backend is designed to provide automatically generated, interactive API documentation (e.g., Swagger UI/OpenAPI) to facilitate frontend integration and future development.
- **Agent Extensibility:** The AI architecture shall be designed so that new sub-agents or external tools can be integrated into the workflow without requiring a complete rewrite of the existing AI logic.

### 2.4.6 Technical Constraints

- **Frontend Environment:** The frontend shall be implemented using a modern component-based JavaScript framework capable of server-side rendering and responsive UI development (implemented using Next.js and TailwindCSS).
- **Backend Processing:** The backend shall be built on a high-performance framework capable of native asynchronous processing and high-throughput WebSocket handling (implemented using FastAPI).
- **AI Orchestration Framework:** The core reasoning and multi-agent coordination shall be implemented using a dedicated graph-based AI orchestration framework (implemented using LangGraph).
- **Database Capabilities:** The primary data store shall be a relational database that supports semantic vector retrieval for intelligent context matching (implemented using PostgreSQL with the `pgvector` extension).
- **Deployment Constraint:** The application services shall support containerized deployment to ensure a consistent environment across development, testing, and production phases (implemented using Docker Compose).
