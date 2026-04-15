import DashboardLayout from '../../components/layout/DashboardLayout';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

// A lightweight version of the API documentation spec inline
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'All India Villages API',
    version: '1.0.0',
    description: 'High-performance API for geographical census data. Includes autocomplete, hierarchical states, and sub-districts limit-based fetching.'
  },
  servers: [
    { url: 'http://localhost:5000/v1', description: 'Local Development' },
    { url: 'https://api.villageapi.com/v1', description: 'Production' }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    }
  },
  security: [
    { ApiKeyAuth: [] }
  ],
  paths: {
    '/search': {
      get: {
        summary: 'Search Villages',
        description: 'Advanced search through village records.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term' },
          { name: 'state', in: 'query', schema: { type: 'string' }, description: 'State filter' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 }, description: 'Pagination limit' }
        ],
        responses: {
          '200': { description: 'Success' }
        }
      }
    },
    '/states': {
      get: {
        summary: 'List all states',
        responses: {
          '200': { description: 'Success' }
        }
      }
    },
    '/states/{id}/districts': {
      get: {
        summary: 'Get Districts by State',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Success' }
        }
      }
    }
  }
};

export default function ClientDocs() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">Interactive reference for all endpoints.</p>
        </div>

        <div className="bg-background border rounded-lg shadow-sm overflow-hidden p-4 swagger-container-overrides">
          {/* Custom CSS overrides for Swagger inside dark mode / Tailwind if needed */}
          <SwaggerUI spec={swaggerSpec} filter={true} tryItOutEnabled={true} />
        </div>
      </div>
    </DashboardLayout>
  );
}
