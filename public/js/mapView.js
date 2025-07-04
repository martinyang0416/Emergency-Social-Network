import { verifyTokenAndRedirect } from "./utils/authUtils.js";
import { initializeSocket } from "./utils/socketUtils.js";

// mapView Client
document.addEventListener("DOMContentLoaded", () => {
    let map;
    const token = sessionStorage.getItem("token");
    verifyTokenAndRedirect(token);

    const socket = initializeSocket();
    const username = sessionStorage.getItem("username");
    socket.emit("user online", { username });

    const loadingSpinner = document.getElementById("loading-spinner");
    const mapContainer = document.getElementById("map-container");

    initMap();
    document.getElementById("add-resource-btn").addEventListener("click", () => {
        window.location.href = "/addResource";
    });

    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "/home";
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

        google.maps.event.addListenerOnce(map, "tilesloaded", () => {
            console.log("Map tiles loaded");
            loadingSpinner.style.display = "none";
            mapContainer.style.display = "block";
        });

        setTimeout(() => {
            if (loadingSpinner.style.display !== "none") {
                console.warn("Fallback: Hiding spinner after timeout");
                loadingSpinner.style.display = "none";
                mapContainer.style.display = "block";
            }
        }, 5000);

        fetchResources();
    }

    function fetchResources() {
        fetch("/maps/resources")
            .then((response) => response.json())
            .then((response) => {
                const resources = response.data;
                if (!Array.isArray(resources) || resources.length === 0) {
                    console.log("No resources found or invalid response format.");
                    return;
                }

                resources.forEach((resource) => {
                    addMarker(resource);
                });
            })
            .catch((error) => console.error("Error fetching resources:", error));
    }

    function addMarker(resource) {
        if (!resource.latitude || !resource.longitude) {
            console.error("Invalid resource coordinates:", resource);
            return;
        }

        const marker = new google.maps.Marker({
            position: {
                lat: parseFloat(resource.latitude),
                lng: parseFloat(resource.longitude),
            },
            map: map,
            title: resource.title,
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="text-align: left; style="margin: 0; padding: 0;">
                    <h3 style="font-size: 1.5rem; color: #333; margin-bottom: 5px;">${resource.title}</h3>
                    <p style="font-size: 0.7rem; color: #555; margin-bottom: 10px;">${resource.description}</p>
                    <button id="view-reviews-btn-${resource.id}" style="margin: 2px; padding: 6px; background-color: #00cec9; color: white; border: none; border-radius: 5px; font-size: 0.8rem; cursor: pointer;">
                        View Reviews
                    </button>
                    <button id="update-location-btn-${resource.id}" style="margin: 2px; padding: 6px; background-color: #00cec9; color: white; border: none; border-radius: 5px; font-size: 0.8rem; cursor: pointer;">
                        Update Location
                    </button>
                </div>
            `,
        });
        marker.addListener("click", () => {
            infoWindow.open(map, marker);

            setTimeout(() => {
                document
                    .getElementById(`view-reviews-btn-${resource.id}`)
                    .addEventListener("click", () => {
                        sessionStorage.setItem("resourceId", resource.id);
                        window.location.href = "/resourceReviews";
                    });

                document
                    .getElementById(`update-location-btn-${resource.id}`)
                    .addEventListener("click", () => {
                        sessionStorage.setItem("resourceId", resource.id);
                        window.location.href = "/updateResource";
                    });
            }, 100);
        });
    }
});
