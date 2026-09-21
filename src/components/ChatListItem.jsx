import { Link } from 'react-router-dom';
import NullAvatar from './NullAvatar';
import { useAvatar } from '../hooks/useAvatar';

const ChatListItem = ({ chat, user, onChatSelect }) => {
    const avatarBlob = useAvatar(chat?.avatarUrl);
    const isOwn = chat.lastMessageSenderId === user?.id;

    // Получаем отображаемый текст
    let displayText = 'Нет сообщений';
    if (chat.lastMessageText || chat.hasLastMessageFile) {
        if (isOwn) {
            displayText = `Вы: ${chat.hasLastMessageFile ? '*Файл*' : ''} ${chat.lastMessageText}`;
        } else if (chat.isGroup && chat.lastMessageSender?.name) {
            // Для групп показываем имя отправителя
            displayText = `${chat.lastMessageSenderName}: ${chat.hasLastMessageFile ? '*Файл*' : ''} ${chat.lastMessageText}`;
        } else {
            // Для личных чатов или если имя недоступно
            displayText = (chat.hasLastMessageFile ? '*Файл*' : '') + chat.lastMessageText;
        }
    }

    const displayName = chat.name || 'Чат';

    return (
        <Link
            to={`/chats/${chat.id}`}
            className="chat-item"
            onClick={() => onChatSelect(chat.id)}
        >
            <NullAvatar name={displayName} picture={avatarBlob} size={48} />
            <div className="chat-info">
                <div className="chat-name">{displayName}</div>
                <div className="chat-last-message">{displayText}</div>
            </div>
            <div className="chat-meta">
                <div className="chat-time">
                    {chat.lastMessageAt &&
                        new Date(chat.lastMessageAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                </div>
                {chat.unreadMessagesCount > 0 && (
                    <span className="unread-badge">{chat.unreadMessagesCount}</span>
                )}
            </div>
        </Link>
    );
};

export default ChatListItem;