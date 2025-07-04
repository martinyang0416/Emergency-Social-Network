// Add Resource Client
document.addEventListener("DOMContentLoaded", () => {
    let map;
    let tempMarker = null;
    initMap();
    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "/map";
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

            sessionStorage.setItem(
                "selectedCoordinates",
                JSON.stringify({
                    latitude: location.lat(),
                    longitude: location.lng(),
                })
            );
        });
    }

    document
        .getElementById("add-resource-form")
        .addEventListener("submit", (event) => {
            event.preventDefault();

            const title = document.getElementById("resource-title").value.trim();
            const description = document.getElementById("resource-description").value.trim();
            const coordinates = JSON.parse(sessionStorage.getItem("selectedCoordinates"));

            if (!coordinates) {
                alert("Please select a location on the map.");
                return;
            }

            fetch("/maps/resources", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                }),
            })
                .then((response) => response.json())
                .then(() => {
                    alert("Resource added successfully!");
                    window.location.href = "/map";
                })
                .catch((error) => console.error("Error adding resource:", error));
        });
});
