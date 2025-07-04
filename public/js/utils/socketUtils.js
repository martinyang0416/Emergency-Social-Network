let socket;
export function initializeSocket() {
    if (!socket) {
        socket = io({
            auth: {
                token: sessionStorage.getItem("token"),
            },
        });
    } else if (!socket.connected) {
        socket.connect();
    }
    return socket;
}

export function handleSpeedTestEvent(socket, logout) {
    socket.on("speed test started", (adminusername) => {
        if (adminusername !== sessionStorage.getItem("username")) {
            logout().then(() => {
                sessionStorage.removeItem("token");
                window.location.href = "/join_page";
            });
        }
    });
}

export function handleLogoutEvent(socket) {
    socket.on("logout", function (username) {
        if (username === sessionStorage.getItem("username")) {
            sessionStorage.removeItem("token");
            window.location.href = "/join_page";
        }
    });
}