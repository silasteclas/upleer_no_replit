import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''
const bucketName = process.env.SUPABASE_BUCKET || 'product-images'

// Create client with the actual values from environment
export const supabase = createClient(supabaseUrl, supabaseKey)

// Export bucket name for use in other files
export const SUPABASE_BUCKET = bucketName

/**
 * Faz upload de um arquivo para o Supabase Storage
 * @param file Buffer do arquivo
 * @param fileName Nome único do arquivo
 * @param contentType Tipo de conteúdo (ex: 'image/jpeg')
 * @returns URL pública do arquivo ou null em caso de erro
 */
export async function uploadFileToSupabase(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string | null> {
  try {
    // Upload do arquivo
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Erro no upload do Supabase:', error)
      return null
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Erro no upload para Supabase:', error)
    return null
  }
}

/**
 * Remove um arquivo do Supabase Storage
 * @param fileName Nome do arquivo para remover
 * @returns true se removido com sucesso, false caso contrário
 */
export async function deleteFileFromSupabase(fileName: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName])

    if (error) {
      console.error('Erro ao remover arquivo do Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao remover arquivo do Supabase:', error)
    return false
  }
}

/**
 * Extrai o nome do arquivo de uma URL do Supabase
 * @param url URL do Supabase
 * @returns Nome do arquivo ou null
 */
export function extractFileNameFromSupabaseUrl(url: string): string | null {
  try {
    const urlParts = url.split('/')
    return urlParts[urlParts.length - 1] || null
  } catch {
    return null
  }
} 