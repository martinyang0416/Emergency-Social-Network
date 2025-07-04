export function logout() {
    const token = sessionStorage.getItem("token");
    const username = sessionStorage.getItem("username");
    const requestBody = { username: username };

    fetch(`/users/${username}/offline`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
    })
        .then((response) => {
            if (response.ok) {
                console.log("Logged out successfully");
                sessionStorage.removeItem("token");
                window.location.href = "/join_page";
            } else {
                console.error("Logout failed with status:", response.status);
            }
        })
        .catch((error) => {
            console.error("Error logging out:", error);
        });
}

export function verifyTokenAndRedirect(token) {
    if (token) {
        fetch("/verification", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.error("Token verification failed");
                    window.location.href = "/join_page";
                }
            })
            .then((userData) => {
                if (userData) {
                    console.log("Token verified successfully:", userData);
                }
            })
            .catch((error) => {
                console.error("Error verifying token:", error);
                window.location.href = "/join_page";
            });
    } else {
        console.error("No token found, redirecting to login");
        window.location.href = "/join_page";
    }
}
