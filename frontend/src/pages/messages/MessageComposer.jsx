import React from 'react'
import { HiPlus, HiEmojiHappy, HiPhotograph, HiPaperClip, HiPaperAirplane, HiX } from 'react-icons/hi'
import EmojiPicker from 'emoji-picker-react'

export default function MessageComposer({
    text,
    setText,
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
    fileRef
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

            <div className="dm-composer-main">
                <div className="dm-composer-actions-left">
                    <button className="dm-composer-icon-btn" onClick={() => fileRef.current?.click()}>
                        <HiPhotograph />
                    </button>
                    <input 
                        type="file" 
                        ref={fileRef} 
                        onChange={handleFileSelect} 
                        style={{ display: 'none' }} 
                        accept="image/*,video/*"
                    />
                </div>

                <div className="dm-input-area">
                    <div className="dm-input-wrapper">
                        <textarea
                            ref={inputRef}
                            value={text}
                            onChange={handleType}
                            placeholder="Message..."
                            className="dm-textarea dark-scrollbar"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                        />
                        <button 
                            className="dm-emoji-btn" 
                            onClick={() => setShowEmoji(!showEmoji)}
                        >
                            <HiEmojiHappy />
                        </button>
                        
                        {showEmoji && (
                            <div className="dm-emoji-popover">
                                <EmojiPicker 
                                    onEmojiClick={insertEmoji}
                                    theme="dark"
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="dm-composer-actions-right">
                    <button 
                        className={`dm-send-btn ${(!text.trim() && !filePreview) || isUploading ? 'disabled' : ''}`}
                        onClick={handleSend}
                        disabled={(!text.trim() && !filePreview) || isUploading}
                    >
                        {isUploading ? (
                            <div className="dm-loading-spinner-sm" />
                        ) : (
                            <HiPaperAirplane />
                        )}
                    </button>
                </div>
            </div>
        </footer>
    )
}
