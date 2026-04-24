import { HiEmojiHappy, HiPhotograph, HiPaperClip, HiPaperAirplane, HiX } from 'react-icons/hi'
import EmojiPicker from 'emoji-picker-react'

export default function MessageComposer({
    text,
    handleType,
    handleSend,
    handleFileSelect,
    filePreview,
    setFilePreview,
    showEmoji,
    setShowEmoji,
    insertEmoji,
    isUploading,
    inputRef,
    fileRef,
    editingMessage,
    onCancelEdit
}) {
    return (
        <footer className="dm-composer-root">
            {filePreview && (
                <div className="dm-composer-preview">
                    <div className="dm-preview-card">
                        {filePreview.type === 'image' ? (
                            <img src={filePreview.url} alt="" className="dm-preview-img" />
                        ) : (
                            <div className="dm-preview-doc">
                                <HiPaperClip size={24} />
                                <span className="truncate">{filePreview.name}</span>
                            </div>
                        )}
                        <button className="dm-preview-remove" onClick={() => setFilePreview(null)}>
                            <HiX />
                        </button>
                    </div>
                </div>
            )}

            {editingMessage && (
                <div className="dm-composer-preview">
                    <div className="dm-preview-card dm-edit-banner">
                        <div className="dm-preview-doc">
                            <span className="dm-edit-label">Editing Message</span>
                            <span className="dm-edit-body truncate">{editingMessage.body}</span>
                        </div>
                        <button className="dm-preview-remove" onClick={onCancelEdit}>
                            <HiX />
                        </button>
                    </div>
                </div>
            )}

            <div className="dm-composer-container">
                <div className="dm-composer-main-pill">
                    <button 
                        className="dm-composer-pill-action" 
                        onClick={() => fileRef.current?.click()}
                        title="Attach file"
                    >
                        <HiPhotograph size={22} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileRef} 
                        onChange={handleFileSelect} 
                        style={{ display: 'none' }} 
                        accept="image/*,video/*"
                    />

                    <div className="dm-input-flex-wrapper">
                        <textarea
                            ref={inputRef}
                            value={text}
                            onChange={handleType}
                            placeholder="Write a message..."
                            className="dm-textarea-pill dark-scrollbar"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                        />
                        
                        <div className="dm-pill-emoji-wrap">
                            <button 
                                className="dm-emoji-btn-pill" 
                                onClick={() => setShowEmoji(!showEmoji)}
                            >
                                <HiEmojiHappy size={22} />
                            </button>
                            
                            {showEmoji && (
                                <div className="dm-emoji-popover-pill">
                                    <EmojiPicker 
                                        onEmojiClick={insertEmoji}
                                        theme={document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'}
                                        width={300}
                                        height={400}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <button 
                        className="dm-send-btn-pill"
                        onClick={handleSend}
                        disabled={(!text.trim() && !filePreview) || isUploading}
                        title="Send message"
                    >
                        {isUploading ? (
                            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        ) : (
                            <HiPaperAirplane size={24} style={{ transform: 'rotate(45deg)', marginLeft: -2 }} />
                        )}
                    </button>
                </div>
            </div>
        </footer>
    )
}
