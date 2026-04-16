"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, File, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface Document {
  _id: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  createdAt: string
}

interface DocumentUploadProps {
  onDocumentUploaded: (document: Document) => void
  onDocumentSelected: (documentId: string) => void
  selectedDocumentId?: string | null
}

export function DocumentUpload({ onDocumentUploaded, onDocumentSelected, selectedDocumentId }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/documents/list`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUploadedDocuments(data.documents || [])
      }
    } catch (error) {
      console.error("Error loading documents:", error)
    }
  }

  const handleFileSelect = async (file: File) => {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      })
      return
    }

    // Validate file type
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.md']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF, DOCX, TXT, and MD files are allowed',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${apiBase}/api/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload document')
      }

      const newDocument: Document = {
        _id: data.document._id,
        filename: data.document.filename,
        originalName: data.document.filename,
        fileType: data.document.fileType,
        fileSize: data.document.fileSize,
        createdAt: new Date().toISOString(),
      }

      setUploadedDocuments([newDocument, ...uploadedDocuments])
      onDocumentUploaded(newDocument)
      onDocumentSelected(newDocument._id)

      toast({
        title: 'Document uploaded',
        description: 'Your document has been processed and is ready for chat',
      })
    } catch (error: any) {
      console.error('Error uploading document:', error)
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDelete = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setUploadedDocuments(uploadedDocuments.filter(doc => doc._id !== documentId))
        if (selectedDocumentId === documentId) {
          onDocumentSelected(null)
        }
        toast({
          title: 'Document deleted',
          description: 'Document has been removed',
        })
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileType: string) => {
    return <File className="w-4 h-4 text-blue-400" />
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="text-slate-400">Uploading and processing document...</p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">Drag and drop a PDF, DOCX, TXT, or MD file here</p>
            <p className="text-sm text-slate-500 mb-4">or</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Select File
            </Button>
            <p className="text-xs text-slate-500 mt-2">Maximum file size: 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Uploaded Documents List */}
      {uploadedDocuments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Uploaded Documents</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadedDocuments.map((doc) => (
              <div
                key={doc._id}
                onClick={() => onDocumentSelected(doc._id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedDocumentId === doc._id
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(doc.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{doc.originalName}</p>
                      <p className="text-xs text-slate-500">
                        {doc.fileType.toUpperCase()} • {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(doc._id, e)}
                    className="p-1 hover:bg-red-500/10 rounded transition-colors text-red-400 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

