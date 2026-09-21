// MessageList.jsx
import MessageBubble from './MessageBubble';
import '../css/index.css';

// Порог времени для группировки (5 минут)
const TIME_THRESHOLD = 5 * 60 * 1000;

// Форматирует дату: "Сегодня", "Вчера" или "дд месяц гггг"
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const MessageList = ({ messages, currentUserId, imageUrls, onContextMenu }) => {
    if (!messages || messages.length === 0) return null;

    // Расширяем каждое сообщение дополнительными флагами для группировки
    const enrichedMessages = messages.map((msg, index, arr) => {
        const prev = index > 0 ? arr[index - 1] : null;
        const next = index < arr.length - 1 ? arr[index + 1] : null;

        // Системные сообщения не группируются
        if (msg.isSystem) {
            return {
                ...msg,
                showName: false,
                showAvatar: false,
                isGrouped: false,
            };
        }

        // Проверяем, является ли предыдущее сообщение от того же отправителя и в пределах порога
        const isSameSenderAsPrev = prev &&
            !prev.isSystem &&
            prev.senderId === msg.senderId &&
            (new Date(msg.createdAt) - new Date(prev.createdAt)) <= TIME_THRESHOLD;

        const isSameSenderAsNext = next &&
            !next.isSystem &&
            next.senderId === msg.senderId &&
            (new Date(next.createdAt) - new Date(msg.createdAt)) <= TIME_THRESHOLD;

        // Имя показываем только если предыдущее сообщение НЕ от того же отправителя
        const showName = !isSameSenderAsPrev;

        // Аватар показываем только если следующее сообщение НЕ от того же отправителя
        const showAvatar = !isSameSenderAsNext;

        // Сообщение считается группированным, если оно имеет соседа слева или справа того же отправителя
        const isGrouped = isSameSenderAsPrev || isSameSenderAsNext;

        return {
            ...msg,
            showName,
            showAvatar,
            isGrouped,
        };
    });

    const elements = [];
    let lastDateKey = null;

    enrichedMessages.forEach((msg) => {
        const msgDate = new Date(msg.createdAt);
        const dateKey = msgDate.toDateString();

        // Разделитель по датам
        if (dateKey !== lastDateKey) {
            elements.push(
                <div key={`divider-${dateKey}`} className="date-divider">
                    {formatDate(msg.createdAt)}
                </div>
            );
            lastDateKey = dateKey;
        }

        // Добавляем само сообщение с дополнительными пропсами
        elements.push(
            <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.userId === currentUserId || msg.senderId === currentUserId}
                isSystem={msg.isSystem}
                imageUrls={imageUrls}
                onContextMenu={onContextMenu}
                showName={msg.showName}
                showAvatar={msg.showAvatar}
                isGrouped={msg.isGrouped}
            />
        );
    });

    return <div className="message-list">{elements}</div>;
};

export default MessageList;