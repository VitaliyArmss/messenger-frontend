// components/MessageGroup.jsx
import React from 'react';
import MessageBubble from './MessageBubble';
import SenderAvatar from './SenderAvatar';
import '../css/index.css';

const MessageGroup = ({ messages, currentUserId, imageUrls, onContextMenu }) => {
    if (!messages || messages.length === 0) return null;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const isOwn = firstMessage.senderId === currentUserId;

    return (
        <div className={`message-group ${isOwn ? 'own' : 'other'}`}>
            {/* Аватар – показываем только для чужих сообщений, один раз на группу */}
            {!isOwn && (
                <div className="message-group-avatar">
                    <SenderAvatar
                        avatarUrl={firstMessage.senderAvatarUrl}
                        name={firstMessage.senderName}
                        size={36}
                    />
                </div>
            )}

            <div className="message-group-bubbles">
                {messages.map((msg, index) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOwn={isOwn}
                        isSystem={msg.isSystem}
                        imageUrls={imageUrls}
                        onContextMenu={onContextMenu}
                        isFirstInGroup={index === 0}
                        isLastInGroup={index === messages.length - 1}
                    />
                ))}
            </div>
        </div>
    );
};

export default MessageGroup;