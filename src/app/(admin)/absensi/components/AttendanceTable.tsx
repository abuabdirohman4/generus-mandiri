'use client'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

interface AttendanceTableProps {
  students: Student[]
  attendance: AttendanceData
  onStatusChange: (studentId: string, status: 'H' | 'I' | 'S' | 'A') => void
  className?: string
}

export default function AttendanceTable({ 
  students, 
  attendance, 
  onStatusChange, 
  className = '' 
}: AttendanceTableProps) {
  // Sort students by name and filter out any with invalid IDs
  const sortedStudents = [...students]
    .filter(student => student.id && student.id.trim() !== '')
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-2 sm:px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Nama
              </th>
              <th className="px-1 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                Hadir
              </th>
              <th className="px-1 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                Izin
              </th>
              <th className="px-1 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                Sakit
              </th>
              <th className="px-1 pr-2 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-10 sm:w-16">
                Alfa
              </th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedStudents.map((student, index) => (
              <tr key={student.id || `student-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {/* Student Info */}
                <td className="px-2 sm:px-6 py-3 sm:py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.name}
                    </div>
                    {attendance[student.id]?.reason && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Alasan: {attendance[student.id].reason}
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Status Radio Buttons */}
                {(['H', 'I', 'S', 'A'] as const).map((status, index) => (
                  <td key={status} className={`px-1 py-3 sm:py-4 text-center ${index === 3 ? 'pr-2' : ''}`}>
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="radio"
                        name={`status-${student.id}`}
                        value={status}
                        checked={attendance[student.id]?.status === status}
                        onChange={() => onStatusChange(student.id, status)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
