import React from 'react';

interface Column {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
}

export function DataTable({ columns, data, isLoading }: DataTableProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-background border rounded-lg overflow-hidden shadow-sm">
        <div className="p-8 text-center text-muted-foreground animate-pulse">
          Loading data...
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="w-full bg-background border rounded-lg overflow-hidden shadow-sm">
        <div className="p-8 text-center text-muted-foreground">
          No records found.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td key={`${row.id || i}-${col.key}`} className="px-6 py-4 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
