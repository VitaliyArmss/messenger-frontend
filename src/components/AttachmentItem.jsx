// components/AttachmentItem.jsx
import { useState, useEffect } from 'react';
import { attachmentsApi } from '../api/attachments';

const AttachmentItem = ({ attachment, preloadedUrl }) => {
    const [imageUrl, setImageUrl] = useState(preloadedUrl || null);
    const [loading, setLoading] = useState(!preloadedUrl);
    const [error, setError] = useState(false);

    const isImage = attachment.contentType?.startsWith('image/');

    const handleDownload = async () => {
        try {
            const response = await attachmentsApi.download(attachment.id);
            const blob = response.data;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = attachment.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Ошибка скачивания:', err);
        }
    };

    const handleOpenImage = () => {
        if (!imageUrl) return;

        window.open(
            imageUrl,
            '_blank',
            'noopener,noreferrer'
        );
    };

    // Если preloadedUrl уже есть, не делаем дополнительный запрос
    useEffect(() => {
        if (preloadedUrl) {
            setLoading(false);
            return;
        }
        if (!isImage) {
            setLoading(false);
            return;
        }

        const loadImage = async () => {
            try {
                const response = await attachmentsApi.download(attachment.id);
                const blob = response.data;
                const url = URL.createObjectURL(blob);
                setImageUrl(url);
            } catch (err) {
                console.error('Ошибка загрузки изображения:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        loadImage();

        return () => {
            if (imageUrl && imageUrl !== preloadedUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [attachment.id, isImage, preloadedUrl, imageUrl]);

    if (loading) {
        return <div className="attachment-loading">⏳</div>;
    }

    if (error) {
        return (
            <div className="attachment-error" onClick={handleDownload}>
                <span>❌</span>
                <span className="file-name">{attachment.fileName}</span>
            </div>
        );
    }

    if (isImage && imageUrl) {
        return (
            <div
                className="attachment-image-wrapper"
                onClick={handleOpenImage}
                title="Нажмите, чтобы открыть изображение"
            >
                <img
                    src={imageUrl}
                    alt={attachment.fileName}
                    className="attachment-image"
                    loading="lazy"
                />
            </div>
        );
    }

    // Не изображение
    return (
        <div className="attachment-file" onClick={handleDownload}>
            <span className="file-icon">📄</span>
            <span className="file-name">{attachment.fileName}</span>
            {attachment.size && (
                <span className="file-size">
                    {(attachment.size / 1024).toFixed(1)} KB
                </span>
            )}
        </div>
    );
};

export default AttachmentItem;