import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DataTable from '../Table'

const columns = [{ key: 'name', label: 'Name' }]
const data = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
]

describe('DataTable selection', () => {
  it('does not render checkboxes when selectable is not set', () => {
    render(<DataTable columns={columns} data={data} pagination={false} searchable={false} />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('calls onSelectionChange with the row id added when an unselected row checkbox is clicked', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        searchable={false}
        selectable
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />
    )

    // checkbox[0] = select-all header, checkbox[1] = row for Alice (id '1')
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1']))
  })

  it('calls onSelectionChange with the row id removed when a selected row checkbox is clicked', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        searchable={false}
        selectable
        selectedIds={new Set(['1', '2'])}
        onSelectionChange={onSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Alice, id '1'

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['2']))
  })

  it('selects all rows when the header checkbox is clicked and none are selected', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        searchable={false}
        selectable
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // header select-all

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2', '3']))
  })

  it('unselects all rows when the header checkbox is clicked and all are already selected', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        searchable={false}
        selectable
        selectedIds={new Set(['1', '2', '3'])}
        onSelectionChange={onSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    expect(onSelectionChange).toHaveBeenCalledWith(new Set())
  })

  it('uses a custom getRowId to match selection state', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        searchable={false}
        selectable
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
        getRowId={(item) => `custom-${item.id}`}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[2]) // Bob, custom id

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['custom-2']))
  })

  it('does not render bulk actions when selection is empty', () => {
    const renderBulkActions = vi.fn(() => <div data-testid="bulk-actions">Delete</div>)
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        searchable={false}
        selectable
        selectedIds={new Set()}
        onSelectionChange={vi.fn()}
        renderBulkActions={renderBulkActions}
      />
    )

    expect(screen.queryByTestId('bulk-actions')).toBeNull()
  })

  it('renders bulk actions when selection is non-empty', () => {
    const renderBulkActions = vi.fn(() => <div data-testid="bulk-actions">Delete</div>)
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        searchable={false}
        selectable
        selectedIds={new Set(['1'])}
        onSelectionChange={vi.fn()}
        renderBulkActions={renderBulkActions}
      />
    )

    expect(screen.getByTestId('bulk-actions')).toBeDefined()
    expect(renderBulkActions).toHaveBeenCalledWith(new Set(['1']), expect.any(Function))
  })
})
