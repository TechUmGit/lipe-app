export interface Livro {
  id: string
  titulo: string
  autor: string
  /** id da capa no Open Library (https://covers.openlibrary.org/b/id/{capaId}-M.jpg); ausente = sem capa encontrada */
  capaId?: number
}
