# Project Documentation: All India Villages API

## 1. Project Overview
The **All India Villages API** is a high-performance B2B SaaS platform providing standardized, hierarchical access to India's census-level geographical data (States, Districts, Sub-districts, and Villages). Built with scalability and ease of integration in mind, the platform serves developers and businesses requiring accurate location data for logistics, research, and application development.

## 2. Implemented Features & Modules
### A. Client-Side (Frontend)
- **Live Search & Autocomplete**: A performant search engine for 600,000+ village records.
- **Hierarchical Navigation**: Drill-down menus from State to Village.
- **Developer Portal**:
    - **API Key Management**: Self-service generation and rotation of API keys and secrets.
    - **Interactive Documentation**: Integrated Swagger UI for testing live endpoints.
    - **Usage Monitoring**: Visual dashboard for tracking API consumption.
- **Authentication**: Secure JWT-based auth with Role-Based Access Control (RBAC).

## 3. Code Logic & Architecture
- **Tech Stack**: React 18 (Vite), Node.js (Express), Prisma ORM, PostgreSQL (NeonDB).
- **Backend Architecture**:
    - `api/index.js`: The central gateway handling routing and serverless invocation.
    - `server/controllers`: Logic for data retrieval and user management.
    - `server/middleware`: Logic for authentication, API validation, and error handling.
- **Frontend State Management**: 
    - **Zustand**: Lightweight, persistent store for user session and authentication state.
    - **React Query**: Strategic caching for API requests.

## 4. Database Schema
The database uses a relational structure optimized for hierarchical data:
- **State** (1:N) -> **District** (1:N) -> **SubDistrict** (1:N) -> **Village**.
- **User** table stores business profiles and hashed credentials.
- **ApiKey** table manages secret rotation and linkage to users.

## 5. Future Improvements
- **Bulk Data Export**: Capability to download filtered datasets in CSV/Excel.
- **Advanced Metadata**: Adding population, PIN codes, and census coordinates.
- **GraphQL Support**: Enabling more flexible query patterns for developers.
- **Global Expansion**: Expanding the schema to support international geographical structures.
