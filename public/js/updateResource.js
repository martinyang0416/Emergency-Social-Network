// Update Resource Client
document.addEventListener("DOMContentLoaded", () => {
    let map;
    let tempMarker = null;
    const token = sessionStorage.getItem("token");

    if (!token) {
        alert("Session expired. Please log in again.");
        window.location.href = "/login";
        return;
    }

    const socket = io();
    const username = sessionStorage.getItem("username");
    socket.emit("user online", { username });

    const resourceId = sessionStorage.getItem("resourceId");
    if (!resourceId) {
        alert("Resource not found. Redirecting to Map View.");
        window.location.href = "/map";
        return;
    }

    initMap();

    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "/map";
    });

    document.getElementById("update-btn").addEventListener("click", () => {
        if (!tempMarker) {
            alert("Please click on the map to select a location.");
            return;
        }

        const coordinates = tempMarker.getPosition();

        fetch(`/maps/resources/${resourceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                latitude: coordinates.lat(),
                longitude: coordinates.lng(),
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                alert(data.message || "Resource location updated successfully!");
                window.location.href = "/map";
            })
            .catch((error) => console.error("Error updating resource:", error));
    });

    function initMap() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                createMap(userLocation);
            },
            () => {
                const defaultLocation = { lat: 37.41, lng: -122.06 }; // Default to CMU-SV
                createMap(defaultLocation);
            }
        );
    }

    function createMap(center) {
        map = new google.maps.Map(document.getElementById("map"), {
            center: center,
            zoom: 12,
        });

        map.addListener("click", (event) => {
            const location = event.latLng;

            if (tempMarker) {
                tempMarker.setPosition(location);
            } else {
                tempMarker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: "Selected Location",
                    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png", // Green dot from googleAPI
                });
            }
        });
    }
});
