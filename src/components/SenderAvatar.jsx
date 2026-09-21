import React from 'react';
import { useAvatar } from '../hooks/useAvatar';
import NullAvatar from './NullAvatar';

const SenderAvatar = React.memo(({ avatarUrl, name, size = 36 }) => {
    const blob = useAvatar(avatarUrl);
    return <NullAvatar picture={blob} name={name} size={size} />;
});

export default SenderAvatar;