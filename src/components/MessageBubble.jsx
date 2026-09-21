// MessageBubble.jsx
import AttachmentItem from './AttachmentItem';
import SenderAvatar from './SenderAvatar';
import '../css/index.css';

const MessageBubble = ({
    message,
    isOwn,
    isSystem,
    imageUrls,
    onContextMenu,
    showName,
    showAvatar,
    isGrouped
}) => {
    const readCount = message.readBy?.length || 0;
    const showReadStatus = isOwn && !isSystem && readCount > 1;
    const showSendStatus = isOwn && !showReadStatus;

    const createdAt = message.createdAt
        ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    const handleContextMenu = (e) => {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        if (onContextMenu) onContextMenu(e, message);
    };

    const renderAttachments = (attachments) => {
        if (!attachments?.length) return null;

        return (
            <div className="attachments-container">
                {attachments.map((att) => (
                    <AttachmentItem
                        key={att.id}
                        attachment={att}
                        preloadedUrl={imageUrls?.[att.id] || null}
                    />
                ))}
            </div>
        );
    };

    if (isSystem) {
        return (
            <div data-message-id={message.id} onContextMenu={handleContextMenu}>
                <div className="message-bubble-wrapper system">
                    <div className="message-bubble system">
                        <div className="message-text system">{message.text}</div>
                    </div>
                </div>
            </div>
        );
    }

    const bubbleClasses = `message-bubble ${isOwn ? 'own' : 'other'} ${!isOwn && showAvatar ? 'last' : ''}`;

    return (
        <div data-message-id={message.id} onContextMenu={handleContextMenu}>
            <div className={`message-bubble-wrapper ${isOwn ? 'own' : 'other'} ${isGrouped ? 'grouped' : ''} ${!isOwn && !showAvatar ? 'no-avatar' : ''}`}>
                {!isOwn && showAvatar && (
                    <SenderAvatar
                        avatarUrl={message.senderAvatarUrl}
                        name={message.senderName}
                        size={36}
                    />
                )}

                <div className={bubbleClasses}>
                    {!isOwn && showName && (
                        <div className="message-sender">{message.senderName || 'Неизвестный'}</div>
                    )}

                    {renderAttachments(message.attachments)}

                    <div className="message-body">
                        <span className="message-text">{message.text}</span>
                        <span className="message-time">{createdAt}</span>

                        {message.isEdited && (
                            <span className="message-edited">изменено</span>
                        )}

                        {showReadStatus && (
                            <span className="read-status">✓✓</span>
                        )}

                        {showSendStatus && (
                            <span className="read-status">✓</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;