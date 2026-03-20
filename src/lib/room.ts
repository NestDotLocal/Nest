import { scanRoom, reconcileRoom, watchRoom } from "./storage";

interface RoomSetupOptions {
    room: string;
    ensure?: () => void;
}

export const setupRoom = ({ room, ensure }: RoomSetupOptions): void => {
    scanRoom(room);
    reconcileRoom(room);
    watchRoom(room);
    ensure?.();
    console.log(`[Room] Setup complete: ${room}`);
};
