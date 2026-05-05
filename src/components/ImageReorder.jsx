import { useState } from 'react'

export function ImageReorder({ images, onReorder, onDelete, label = '기존 사진' }) {
  if (!images || images.length === 0) return null

  const moveLeft = (i) => {
    if (i === 0) return
    const reordered = [...images]
    ;[reordered[i - 1], reordered[i]] = [reordered[i], reordered[i - 1]]
    onReorder(reordered)
  }

  const moveRight = (i) => {
    if (i === images.length - 1) return
    const reordered = [...images]
    ;[reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]]
    onReorder(reordered)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label} ({images.length}장)</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((url, i) => (
          <div key={url + i} className="relative flex-shrink-0 flex flex-col items-center gap-1">
            <div className="relative">
              <img src={url} className="h-20 w-20 object-cover rounded-lg select-none" draggable={false} />
              <div className="absolute top-0 left-0 bg-black bg-opacity-40 text-white text-xs w-5 h-5 flex items-center justify-center rounded-tl-lg rounded-br-lg">
                {i + 1}
              </div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(url)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none">
                  ✕
                </button>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveLeft(i)}
                  disabled={i === 0}
                  className="w-8 h-6 rounded bg-gray-100 text-gray-600 text-xs flex items-center justify-center disabled:opacity-20 hover:bg-gray-200">
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveRight(i)}
                  disabled={i === images.length - 1}
                  className="w-8 h-6 rounded bg-gray-100 text-gray-600 text-xs flex items-center justify-center disabled:opacity-20 hover:bg-gray-200">
                  →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
