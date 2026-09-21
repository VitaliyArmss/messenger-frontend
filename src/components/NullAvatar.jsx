const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
    const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50'];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const NullAvatar = ({ name, picture, size = 100, onClick }) => {
    const initials = getInitials(name);
    const bgColor = getAvatarColor(name);

    return (picture ? (
        <img
            className="Avatar"
            src={picture}
            alt="Avatar"
            onClick={onClick}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                userSelect: 'none',
            }}
        />
    ) :
        (
            <div
                className={`NullAvatar ${name}`}
                onClick={onClick}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: size * 0.4,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    userSelect: 'none',
                }}
            >
                {initials}
            </div>
        )
    );
};

export default NullAvatar