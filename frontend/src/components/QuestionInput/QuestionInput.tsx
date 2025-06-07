import { useContext, useState } from 'react'
import { FontIcon, Stack, TextField } from '@fluentui/react'
import { SendRegular } from '@fluentui/react-icons'

import Send from '../../assets/Send.svg'

import styles from './QuestionInput.module.css'
import { ChatMessage, processDocumentWithAI } from '../../api'
import { AppStateContext } from '../../state/AppProvider'
import { resizeImage } from '../../utils/resizeImage'

interface Props {
  onSend: (question: ChatMessage['content'], id?: string) => void
  disabled: boolean
  placeholder?: string
  clearOnSend?: boolean
  conversationId?: string
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId }: Props) => {
  const [question, setQuestion] = useState<string>('')
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<any>(null)

  const appStateContext = useContext(AppStateContext)
  const OYD_ENABLED = appStateContext?.state.frontendSettings?.oyd_enabled || false

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await convertToBase64(file)
    }
  }

  const convertToBase64 = async (file: Blob) => {
    try {
      const resizedBase64 = await resizeImage(file, 800, 800)
      setBase64Image(resizedBase64)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const processedDocument = await processDocumentWithAI(file)
      
      setUploadedFile({
        ...processedDocument,
        display_summary: processedDocument.enhanced_content.summary,
        full_content: processedDocument.enhanced_content.original_text
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Document processing failed')
    } finally {
      setIsUploading(false)
    }
  }

  const sendQuestion = () => {
    if (disabled || (!question.trim() && !uploadedFile)) {
      return
    }

    let questionContent = question
    if (uploadedFile) {
      questionContent = `File: ${uploadedFile.filename}\n\n${uploadedFile.full_content}\n\nUser Question: ${question}`
    }

    const questionTest: ChatMessage["content"] = base64Image ? 
      [{ type: "text", text: questionContent }, { type: "image_url", image_url: { url: base64Image } }] : 
      questionContent

    if (conversationId && questionTest !== undefined) {
      onSend(questionTest, conversationId)
    } else {
      onSend(questionTest)
    }

    if (clearOnSend) {
      setQuestion('')
      setUploadedFile(null)
      setBase64Image(null)
    }
  }

  const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
    if (ev.key === 'Enter' && !ev.shiftKey && !(ev.nativeEvent?.isComposing === true)) {
      ev.preventDefault()
      sendQuestion()
    }
  }

  const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
    setQuestion(newValue || '')
  }

  const sendQuestionDisabled = disabled || (!question.trim() && !uploadedFile)

  return (
    <Stack horizontal className={styles.questionInputContainer}>
      {/* Error display */}
      {uploadError && (
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '12px',
          right: '12px',
          color: 'red',
          fontSize: '12px',
          backgroundColor: '#ffe6e6',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ffcccc'
        }}>
          {uploadError}
        </div>
      )}
      
      {/* File preview - Alternative side placement */}
      {/* {uploadedFile && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '80px',  // Next to the send button
          backgroundColor: '#e6f3ff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          border: '1px solid #cce6ff',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center'
        }}>
          📄 {uploadedFile.filename}
          <button 
            onClick={() => setUploadedFile(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              fontSize: '14px',
              marginLeft: '4px'
            }}
          >
            ✕
          </button>
        </div>
      )} */}

      <TextField
        className={styles.questionInputTextArea}
        placeholder={placeholder}
        multiline
        resizable={false}
        borderless
        value={question}
        onChange={onQuestionChange}
        onKeyDown={onEnterPress}
      />

      {/* Document Upload */}
      <div className={styles.fileInputContainer}>
        <input
          type="file"
          id="fileInput"
          onChange={handleFileUpload}
          accept=".txt,.md,.py,.js,.html,.css,.json,.xml,.csv,.pdf,.docx,.doc"
          className={styles.fileInput}
        />
        <label 
          htmlFor="fileInput" 
          className={styles.fileLabel} 
          aria-label='Upload Document'
          style={{
            backgroundColor: uploadedFile ? '#0078d4' : undefined,  // Blue when file loaded
            color: uploadedFile ? 'white' : undefined,
            border: uploadedFile ? '2px solid #0078d4' : undefined
          }}
        >
          <FontIcon
            className={styles.fileIcon}
            iconName={'Attach'}
            aria-label='Upload Document'
            style={{
              color: uploadedFile ? 'white' : undefined  // White icon when file loaded
            }}
          />
        </label>
      </div>

      {/* Image Upload (always show) - Remove the OYD_ENABLED condition */}
      <div className={styles.fileInputContainer}>
        <input
          type="file"
          id="imageInput"
          onChange={handleImageUpload}
          accept="image/*"
          className={styles.fileInput}
        />
        <label htmlFor="imageInput" className={styles.fileLabel} aria-label='Upload Image'>
          <FontIcon
            className={styles.fileIcon}
            iconName={'PhotoCollection'}
            aria-label='Upload Image'
          />
        </label>
      </div>

      {base64Image && <img className={styles.uploadedImage} src={base64Image} alt="Uploaded Preview" />}
      
      <div
        className={styles.questionInputSendButtonContainer}
        role="button"
        tabIndex={0}
        aria-label="Ask question button"
        onClick={sendQuestion}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? sendQuestion() : null)}>
        {sendQuestionDisabled ? (
          <SendRegular className={styles.questionInputSendButtonDisabled} />
        ) : (
          <img src={Send} className={styles.questionInputSendButton} alt="Send Button" />
        )}
      </div>
      <div className={styles.questionInputBottomBorder} />
    </Stack>
  )
}
