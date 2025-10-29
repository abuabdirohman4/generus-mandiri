'use server'

import { createClient } from '@/lib/supabase/server'
import { MaterialContent } from './types'

/**
 * Create sample learning materials for testing
 * This function creates sample data for class master "Kelas 6 SD"
 */
export async function createSampleMaterials() {
  try {
    const supabase = await createClient()
    
    // First, find or create a class master for "Kelas 6 SD"
    const { data: existingClassMaster } = await supabase
      .from('class_masters')
      .select('id')
      .eq('name', 'Kelas 6 SD')
      .single()

    let classMasterId = existingClassMaster?.id

    if (!classMasterId) {
      // Create class master if it doesn't exist
      const { data: newClassMaster, error: classMasterError } = await supabase
        .from('class_masters')
        .insert({
          name: 'Kelas 6 SD',
          description: 'Materi pembelajaran untuk kelas 6 SD'
        })
        .select('id')
        .single()

      if (classMasterError) {
        throw classMasterError
      }

      classMasterId = newClassMaster.id
    }

    // Sample material for January, Week 1, Monday
    const sampleMaterial: MaterialContent = {
      quran: {
        title: "Baca Al-Qur'an",
        items: ["juz 7"]
      },
      hafalan: {
        title: "Hafalan Dalil-dalil",
        items: [
          {
            title: "Tri Sukses Generasi Penerus",
            arabic: "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ",
            latin: "Wa innaka la'ala khuluqin 'azhim",
            meaning: "Dan sesungguhnya kamu benar-benar berbudi pekerti yang agung",
            reference: "Surat Al-Qalam: 4"
          }
        ]
      },
      doa: {
        title: "Do'a",
        items: [
          {
            title: "Do'a Perlindungan dari penganiayaan",
            arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْفَقْرِ وَالْقِلَّةِ وَالذِّلَّةِ، وَأَعُوذُ بِكَ مِنْ أَنْ أَظْلِمَ أَوْ أُظْلَمَ",
            latin: "Allahumma inni a'udzu bika minal faqri wal qillati wadz dzillati, wa a'udzu bika min an azlima aw uzlam",
            meaning: "Ya Allah, aku berlindung kepada-Mu dari kefakiran, kekurangan, dan kehinaan, dan aku berlindung kepada-Mu dari berbuat zalim atau dizalimi",
            reference: "HR. Abu Dawud"
          }
        ]
      },
      akhlaq: {
        title: "Akhlaqul Karimah",
        items: [
          {
            title: "Enam Thobiat Luhur - Sifat Jujur",
            meaning: "Jujur adalah sikap pribadi orang Jama'ah, yang apabila berkata benar, tidak dusta, tidak menipu, polos apa adanya."
          }
        ]
      },
      hadits: {
        title: "Hadits",
        items: [
          {
            title: "Kitab Adab",
            meaning: "Materi hadits tentang adab dan akhlak"
          }
        ]
      },
      kamis: {
        title: "Kamis",
        items: [
          "Baca Al-Qur'an: juz 7",
          "Makna Al-Qur'an",
          "Terampil menulis makna pegon",
          "Asma'ul Husna: no 1 - 99"
        ]
      },
      jumat: {
        title: "Jum'at",
        items: [
          "Tajwid: Mempraktikkan tajwid yang sudah dipelajari dalam membaca Al-Qur'an juz 7",
          "Adab/Tatakrama",
          "Praktek Ibadah"
        ]
      },
      sabtu: {
        title: "Sabtu",
        items: [
          "Ekstrakurikuler",
          "Pramuka",
          "Pencak Silat Asad"
        ]
      }
    }

    // Insert sample material
    const { data: material, error } = await supabase
      .from('learning_materials')
      .upsert({
        class_master_id: classMasterId,
        semester: 1,
        month: 1, // January
        week: 1,
        day_of_week: 1, // Monday
        content: sampleMaterial
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log('Sample material created:', material)
    return material

  } catch (error) {
    console.error('Error creating sample materials:', error)
    throw error
  }
}

/**
 * Parse HTML content and extract structured data
 * This is a simplified version - in production, you'd want a more robust parser
 */
export function parseMaterialHTML(htmlContent: string): Partial<MaterialContent> {
  // This is a simplified parser - in production you'd want to use a proper HTML parser
  // For now, we'll return a basic structure
  
  const content: Partial<MaterialContent> = {}
  
  // Extract Quran content
  if (htmlContent.includes('Baca Al-Qur\'an')) {
    content.quran = {
      title: "Baca Al-Qur'an",
      items: ["juz 7"] // Default for now
    }
  }
  
  // Extract Hafalan content
  if (htmlContent.includes('Hafalan')) {
    content.hafalan = {
      title: "Hafalan",
      items: ["Tri Sukses Generasi Penerus"]
    }
  }
  
  // Extract Do'a content
  if (htmlContent.includes('Do\'a')) {
    content.doa = {
      title: "Do'a",
      items: ["Do'a perlindungan dari penganiayaan"]
    }
  }
  
  // Extract Akhlaq content
  if (htmlContent.includes('Akhlaqul Karimah')) {
    content.akhlaq = {
      title: "Akhlaqul Karimah",
      items: ["Enam Thobiat Luhur - Sifat Jujur"]
    }
  }
  
  // Extract Hadits content
  if (htmlContent.includes('Hadits')) {
    content.hadits = {
      title: "Hadits",
      items: ["Kitab Adab"]
    }
  }
  
  return content
}
