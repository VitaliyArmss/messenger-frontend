import * as signalR from '@microsoft/signalr';
import { HUB_URL } from './config';

let chatConnection = null;

export const startChatConnection = async (token) => {
    chatConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${HUB_URL}/chatHub`, {
            accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build();

    await chatConnection.start();
    return chatConnection;
};

export const stopchatConnection = () => {
    if (chatConnection) {
        chatConnection.stop().catch(console.error);
        chatConnection = null;
    }
};

export const getchatConnection = () => chatConnection;

let notificationConnection = null;

export const startNotificationConnection = async (token) => {
    if (notificationConnection && notificationConnection.state === signalR.HubConnectionState.Connected) {
        return notificationConnection;
    }
    notificationConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${HUB_URL}/notificationHub`, {
            accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build();

    await notificationConnection.start();
    return notificationConnection;
};

export const stopNotificationConnection = () => {
    if (notificationConnection) {
        notificationConnection.stop().catch(console.error);
        notificationConnection = null;
    }
};

export const getNotificationConnection = () => notificationConnection;