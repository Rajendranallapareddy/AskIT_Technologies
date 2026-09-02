import {
  ReactNode,
} from 'react';

import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';

export interface Column<T> {
  header: string;

  render: (
    row: T
  ) => ReactNode;

  className?: string;
}

interface DataTableProps<T> {
  columns:
    Column<T>[];

  rows:
    T[] | null;

  keyField: (
    row: T
  ) => string;

  emptyTitle?: string;

  emptyDescription?: string;

  onRowClick?: (
    row: T
  ) => void;
}

export default function DataTable<T>({
  columns,
  rows,
  keyField,
  emptyTitle =
    'No records found',
  emptyDescription,
  onRowClick,
}: DataTableProps<T>) {
  if (rows === null) {
    return (
      <LoadingSpinner />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={
          emptyTitle
        }
        description={
          emptyDescription
        }
      />
    );
  }

  return (
    <div
      className="
        w-full
        max-w-full
        overflow-x-auto
        rounded-xl
        border
        border-navy-100
      "
    >
      <table
        className="
          w-full
          min-w-[720px]
          text-sm
        "
      >
        <thead className="bg-navy-50 text-navy-600">
          <tr>
            {columns.map(
              (col) => (
                <th
                  key={
                    col.header
                  }
                  className="
                    text-left
                    font-bold
                    px-4
                    py-3
                    whitespace-nowrap
                  "
                >
                  {
                    col.header
                  }
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-navy-100">
          {rows.map(
            (row) => (
              <tr
                key={
                  keyField(
                    row
                  )
                }
                onClick={
                  onRowClick
                    ? () =>
                        onRowClick(
                          row
                        )
                    : undefined
                }
                className={`
                  hover:bg-navy-50/60
                  transition
                  ${
                    onRowClick
                      ? 'cursor-pointer'
                      : ''
                  }
                `}
              >
                {columns.map(
                  (col) => (
                    <td
                      key={
                        col.header
                      }
                      className={`
                        px-4
                        py-3
                        align-middle
                        max-w-[280px]
                        safe-wrap
                        ${
                          col.className ||
                          ''
                        }
                      `}
                    >
                      <div className="min-w-0 max-w-full">
                        {
                          col.render(
                            row
                          )
                        }
                      </div>
                    </td>
                  )
                )}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}