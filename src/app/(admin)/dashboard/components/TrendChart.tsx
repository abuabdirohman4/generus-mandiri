interface TrendData {
  date: string;
  attendance: number;
}

interface TrendChartProps {
  data: TrendData[];
}

export default function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p>No data available</p>
      </div>
    );
  }

  const maxAttendance = Math.max(...data.map(item => item.attendance));
  const minAttendance = Math.min(...data.map(item => item.attendance));
  const range = maxAttendance - minAttendance;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>Kehadiran (%)</span>
        <span>{maxAttendance}%</span>
      </div>
      
      <div className="relative h-48">
        <div className="absolute inset-0 flex items-end space-x-1">
          {data.map((item, index) => {
            const height = range > 0 ? ((item.attendance - minAttendance) / range) * 100 : 50;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-600 rounded-t transition-all duration-300 hover:bg-blue-700"
                  style={{ height: `${height}%` }}
                  title={`${item.date}: ${item.attendance}%`}
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-left">
                  {new Date(item.date).toLocaleDateString('id-ID', { 
                    day: '2-digit', 
                    month: '2-digit' 
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <span>Tanggal</span>
        <span>{minAttendance}%</span>
      </div>
    </div>
  );
}
