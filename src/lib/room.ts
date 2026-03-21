import {
    scanRoom,
    reconcileRoom,
    watchRoom,
    startPeriodicScan,
} from "@nest/storage";

interface RoomSetupOptions {
    room: string;
    ensure?: () => void;
}

export const setupRoom = ({ room, ensure }: RoomSetupOptions): void => {
    scanRoom(room);
    reconcileRoom(room);
    watchRoom(room);
    startPeriodicScan(room);
    ensure?.();
    console.log(`[Room] Setup complete: ${room}`);
};
