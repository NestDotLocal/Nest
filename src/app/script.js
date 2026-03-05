const roomTemplate = document.querySelector("template.room").content;

async function loadRooms() {
    const res = await fetch("/api/rooms");
    const rooms = await res.json();
    rooms.forEach(room => {
        const roomElement = roomTemplate.cloneNode(true);

        document.getElementById("rooms").appendChild(roomElement);
    });
}

loadRooms();