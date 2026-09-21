import ChatListItem from './ChatListItem';
import '../css/index.css';

const ChatList = ({ chats, user, onChatSelect }) => {
    return (
        <>
            {chats.length === 0 ? (
                <p className="no-chats">Нет чатов. Создайте новый.</p>
            ) : (
                chats.map((chat) => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        user={user}
                        onChatSelect={onChatSelect}
                    />
                ))
            )}
        </>
    );
};

export default ChatList;