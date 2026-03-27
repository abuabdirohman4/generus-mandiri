'use client'

import type { SebaranSiswaData, SebaranSiswaStats } from '../../actions/sebaran/types'
import SebaranSiswaNode from './SebaranSiswaNode'
import SebaranSiswaStatsComponent from './SebaranSiswaStats'

interface Props {
  data: SebaranSiswaData
  stats: SebaranSiswaStats
  loading?: boolean
  error?: string
}

export default function SebaranSiswaTab({ data, stats, loading, error }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div>
      <SebaranSiswaStatsComponent stats={stats} />

      <div className="space-y-2">
        {data.level === 'kelas' && data.data.map((kelas) => (
          <SebaranSiswaNode
            key={kelas.id}
            name={kelas.name}
            totalStudents={kelas.total_students}
            isLeaf
          />
        ))}

        {data.level === 'kelompok' && data.data.map((klp) => (
          <SebaranSiswaNode
            key={klp.id}
            name={klp.name}
            totalStudents={klp.total_students}
            childCount={klp.kelas.length}
            childLabel="kelas"
          >
            <div className="space-y-2">
              {klp.kelas.map((k) => (
                <SebaranSiswaNode key={k.id} name={k.name} totalStudents={k.total_students} isLeaf />
              ))}
            </div>
          </SebaranSiswaNode>
        ))}

        {data.level === 'desa' && data.data.map((desa) => (
          <SebaranSiswaNode
            key={desa.id}
            name={desa.name}
            totalStudents={desa.total_students}
            childCount={desa.kelompok.length}
            childLabel="kelompok"
          >
            <div className="space-y-2">
              {desa.kelompok.map((klp) => (
                <SebaranSiswaNode
                  key={klp.id}
                  name={klp.name}
                  totalStudents={klp.total_students}
                  childCount={klp.kelas.length}
                  childLabel="kelas"
                >
                  <div className="space-y-2">
                    {klp.kelas.map((k) => (
                      <SebaranSiswaNode key={k.id} name={k.name} totalStudents={k.total_students} isLeaf />
                    ))}
                  </div>
                </SebaranSiswaNode>
              ))}
            </div>
          </SebaranSiswaNode>
        ))}

        {data.level === 'daerah' && data.data.map((daerah) => (
          <SebaranSiswaNode
            key={daerah.id}
            name={daerah.name}
            totalStudents={daerah.total_students}
            childCount={daerah.desa.length}
            childLabel="desa"
          >
            <div className="space-y-2">
              {daerah.desa.map((desa) => (
                <SebaranSiswaNode
                  key={desa.id}
                  name={desa.name}
                  totalStudents={desa.total_students}
                  childCount={desa.kelompok.length}
                  childLabel="kelompok"
                >
                  <div className="space-y-2">
                    {desa.kelompok.map((klp) => (
                      <SebaranSiswaNode
                        key={klp.id}
                        name={klp.name}
                        totalStudents={klp.total_students}
                        childCount={klp.kelas.length}
                        childLabel="kelas"
                      >
                        <div className="space-y-2">
                          {klp.kelas.map((k) => (
                            <SebaranSiswaNode key={k.id} name={k.name} totalStudents={k.total_students} isLeaf />
                          ))}
                        </div>
                      </SebaranSiswaNode>
                    ))}
                  </div>
                </SebaranSiswaNode>
              ))}
            </div>
          </SebaranSiswaNode>
        ))}
      </div>
    </div>
  )
}
